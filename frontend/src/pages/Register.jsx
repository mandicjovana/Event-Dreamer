import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await axios.post('http://localhost:5000/api/register', {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Password: password
      });

      alert('Uspješna registracija! Sada se možete prijaviti.');
      navigate('/login');
    } catch (error) {
      alert(error.response?.data?.poruka || 'Došlo je do greške pri registraciji.');
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
              placeholder="Unesite ime"
              value={firstName} 
              onChange={(e) => setFirstName(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label>Prezime</label>
            <input 
              type="text" 
              placeholder="Unesite prezime"
              value={lastName} 
              onChange={(e) => setLastName(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              placeholder="Unesite email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-group" style={{ position: 'relative' }}>
            <label>Lozinka</label>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Unesite lozinku"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
            />
            {/*za SVG ikonicu*/}
            <span 
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '48px',
                cursor: 'pointer',
                color: '#666', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </span>
          </div>
          <button type="submit" className="auth-btn">Registruj se</button>
        </form>
        
        <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#111' }}>
          Već imate nalog? <Link to="/login" style={{ color: '#111', fontWeight: '600', textDecoration: 'underline' }}>Prijavite se</Link>
        </p>

      </div>
    </div>
  );
}

export default Register;