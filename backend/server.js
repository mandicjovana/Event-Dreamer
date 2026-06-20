const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyToken, isAdmin } = require('./middleware/auth');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

//za citanje slike iz foldera
app.use('/uploads', express.static('uploads'));

// Podešavanje multera za upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // gdje ćemo da čuvamo slike
    },
    filename: (req, file, cb) => {
        // Dodavanje trenutnog vremena ispred fajla
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

const upload = multer({ storage: storage });

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Greška pri povezivanju sa bazom:', err);
        return;
    }
    console.log('Uspješno povezano sa MySQL bazom!');
});

app.get('/', (req, res) => {
    res.send('EventDreamer API radi!');
});

// Za registraciju korisnika
app.post('/api/register', async (req, res) => {
    const { FirstName, LastName, Email, Password, RoleId } = req.body;

    try {
        db.query('SELECT * FROM Users WHERE Email = ?', [Email], async (err, results) => {
            if (err) return res.status(500).json({ greska: 'Greška na serveru' });
            if (results.length > 0) return res.status(400).json({ poruka: 'Korisnik sa ovim email-om već postoji u bazi!' });

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(Password, salt);

            const userRole = RoleId || 2; 
            const insertQuery = 'INSERT INTO Users (FirstName, LastName, Email, Password, RoleId) VALUES (?, ?, ?, ?, ?)';
            
            db.query(insertQuery, [FirstName, LastName, Email, hashedPassword, userRole], (err, result) => {
                if (err) return res.status(500).json({ greska: 'Greška pri registraciji.' });
                res.status(201).json({ poruka: 'Uspješno ste registrovani!' });
            });
        });
    } catch (error) {
        res.status(500).json({ greska: 'Greška na serveru.' });
    }
});

// Za prijavu korisnika
app.post('/api/login', (req, res) => {
    const { Email, Password } = req.body;

    db.query('SELECT * FROM Users WHERE Email = ?', [Email], async (err, results) => {
        if (err) return res.status(500).json({ greska: 'Greška na serveru.' });
        if (results.length === 0) return res.status(400).json({ poruka: 'Pogrešan email ili lozinka!' });

        const user = results[0];

        let validPassword = false;
        if (user.Password.startsWith('$2b$')) {
            validPassword = await bcrypt.compare(Password, user.Password);
        } else {
            validPassword = (Password === user.Password);
        }

        if (!validPassword) return res.status(400).json({ poruka: 'Pogrešan email ili lozinka!' });

        const token = jwt.sign(
            { id: user.Id, roleId: user.RoleId }, 
            process.env.JWT_SECRET, 
            { expiresIn: '2h' } 
        );

        res.json({
            poruka: 'Uspješan login!',
            token: token,
            user: {
                id: user.Id,
                ime: user.FirstName,
                prezime: user.LastName,
                email: user.Email,
                roleId: user.RoleId
            }
        });
    });
});

// Za dodavanje vendora što može samo admin
app.post('/api/vendors', verifyToken, isAdmin, (req, res) => {
    const { CategoryID, Name, Contact, BasePrice, ImagePath } = req.body;
    const insertQuery = 'INSERT INTO Vendors (CategoryID, Name, Contact, BasePrice, ImagePath) VALUES (?, ?, ?, ?, ?)';
    db.query(insertQuery, [CategoryID, Name, Contact, BasePrice, ImagePath], (err, result) => {
        if (err) return res.status(500).json({ greska: 'Greška pri dodavanju vendora.' });
        res.status(201).json({ poruka: 'Vendor je uspješno dodat!' });
    });
});

// Za pretragu vendora, što mogu svi korisnici
app.get('/api/vendors', verifyToken, (req, res) => {
    const { search, category } = req.query; 

    let sqlQuery = 'SELECT * FROM Vendors WHERE 1=1';
    let queryParams = [];

    if (search) {
        sqlQuery += ' AND Name LIKE ?';
        queryParams.push(`%${search}%`); 
    }

    if (category) {
        sqlQuery += ' AND CategoryID = ?';
        queryParams.push(category);
    }

    db.query(sqlQuery, queryParams, (err, results) => {
        if (err) return res.status(500).json({ greska: 'Greška pri pretrazi vendora.' });
        res.json(results);
    });
});

// Uploudovanje slike vendora, što može samo admin
app.post('/api/upload', verifyToken, isAdmin, upload.single('slika'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ greska: 'Niste odabrali fajl za upload!' });
    }
    res.status(200).json({ 
        poruka: 'Slika je uspješno sačuvana!',
        ImagePath: req.file.filename 
    });
});

// Za sve dogadjaje i detalje vezane za ulogovanog korisnika
app.get('/api/my-events', verifyToken, async (req, res) => {
    const userId = req.user.id; 

    try {
        const [events] = await db.promise().query('SELECT * FROM Events WHERE UserID = ?', [userId]);

        if (events.length === 0) {
            return res.status(200).json([]); 
        }

        const dogadjajiSaDetaljima = await Promise.all(events.map(async (event) => {
            const eventId = event.Id;
            const [tasks] = await db.promise().query('SELECT * FROM Tasks WHERE EventID = ?', [eventId]);
            const [guests] = await db.promise().query('SELECT * FROM Guests WHERE EventId = ?', [eventId]);
            const [expenses] = await db.promise().query(`
                SELECT Expenses.*, Vendors.Name AS VendorName 
                FROM Expenses 
                LEFT JOIN Vendors ON Expenses.VendorId = Vendors.Id 
                WHERE Expenses.EventID = ?
            `, [eventId]);

            return {
                ...event,
                tasks: tasks,
                guests: guests,
                expenses: expenses
            };
        }));

        res.json(dogadjajiSaDetaljima);
    } catch (error) {
        console.error('Greška pri dohvatanju profila:', error);
        res.status(500).json({ greska: 'Greška na serveru pri učitavanju vaših događaja.' });
    }
});

// ruta za kreiranje dogadjaja
app.post('/api/events', verifyToken, async (req, res) => {
    const { eventTypeId, title, date, location, totalBudget } = req.body;
    const userId = req.user.id; // ovo je id od trenutno ulogovanog korisnika

    if (!eventTypeId || !title || !date || !location || !totalBudget) {
        return res.status(400).json({ poruka: 'Sva polja moraju biti popunjena!' });
    }

    try {
        const query = `
            INSERT INTO Events (UserID, EventTypesId, Title, Date, Location, TotalBudget) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.promise().query(query, [userId, eventTypeId, title, date, location, totalBudget]);
        
        res.status(201).json({ poruka: 'Događaj je uspješno kreiran!' });
    } catch (error) {
        console.error('Greška pri kreiranju događaja:', error);
        res.status(500).json({ greska: 'Greška na serveru pri kreiranju događaja.' });
    }
});

// pretvaranje datuma u tekst prije provjere
app.post('/api/book-vendor', verifyToken, async (req, res) => {
    const { eventId, vendorId, expenseName, amount } = req.body;

    if (!eventId || !vendorId || !expenseName || !amount) {
        return res.status(400).json({ poruka: 'Sva polja su obavezna za zakazivanje.' });
    }

    try {
        const [eventRes] = await db.promise().query(
            'SELECT DATE_FORMAT(Date, "%Y-%m-%d") as CleanDate FROM Events WHERE Id = ?', 
            [eventId]
        );
        
        if (eventRes.length === 0) {
            return res.status(404).json({ poruka: 'Događaj nije pronađen.' });
        }
        
        const eventDateString = eventRes[0].CleanDate;

        const checkQuery = `
            SELECT Events.Title 
            FROM Expenses 
            JOIN Events ON Expenses.EventID = Events.Id 
            WHERE Expenses.VendorId = ? 
              AND DATE_FORMAT(Events.Date, "%Y-%m-%d") = ?
        `;
        
        const [existingBookings] = await db.promise().query(checkQuery, [vendorId, eventDateString]);

        if (existingBookings.length > 0) {
            return res.status(409).json({ 
                poruka: `❌ Žao nam je, ovaj vendor je već rezervisan za taj datum (Događaj: ${existingBookings[0].Title}).` 
            });
        }

        const insertQuery = `
            INSERT INTO Expenses (EventID, VendorId, ExpenseName, PlannedAmount, ActualAmount, IsPaid)
            VALUES (?, ?, ?, ?, ?, 0)
        `;
        await db.promise().query(insertQuery, [eventId, vendorId, expenseName, amount, amount]);
        
        res.status(201).json({ poruka: '🎉 Uspješno ste rezervisali vendora za vaš događaj!' });
    } catch (error) {
        console.error('Greška pri zakazivanju vendora:', error);
        res.status(500).json({ greska: 'Greška na serveru pri zakazivanju.' });
    }
});

// ruta za tipove dogadjaja za opadajuci meni
app.get('/api/event-types', async (req, res) => {
    try {
        const [types] = await db.promise().query('SELECT * FROM EventTypes');
        res.json(types);
    } catch (error) {
        res.status(500).json({ greska: 'Greška pri učitavanju tipova događaja.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server je pokrenut na http://localhost:${PORT}`);
});