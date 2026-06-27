import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logoSlika from '../assets/logo.png';

function Navbar() {
  // za responsive za mobilni telefon
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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

  // zatvara meni kad god se klikne neki ling
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="glass-navbar">
      <div className="navbar-content">
        
        <Link to={Number(roleId) === 1 ? "/admin" : "/dashboard"} className="nav-logo-link" onClick={closeMenu}>
          <img src={logoSlika} alt="EventDreamer" className="nav-logo" />
          <span className="nav-brand-name">EventDreamer</span>
        </Link>

        {/* hamburger dugme prikazuje se kad smo na telefonu*/}
        <button 
          className="hamburger-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            // x kada je meni otvoren
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            // hamburger kada je zatvoren meni
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          )}
        </button>
        
        {/*navigacioni linkovi sa dinamičkom klasom active */}
        <div className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
          {Number(roleId) === 1 ? (
            <>
              <Link 
                to="/admin" 
                className={`nav-item ${location.pathname === '/admin' ? 'active-nav' : ''}`}
                style={location.pathname === '/admin' ? { color: '#111', fontWeight: '800' } : {}}
                onClick={closeMenu}
              >
                📊 Kontrolna Tabla
              </Link>
            </>
          ) : (
            <>
              <Link 
                to="/dashboard" 
                className={`nav-item ${location.pathname === '/dashboard' ? 'active-nav' : ''}`}
                onClick={closeMenu}
              >
                Svi vendori
              </Link>
              <Link 
                to="/my-events" 
                className={`nav-item ${location.pathname === '/my-events' ? 'active-nav' : ''}`}
                onClick={closeMenu}
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