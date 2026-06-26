import { Link, useNavigate, useLocation } from 'react-router-dom';
import logoSlika from '../assets/logo.png';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const token = localStorage.getItem('token');
  const roleId = localStorage.getItem('roleId'); 

  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const handleLogout = () => {
    localStorage.clear(); 
    navigate('/login'); 
  };

  return (
    <nav className="glass-navbar">
      <div className="navbar-content">
        
        <Link to={Number(roleId) === 1 ? "/admin" : "/dashboard"} className="nav-logo-link">
          <img src={logoSlika} alt="EventDreamer" className="nav-logo" />
          <span className="nav-brand-name">EventDreamer</span>
        </Link>
        
        <div className="nav-links">
          {Number(roleId) === 1 ? (
            // linkovi samo za admina
            <>
              <Link 
                to="/admin" 
                className={`nav-item ${location.pathname === '/admin' ? 'active-nav' : ''}`}
                style={location.pathname === '/admin' ? { color: '#111', fontWeight: '800' } : {}}
              >
                📊 Kontrolna Tabla
              </Link>
            </>
          ) : (
            // linkovi za korisnika
            <>
              <Link 
                to="/dashboard" 
                className={`nav-item ${location.pathname === '/dashboard' ? 'active-nav' : ''}`}
              >
                Svi vendori
              </Link>
              <Link 
                to="/my-events" 
                className={`nav-item ${location.pathname === '/my-events' ? 'active-nav' : ''}`}
              >
                Moji događaji
              </Link>
            </>
          )}

          <button onClick={handleLogout} className="logout-btn">Odjavi se</button>
        </div>
        
      </div>
    </nav>
  );
}

export default Navbar;