const jwt = require('jsonwebtoken');

// Provjera da li korisnik uopšte ima token (da li je ulogovan)
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ poruka: 'Pristup odbijen. Niste ulogovani!' });
    }

    const token = authHeader.split(' ')[1]; // Uzimamo samo token, bez riječi "Bearer"

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Čuvamo podatke iz tokena (id i roleId) u req.user
        next(); // Puštamo korisnika dalje
    } catch (error) {
        res.status(403).json({ poruka: 'Nevalidan ili istekao token.' });
    }
};

// Provjera da li je ulogovani korisnik admin
const isAdmin = (req, res, next) => {
    if (req.user.roleId !== 1) {
        return res.status(403).json({ poruka: 'Pristup odbijen. Akcija dozvoljena samo administratorima.' });
    }
    next(); 
};

module.exports = { verifyToken, isAdmin };