import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [ime, setIme] = useState('');
  const [prezime, setPrezime] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await axios.post('http://localhost:5000/api/register', {
        FirstName: ime,      
        LastName: prezime,   
        Email: email,
        Password: password
      });

      alert('Uspješna registracija! Idite na prijavu.');
      navigate('/login'); 
      
    } catch (error) {
      alert(error.response?.data?.poruka || error.response?.data?.greska || 'Došlo je do greške pri registraciji.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Registruj se</h2>
        
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Ime</label>
            <input 
              type="text" 
              placeholder="Ime"
              value={ime} 
              onChange={(e) => setIme(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label>Prezime</label>
            <input 
              type="text" 
              placeholder="Prezime"
              value={prezime} 
              onChange={(e) => setPrezime(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Email adresa</label>
            <input 
              type="email" 
              placeholder="Email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Lozinka</label>
            <input 
              type="password" 
              placeholder="Lozinka"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button type="submit" className="auth-btn">Registruj se</button>
        </form>

        {}
        <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#315946' }}>
          Već imate nalog?{' '}
          <Link to="/login" style={{ color: '#01241a', textDecoration: 'none', fontWeight: '500' }}>
            Prijavi se
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;