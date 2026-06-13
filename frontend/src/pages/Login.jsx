import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        Email: email,
        Password: password
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('roleId', response.data.user.roleId);

      if (response.data.user.roleId === 1) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }

    } catch (error) {
      alert(error.response?.data?.poruka || 'Došlo je do greške pri prijavljivanju.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Prijavi se</h2>
        
        <form onSubmit={handleLogin}>
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
          
          <div className="input-group">
            <label>Lozinka</label>
            <input 
              type="password" 
              placeholder="Unesite lozinku"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button type="submit" className="auth-btn">Uloguj se</button>
        </form>
      </div>
    </div>
  );
}

export default Login;