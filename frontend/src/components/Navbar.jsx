import { Link, useNavigate, useLocation } from 'react-router-dom';
import logoSlika from '../assets/logo.png';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); 
  const token = localStorage.getItem('token');

  // da se na home, login ili register ne prikazuje navbar
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('token'); 
    navigate('/login'); 
  };

  return (
    <nav className="glass-navbar">
      <div className="navbar-content">
        
        {/* pritiskom na logo vodi nas na dashboard*/}
        <Link to="/dashboard" className="nav-logo-link">
          <img src={logoSlika} alt="EventDreamer" className="nav-logo" />
          <span className="nav-brand-name">EventDreamer</span>
        </Link>
        <div className="nav-links">
          <Link to="/dashboard" className="nav-item">Svi vendori</Link>
          <Link to="/my-events" className="nav-item">Moji događaji</Link>
          <button onClick={handleLogout} className="logout-btn">Odjavi se</button>
        </div>
        
      </div>
    </nav>
  );
}

export default Navbar;