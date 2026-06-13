import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <h1 className="home-title">EventDreamer</h1>
      <p className="home-subtitle">
        "Zaboravite na stres oko organizacije. Pronađite idealan prostor, ritam koji pokreće i dekoraciju koja oduzima dah – sve na jedan klik od vas."
      </p>
      
      <div className="btn-group">
        <button 
          onClick={() => navigate('/login')} 
          className="modern-btn btn-login"
        >
          Prijavi se
        </button>
        
        <button 
          onClick={() => navigate('/register')} 
          className="modern-btn btn-register"
        >
          Registruj se
        </button>
      </div>
    </div>
  );
}

export default Home;