import { useState, useEffect } from 'react';
import axios from 'axios';
import logoSlika from '../assets/logo.png';

function Dashboard() {
  const [vendori, setVendori] = useState([]);
  
  const [aktivnaKategorija, setAktivnaKategorija] = useState('Sve');

  useEffect(() => {
    const fetchVendori = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('Token nije pronađen! Korisnik vjerovatno nije ulogovan.');
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/api/vendors', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVendori(response.data);
      } catch (error) {
        console.error('Greška pri učitavanju vendora:', error);
      }
    };

    fetchVendori();
  }, []);

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

  return (

    <div className="dashboard-container">
      {}
      <div className="logo-container">
        <img src={logoSlika} alt="EventDreamer Logo" className="app-logo" />
      </div>
      <h1 className="dashboard-title">Pronađite savršene vendore</h1>
      
      {}
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
                
                <button className="contact-btn">Zakaži termin</button>
              </div>
            </div>
          ))
        ) : (
          <p className="no-vendors" style={{ color: '#333', fontSize: '1.2rem' }}>
            Nema dostupnih vendora u ovoj kategoriji.
          </p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;