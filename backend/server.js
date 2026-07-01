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

// Za prijavu korisnika (ISPRAVLJENO)
app.post('/api/login', (req, res) => {
    const { Email, Password } = req.body;

    db.query('SELECT * FROM Users WHERE Email = ?', [Email], async (err, results) => {
        if (err) return res.status(500).json({ greska: 'Greška na serveru.' });
        if (results.length === 0) return res.status(400).json({ poruka: 'Pogrešan email ili lozinka!' });

        try {
            const user = results[0];
            let validPassword = false;

            if (user.Password.startsWith('$2b$')) {
                validPassword = await bcrypt.compare(Password, user.Password);
            } else {
                validPassword = (Password === user.Password);
            }

            if (!validPassword) return res.status(400).json({ poruka: 'Pogrešan email ili lozinka!' });

            // Hvatamo rolu
            const userRole = user.RoleId || user.RoleID || 2;

            const token = jwt.sign(
                { id: user.Id || user.ID, roleId: userRole, RoleId: userRole }, 
                process.env.JWT_SECRET, 
                { expiresIn: '2h' } 
            );

            res.json({
                poruka: 'Uspješan login!',
                token: token,
                user: {
                    id: user.Id || user.ID,
                    ime: user.FirstName,
                    prezime: user.LastName,
                    email: user.Email,
                    roleId: userRole // Malo 'r' za React!
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ poruka: 'Greška pri obradi prijave.' });
        }
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

// =========================================================================
// 1. RUTA ZA KREIRANJE DOGAĐAJA (LOKACIJA VIŠE NIJE OBAVEZNA)
// =========================================================================
app.post('/api/events', verifyToken, async (req, res) => {
    // Uklonili smo 'location' iz body-ja i provjere
    const { eventTypeId, title, date, totalBudget } = req.body;
    const userId = req.user.id; 

    if (!eventTypeId || !title || !date || !totalBudget) {
        return res.status(400).json({ poruka: 'Naslov, datum, tip i budžet su obavezni!' });
    }

    try {
        // Sistem automatski stavlja 'Na čekanju' za lokaciju
        const query = `
            INSERT INTO Events (UserID, EventTypesId, Title, Date, Location, TotalBudget) 
            VALUES (?, ?, ?, ?, 'Lokacija na čekanju', ?)
        `;
        await db.promise().query(query, [userId, eventTypeId, title, date, totalBudget]);
        
        res.status(201).json({ poruka: 'Događaj je uspješno kreiran!' });
    } catch (error) {
        console.error('Greška pri kreiranju događaja:', error);
        res.status(500).json({ greska: 'Greška na serveru pri kreiranju događaja.' });
    }
});

// ruta za zakazivanje vendora sa ZAŠTITOM BUDŽETA, LOKACIJOM I POMJERANJEM DATUMA
app.post('/api/book-vendor', verifyToken, async (req, res) => {
    const { eventId, vendorId, expenseName, amount, categoryId, newDate } = req.body;

    if (!eventId || !vendorId || !expenseName || !amount) {
        return res.status(400).json({ poruka: 'Sva polja su obavezna za zakazivanje.' });
    }

    try {
        // =========================================================================
        // 1. PROVJERA BUDŽETA! Da li korisnik ima dovoljno novca za ovo?
        // =========================================================================
        const [eventData] = await db.promise().query('SELECT TotalBudget FROM Events WHERE Id = ?', [eventId]);
        if (eventData.length === 0) return res.status(404).json({ poruka: 'Događaj nije pronađen.' });
        const totalBudget = Number(eventData[0].TotalBudget);

        const [expensesData] = await db.promise().query('SELECT SUM(ActualAmount) as TotalSpent FROM Expenses WHERE EventID = ?', [eventId]);
        const totalSpent = Number(expensesData[0].TotalSpent || 0);

        if (totalSpent + Number(amount) > totalBudget) {
            const preostalo = totalBudget - totalSpent;
            return res.status(400).json({ 
                poruka: `❌ Nemate dovoljno budžeta za ovu rezervaciju! Preostalo Vam je još ${preostalo} €, a iznos ove usluge je ${amount} €.` 
            });
        }

        // =========================================================================
        // 2. Provjera za Salu (Da ne bi bilo dvije sale za isti događaj)
        // =========================================================================
        if (Number(categoryId) === 1) {
            const venueCheckQuery = `
                SELECT Expenses.Id 
                FROM Expenses 
                JOIN Vendors ON Expenses.VendorId = Vendors.Id 
                WHERE Expenses.EventID = ? AND Vendors.CategoryID = 1
            `;
            const [existingVenue] = await db.promise().query(venueCheckQuery, [eventId]);
            
            if (existingVenue.length > 0) {
                return res.status(400).json({ 
                    poruka: '❌ Ovaj događaj već ima rezervisanu salu/restoran! Nije moguće dodati više od jedne sale.' 
                });
            }
        }

        // =========================================================================
        // 3. POMJERANJE DATUMA DOGAĐAJA (Ako je kliknuo na kalendar)
        // =========================================================================
        if (newDate) {
            await db.promise().query('UPDATE Events SET Date = ? WHERE Id = ?', [newDate, eventId]);
        }

        // =========================================================================
        // 4. Provjera da li je OVAJ VENDOR već zauzet tog datuma
        // =========================================================================
        const [eventRes] = await db.promise().query(
            'SELECT DATE_FORMAT(Date, "%Y-%m-%d") as CleanDate FROM Events WHERE Id = ?', 
            [eventId]
        );
        
        const eventDateString = eventRes[0].CleanDate;

        const checkQuery = `
            SELECT Events.Title 
            FROM Expenses 
            JOIN Events ON Expenses.EventID = Events.Id 
            WHERE Expenses.VendorId = ? AND DATE_FORMAT(Events.Date, "%Y-%m-%d") = ?
        `;
        const [existingBookings] = await db.promise().query(checkQuery, [vendorId, eventDateString]);

        if (existingBookings.length > 0) {
            return res.status(409).json({ 
                poruka: `❌ Žao nam je, ovaj vendor je već rezervisan za taj datum.` 
            });
        }

        // =========================================================================
        // 5. UPISUJEMO REZERVACIJU U BAZU I AŽURIRAMO LOKACIJU
        // =========================================================================
        const insertQuery = `
            INSERT INTO Expenses (EventID, VendorId, ExpenseName, PlannedAmount, ActualAmount, IsPaid)
            VALUES (?, ?, ?, ?, ?, 0)
        `;
        await db.promise().query(insertQuery, [eventId, vendorId, expenseName, amount, amount]);
        
        if (Number(categoryId) === 1) {
            const [vendorData] = await db.promise().query('SELECT Name FROM Vendors WHERE Id = ?', [vendorId]);
            if (vendorData.length > 0) {
                const nazivSale = vendorData[0].Name;
                await db.promise().query('UPDATE Events SET Location = ? WHERE Id = ?', [nazivSale, eventId]);
            }
        }
        
        res.status(201).json({ poruka: '🎉 Uspješno ste rezervisali vendora!' });
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

// ruta za to do listu
app.put('/api/tasks/:id/toggle', verifyToken, async (req, res) => {
    const taskId = req.params.id;
    const { isCompleted } = req.body; 

    try {
        const statusZaBazu = isCompleted ? 1 : 0;
        await db.promise().query('UPDATE Tasks SET IsCompleted = ? WHERE Id = ?', [statusZaBazu, taskId]);
        res.json({ poruka: 'Zadatak uspješno ažuriran!' });
    } catch (error) {
        res.status(500).json({ greska: 'Greška na serveru pri ažuriranju zadatka.' });
    }
});

// ruta za provjeru za goste
app.put('/api/guests/:id/rsvp', verifyToken, async (req, res) => {
    const guestId = req.params.id;
    const { rsvpStatus } = req.body; 

    try {
        await db.promise().query('UPDATE Guests SET RSVPStatus = ? WHERE Id = ?', [rsvpStatus, guestId]);
        res.json({ poruka: 'Status gosta uspješno ažuriran!' });
    } catch (error) {
        res.status(500).json({ greska: 'Greška na serveru pri ažuriranju statusa.' });
    }
});

// ruta za dodavanje novog zadatka u odredjeni dogadjaj
app.post('/api/tasks', verifyToken, async (req, res) => {
    const { eventId, taskName } = req.body;

    if (!eventId || !taskName) {
        return res.status(400).json({ poruka: 'Sva polja su obavezna.' });
    }

    try {
        await db.promise().query('INSERT INTO Tasks (EventID, TaskName, IsCompleted) VALUES (?, ?, 0)', [eventId, taskName]);
        res.status(201).json({ poruka: 'Zadatak uspješno dodat!' });
    } catch (error) {
        res.status(500).json({ greska: 'Greška na serveru pri dodavanju zadatka.' });
    }
});

// ruta za dodavanje novog gosta u odredjeni dogadjaj
app.post('/api/guests', verifyToken, async (req, res) => {
    const { eventId, firstName, lastName } = req.body;

    if (!eventId || !firstName || !lastName) {
        return res.status(400).json({ poruka: 'Sva polja su obavezna.' });
    }

    try {
        await db.promise().query('INSERT INTO Guests (EventId, FirstName, LastName, RSVPStatus) VALUES (?, ?, ?, "Na čekanju")', [eventId, firstName, lastName]);
        res.status(201).json({ poruka: 'Gost uspješno dodat!' });
    } catch (error) {
        res.status(500).json({ greska: 'Greška na serveru pri dodavanju gosta.' });
    }
});

// ruta za placanje troska
app.put('/api/expenses/:id/paid', verifyToken, async (req, res) => {
    const expenseId = req.params.id;
    const { isPaid } = req.body; 

    try {
        const statusZaBazu = isPaid ? 1 : 0;
        await db.promise().query('UPDATE Expenses SET IsPaid = ? WHERE Id = ?', [statusZaBazu, expenseId]);
        res.json({ poruka: 'Status plaćanja uspješno ažuriran!' });
    } catch (error) {
        res.status(500).json({ greska: 'Greška na serveru pri ažuriranju plaćanja.' });
    }
});

// ruta za statistiku u admin panelu
app.get('/api/admin/stats', verifyToken, async (req, res) => {
    if (!req.user || req.user.roleId !== 1) {
        return res.status(403).json({ poruka: 'Pristup odbijen. Niste administrator.' });
    }

    try {
        const [users] = await db.promise().query('SELECT COUNT(*) as ukupno FROM Users WHERE RoleId = 2 OR RoleID = 2');
        const [events] = await db.promise().query('SELECT COUNT(*) as ukupno FROM Events');
        const [vendors] = await db.promise().query('SELECT COUNT(*) as ukupno FROM Vendors');

        res.json({
            ukupnoKorisnika: users[0].ukupno || 0,
            ukupnoDogadjaja: events[0].ukupno || 0,
            ukupnoVendora: vendors[0].ukupno || 0
        });
    } catch (error) {
        console.error('Greška pri dobavljanju statistike za admina:', error);
        res.status(500).json({ greska: 'Greška na serveru pri dobavljanju statistike za admina.' });
    }
});
// ruta za sve korisnike za admin panel
app.get('/api/admin/users', verifyToken, async (req, res) => {
    if (!req.user || req.user.roleId !== 1) {
        return res.status(403).json({ poruka: 'Pristup odbijen. Niste administrator.' });
    }

    try {
        // korisnici bez lozinki zbog sigurnosti
        const [users] = await db.promise().query('SELECT Id, FirstName, LastName, Email, RoleId FROM Users ORDER BY Id DESC');
        res.json(users);
    } catch (error) {
        console.error('Greška pri dobavljanju korisnika:', error);
        res.status(500).json({ greska: 'Greška na serveru pri dobavljanju korisnika.' });
    }
});
// ruta za sve dogadjaje i korisnike za dogadjaje za admin panel
app.get('/api/admin/events', verifyToken, async (req, res) => {
    if (!req.user || req.user.roleId !== 1) {
        return res.status(403).json({ poruka: 'Pristup odbijen. Niste administrator.' });
    }

    try {
        // JOIN jer spajamo Events i Users jer nam treba korisnik koji je kreirao dogadjaj
        const query = `
            SELECT Events.Id, Events.Title, Events.Date, Events.Location, Events.TotalBudget,
                   Users.FirstName, Users.LastName, Users.Email
            FROM Events
            JOIN Users ON Events.UserID = Users.Id
            ORDER BY Events.Date DESC
        `;
        const [events] = await db.promise().query(query);
        res.json(events);
    } catch (error) {
        console.error('Greška pri dobavljanju svih događaja za admina:', error);
        res.status(500).json({ greska: 'Greška na serveru pri dobavljanju događaja.' });
    }
});
//ruta za mijenjanje broja gostiju i izracunavanje cijene
app.put('/api/expenses/:id/update-guests', verifyToken, async (req, res) => {
    const expenseId = req.params.id;
    const { eventId, newAmount, newExpenseName } = req.body;

    if (!eventId || !newAmount || !newExpenseName) {
        return res.status(400).json({ poruka: 'Nedostaju podaci za ažuriranje.' });
    }

    try {
        // provjera za budzet dogadjaja
        const [eventData] = await db.promise().query('SELECT TotalBudget FROM Events WHERE Id = ?', [eventId]);
        if (eventData.length === 0) return res.status(404).json({ poruka: 'Događaj nije pronađen.' });
        const totalBudget = Number(eventData[0].TotalBudget);

        // za sve troskove
        const [expensesData] = await db.promise().query(
            'SELECT SUM(ActualAmount) as TotalSpentOther FROM Expenses WHERE EventID = ? AND Id != ?', 
            [eventId, expenseId]
        );
        const totalSpentOther = Number(expensesData[0].TotalSpentOther || 0);

        // za provjeru probijanja budzeta
        if (totalSpentOther + Number(newAmount) > totalBudget) {
            const preostalo = totalBudget - totalSpentOther;
            return res.status(400).json({
                poruka: `❌ Nemate dovoljno budžeta za ovaj novi broj gostiju! Preostali budžet za ostale usluge je ${preostalo} €, a nova cijena sale iznosi ${newAmount} €.`
            });
        }

        // ako je sve okej dodajemo u tabelu Expenses
        await db.promise().query(
            'UPDATE Expenses SET ActualAmount = ?, PlannedAmount = ?, ExpenseName = ? WHERE Id = ?',
            [newAmount, newAmount, newExpenseName, expenseId]
        );

        res.status(200).json({ poruka: 'Broj gostiju i cijena uspješno ažurirani!' });
    } catch (error) {
        console.error('Greška pri ažuriranju gostiju:', error);
        res.status(500).json({ poruka: 'Greška na serveru.' });
    }
});
// ruta za brisanje vendora iz baze podataka
app.delete('/api/admin/vendors/:id', verifyToken, (req, res) => {
    // ručna provera role 
    const userRole = req.user.roleId || req.user.RoleId;
    if (Number(userRole) !== 1) {
        return res.status(403).json({ poruka: 'Pristup odbijen. Niste administrator.' });
    }

    const { id } = req.params;

    db.query('DELETE FROM Vendors WHERE Id = ? OR ID = ?', [id, id], (err, result) => {
        if (err) {
            console.error('Greška pri brisanju vendora:', err);
            return res.status(500).json({ greska: 'Greška pri brisanju vendora iz baze podataka.' });
        }
        res.status(200).json({ poruka: 'Vendor je uspješno obrisan!' });
    });
});

// ruta za izmjenu podataka o vendoru
app.put('/api/admin/vendors/:id', verifyToken, (req, res) => {
    const userRole = req.user.roleId || req.user.RoleId;
    if (Number(userRole) !== 1) {
        return res.status(403).json({ poruka: 'Pristup odbijen. Niste administrator.' });
    }

    const { id } = req.params;
    const { CategoryID, Name, Contact, BasePrice, ImagePath } = req.body;

    // ako admin nije odabrao novu sliku, ostaje stara
    let sqlQuery = 'UPDATE Vendors SET CategoryID = ?, Name = ?, Contact = ?, BasePrice = ?';
    let queryParams = [CategoryID, Name, Contact, BasePrice];

    if (ImagePath) {
        sqlQuery += ', ImagePath = ?';
        queryParams.push(ImagePath);
    }

    sqlQuery += ' WHERE Id = ? OR ID = ?';
    queryParams.push(id, id);

    db.query(sqlQuery, queryParams, (err, result) => {
        if (err) {
            console.error('Greška pri izmjeni vendora:', err);
            return res.status(500).json({ greska: 'Greška pri ažuriranju podataka o vendoru.' });
        }
        res.status(200).json({ poruka: 'Podaci o vendoru su uspješno ažurirani!' });
    });
});
// ruta koja vraća sve zauzete datume za odredjenog vendora
app.get('/api/vendors/:id/busy-dates', verifyToken, async (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT DISTINCT DATE_FORMAT(Events.Date, "%Y-%m-%d") as BusyDate 
        FROM Expenses 
        JOIN Events ON Expenses.EventID = Events.Id 
        WHERE Expenses.VendorId = ?
    `;

    try {
        const [results] = await db.promise().query(query, [id]);
        const busyDates = results.map(row => row.BusyDate);
        res.json(busyDates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ greska: 'Greška pri dohvatanju zauzetih termina.' });
    }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server je pokrenut na http://localhost:${PORT}`);
});