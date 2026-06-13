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

// Dozvola za čitanje slika iz foldera
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
        // Provjeravamo da li korisnik sa tim email-om postoji već 
        db.query('SELECT * FROM Users WHERE Email = ?', [Email], async (err, results) => {
            if (err) return res.status(500).json({ greska: 'Greška na serveru' });
            if (results.length > 0) return res.status(400).json({ poruka: 'Korisnik sa ovim email-om već postoji u bazi!' });

            // Ovo je za heširanje lozinke
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(Password, salt);

            // Ovdje unosimo u bazu
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

    // Ovdje provjeravamo da li korisnik postoji u bazi
    db.query('SELECT * FROM Users WHERE Email = ?', [Email], async (err, results) => {
        if (err) return res.status(500).json({ greska: 'Greška na serveru.' });
        if (results.length === 0) return res.status(400).json({ poruka: 'Pogrešan email ili lozinka!' });

        const user = results[0];

        // Da li se unijeta lozinka poklapa sa onom koja je u bazi
        const validPassword = await bcrypt.compare(Password, user.Password);
        if (!validPassword) return res.status(400).json({ poruka: 'Pogrešan email ili lozinka!' });

        // Kreiranje JWT tokena za čuvanje id korinsika i njegove uloge 
        const token = jwt.sign(
            { id: user.Id, roleId: user.RoleId }, 
            process.env.JWT_SECRET, 
            { expiresIn: '2h' } // ovo je za trajanje tokena 2h
        );

        // Ovdje šaljemo React-u token i podatke o korisniku
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
    // pomoću verifyToken i isAdmin se osiguravamo da je pravi token i da nam je admin taj koji dodaje vendora
    
    const { CategoryID, Name, Contact, BasePrice, ImagePath } = req.body;

    const insertQuery = 'INSERT INTO Vendors (CategoryID, Name, Contact, BasePrice, ImagePath) VALUES (?, ?, ?, ?, ?)';
    
    db.query(insertQuery, [CategoryID, Name, Contact, BasePrice, ImagePath], (err, result) => {
        if (err) return res.status(500).json({ greska: 'Greška pri dodavanju vendora.' });
        res.status(201).json({ poruka: 'Vendor je uspješno dodat!' });
    });
});
// Za pretragu vendora, što mogu svi korisnici
app.get('/api/vendors', verifyToken, (req, res) => {
    // Tu je onda samo verifyToken jer može i korisnik i admin da pretražuje
    
    // Čitanje query parametara iz URL-a 
    const { search, category } = req.query; 

    let sqlQuery = 'SELECT * FROM Vendors WHERE 1=1';
    let queryParams = [];

    // Za brzu pretragu po imenu
    if (search) {
        sqlQuery += ' AND Name LIKE ?';
        queryParams.push(`%${search}%`); // % za pretragu dijela riječi 
    }

    // Za detaljnu pretragu po određenoj kategoriji
    if (category) {
        sqlQuery += ' AND CategoryID = ?';
        queryParams.push(category);
    }

    db.query(sqlQuery, queryParams, (err, results) => {
        if (err) return res.status(500).json({ greska: 'Greška pri pretrazi vendora.' });
        res.json(results);
    });
});

// Uploudovanje slike Vendora, što može samo admin
app.post('/api/upload', verifyToken, isAdmin, upload.single('slika'), (req, res) => {
    // upload.single('slika') presreta fajl da bi ga čuvao u 'uploads' folderu
    
    if (!req.file) {
        return res.status(400).json({ greska: 'Niste odabrali fajl za upload!' });
    }

    // Ovdje vraćamo React-u ime fajla kako bi ga kasnije ubacio u bazu
    res.status(200).json({ 
        poruka: 'Slika je uspješno sačuvana!',
        ImagePath: req.file.filename 
    });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server je pokrenut na http://localhost:${PORT}`);
});

