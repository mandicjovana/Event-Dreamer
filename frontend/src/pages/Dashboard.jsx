import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logoSlika from '../assets/logo.png';

function Dashboard() {
  const [vendori, setVendori] = useState([]);
  const [userEvents, setUserEvents] = useState([]); // svi događaji ovog korisnika
  const [aktivnaKategorija, setAktivnaKategorija] = useState('Sve');
  
  // Stanja za iskačući prozor zakazivanja
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [chosenEventId, setChosenEventId] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate(); // dodato za preusmjeravanje

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('Token nije pronađen! Korisnik vjerovatno nije ulogovan.');
      setError('Molimo vas da se prijavite kako biste vidjeli vendore.');
      setLoading(false);
      return;
    }

    // za upozorenje kad admin hoce da udje na dashboard
    const roleId = localStorage.getItem('roleId');
    if (Number(roleId) === 1) {
      window.alert('❌ Pristup odbijen! Administratori nemaju pristup korisničkim stranicama.');
      navigate('/admin'); 
      return; 
    }

    // ucitavaju se svi vendori
    const fetchVendori = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/vendors', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVendori(response.data);
      } catch (error) {
        console.error('Greška pri učitavanju vendora:', error);
        setError('Došlo je do greške pri učitavanju podataka.');
      }
    };

    // ucitavanje dogadjaja ulogovanog korisnika
    const fetchUserEvents = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/my-events', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserEvents(response.data);
      } catch (error) {
        console.error('Greška pri učitavanju korisnikovih događaja:', error);
      }
    };

    // Pokrećemo učitavanje i kad sve završi sklanjamo loading ekran
    Promise.all([fetchVendori(), fetchUserEvents()]).then(() => {
      setLoading(false);
    });

  }, [navigate]);

  // funkcija za proces zakazivanja na backendu
  const handleConfirmBooking = async () => {
    const token = localStorage.getItem('token');
    if (!chosenEventId) {
      alert('Molimo te izaberi događaj.');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/book-vendor', {
        eventId: chosenEventId,
        vendorId: selectedVendor.Id,
        expenseName: `Angažovanje: ${selectedVendor.Name}`,
        amount: selectedVendor.BasePrice
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setBookingMessage('🎉 Uspješno zakazano! Provjeri stranicu "Moji događaji".');
      setTimeout(() => {
        setSelectedVendor(null);
        setChosenEventId('');
        setBookingMessage('');
        window.location.reload(); 
      }, 2000);

    } catch (error) {
      console.error(error);
      if (error.response && error.response.data && error.response.data.poruka) {
        alert(error.response.data.poruka);
      } else {
        alert('Greška pri zakazivanju. Pokušaj ponovo.');
      }
    }
  };

  const getNazivKategorije = (id) => {
    switch(Number(id)) {
      case 1: return 'Sala / restoran';
      case 2: return 'Fotograf';
      case 3: return 'Muzika / bend';
      case 4: return 'Dekoracija';
      case 5: return 'Torte i slatkiši';
      default: return 'Razno';
    }
  };

  const filtriraniVendori = aktivnaKategorija === 'Sve' 
    ? vendori 
    : vendori.filter((vendor) => Number(vendor.CategoryID) === aktivnaKategorija);

  if (loading) return <div className="dashboard-container"><h2>Učitavanje... 🌸</h2></div>;
  if (error) return <div className="dashboard-container"><h2 style={{color: 'red'}}>{error}</h2></div>;

  return (
    <div className="dashboard-container">
      <div className="logo-container">
        <img src={logoSlika} alt="EventDreamer Logo" className="app-logo" />
      </div>
      <h1 className="dashboard-title">Pronađite savršene vendore</h1>
      
      <div className="category-tabs">
        <button 
          className={`tab-btn ${aktivnaKategorija === 'Sve' ? 'active' : ''}`} 
          onClick={() => setAktivnaKategorija('Sve')}
        >
          Svi vendori
        </button>
        <button 
          className={`tab-btn ${aktivnaKategorija === 1 ? 'active' : ''}`} 
          onClick={() => setAktivnaKategorija(1)}
        >
          Sale i restorani
        </button>
        <button 
          className={`tab-btn ${aktivnaKategorija === 3 ? 'active' : ''}`} 
          onClick={() => setAktivnaKategorija(3)}
        >
          Muzika / bend
        </button>
        <button 
          className={`tab-btn ${aktivnaKategorija === 5 ? 'active' : ''}`} 
          onClick={() => setAktivnaKategorija(5)}
        >
          Torte i slatkiši
        </button>
      </div>
      
      <div className="vendor-grid">
        {filtriraniVendori.length > 0 ? (
          filtriraniVendori.map((vendor) => (
            <div key={vendor.Id || Math.random()} className="vendor-card">
              <div className="vendor-image-container">
                {vendor.ImagePath ? (
                  <img 
                    src={`http://localhost:5000/uploads/${vendor.ImagePath}`} 
                    alt={vendor.Name} 
                    className="vendor-image" 
                  />
                ) : (
                  <div className="placeholder-image">Nema slike</div>
                )}
              </div>

              <div className="vendor-info">
                <h3>{vendor.Name}</h3>
                <p className="kategorija">{getNazivKategorije(vendor.CategoryID)}</p>
                
                <div className="opis">
                  <p><strong>Kontakt:</strong> {vendor.Contact}</p>
                  <p><strong>Početna cijena:</strong> {vendor.BasePrice} €</p>
                </div>
                
                <button 
                  className="contact-btn" 
                  onClick={() => setSelectedVendor(vendor)}
                >
                  Zakaži termin
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="no-vendors" style={{ color: '#333', fontSize: '1.2rem' }}>
            Nema dostupnih vendora u ovoj kategoriji.
          </p>
        )}
      </div>

      {/* za zakazivanje termina*/}
      {selectedVendor && (
        <div className="modal-overlay" onClick={() => setSelectedVendor(null)}>
          <div className="modal-content" style={{maxWidth: '500px'}} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedVendor(null)}>✖</button>
            
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Zakaži: {selectedVendor.Name}</h2>
            <p style={{color: '#555'}}>Cijena usluge: <strong style={{ fontSize: '1.2rem', color: '#111' }}>{selectedVendor.BasePrice} €</strong></p>
            
            {bookingMessage ? (
              <p style={{color: '#28a745', fontWeight: '600', marginTop: '20px', fontSize: '1.1rem', padding: '15px', background: 'rgba(40, 167, 69, 0.1)', borderRadius: '10px'}}>
                {bookingMessage}
              </p>
            ) : (
              <div style={{marginTop: '25px'}}>
                <h4 style={{marginBottom: '15px', color: '#333'}}>Izaberi za koji događaj rezervišeš:</h4>
                
                <div className="event-selection-list">
                  {userEvents.length === 0 ? (
                    <p>Nemaš kreiranih događaja. Prvo napravi događaj na svom profilu!</p>
                  ) : (
                    userEvents.map(event => (
                      <div 
                        key={event.Id} 
                        className={`event-option-card ${chosenEventId === event.Id ? 'selected' : ''}`}
                        onClick={() => setChosenEventId(event.Id)}
                      >
                        <div className="event-option-info">
                          <h4>{event.Title}</h4>
                          <span className="event-option-date">
                            📅 {new Date(event.Date).toLocaleDateString('me-ME')}
                          </span>
                        </div>
                        <div className="radio-circle"></div>
                      </div>
                    ))
                  )}
                </div>

                <button 
                  className="auth-btn" 
                  style={{
                    marginTop: '25px', 
                    background: chosenEventId ? 'var(--logo-green)' : '#ccc',
                    cursor: chosenEventId ? 'pointer' : 'not-allowed',
                    color: chosenEventId ? '#111' : '#666'
                  }}
                  onClick={handleConfirmBooking}
                  disabled={!chosenEventId}
                >
                  {chosenEventId ? 'Potvrdi rezervaciju' : 'Prvo odaberi događaj'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;