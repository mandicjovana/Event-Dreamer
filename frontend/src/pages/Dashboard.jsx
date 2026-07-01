import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logoSlika from '../assets/logo.png'; 

function Dashboard() {
  const [vendori, setVendori] = useState([]);
  const [userEvents, setUserEvents] = useState([]); 
  
  const [aktivnaKategorija, setAktivnaKategorija] = useState('Sve');
  const [searchTerm, setSearchTerm] = useState(''); 
  const [priceMin, setPriceMin] = useState(''); 
  const [priceMax, setPriceMax] = useState(''); 
  
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [chosenEventId, setChosenEventId] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [busyDates, setBusyDates] = useState([]); 
  const [prikazaniMjesec, setPrikazaniMjesec] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // stanja za sale
  const [brojGostiju, setBrojGostiju] = useState('');
  const [odabraniPaket, setOdabraniPaket] = useState('premium'); // 

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Molimo vas da se prijavite kako biste vidjeli vendore.');
      setLoading(false);
      return;
    }

    const roleId = localStorage.getItem('roleId');
    if (Number(roleId) === 1) {
      window.alert('❌ Pristup odbijen! Administratori nemaju pristup korisničkim stranicama.');
      navigate('/admin'); 
      return; 
    }

    const fetchVendori = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/vendors', { headers: { Authorization: `Bearer ${token}` } });
        setVendori(response.data || []);
      } catch (error) {
        console.error(error);
        setError('Došlo je do greške pri učitavanju podataka.');
      }
    };

    const fetchUserEvents = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/my-events', { headers: { Authorization: `Bearer ${token}` } });
        setUserEvents(response.data || []);
      } catch (error) {
        console.error(error);
      }
    };

    Promise.all([fetchVendori(), fetchUserEvents()]).then(() => setLoading(false)).catch(() => setLoading(false));
  }, [navigate]);

  const handleOpenModal = async (vendor) => {
    setSelectedVendor(vendor);
    setPrikazaniMjesec(new Date()); 
    setSelectedCalendarDate(null); 
    setBrojGostiju(''); 
    setOdabraniPaket('premium'); // osnovni paket je onaj za vjencanja
    const token = localStorage.getItem('token');
    const vId = vendor?.Id || vendor?.id || vendor?.ID;
    
    try {
      const response = await axios.get(`http://localhost:5000/api/vendors/${vId}/busy-dates`, { headers: { Authorization: `Bearer ${token}` } });
      setBusyDates(response.data || []);
    } catch (error) {
      console.error("Greška pri dohvatanju datuma:", error);
      setBusyDates([]);
    }
  };

  const handleConfirmBooking = async () => {
    const token = localStorage.getItem('token');
    if (!chosenEventId) {
      alert('Molimo te izaberi događaj.');
      return;
    }

    const isSala = Number(selectedVendor?.CategoryID) === 1;
    let konacnaCijena = selectedVendor?.BasePrice ? Number(selectedVendor.BasePrice) : 1;
    let opisTroska = `Angažovanje: ${selectedVendor?.Name || 'Vendor'}`;

    // za salu racunamo cijenu zavisno od paketa i broja gostiju
    if (isSala) {
      if (!brojGostiju || Number(brojGostiju) <= 0) {
        alert('Molimo unesite procijenjen broj gostiju kako bismo izračunali ukupnu cijenu!');
        return;
      }

      let cijenaPoOsobi = konacnaCijena; // cijena iz baze tj premijum
      let nazivPaketa = "Svadbeni paket (Premium)";

      if (odabraniPaket === 'standard') {
        cijenaPoOsobi = Math.max(15, konacnaCijena - 10); // ogranicenja za standardni paket
        nazivPaketa = "Rođendanski paket (Standard)";
      } else if (odabraniPaket === 'poslovni') {
        cijenaPoOsobi = Math.max(10, konacnaCijena - 15); // Korporativni je 15€ jeftiniji (ali ne ispod 10€)
        nazivPaketa = "Korporativni paket";
      }

      konacnaCijena = cijenaPoOsobi * Number(brojGostiju);
      opisTroska += ` (${nazivPaketa}, za ${brojGostiju} osoba - ${cijenaPoOsobi} € po osobi)`;
    }

    try {
      await axios.post('http://localhost:5000/api/book-vendor', {
        eventId: chosenEventId,
        vendorId: selectedVendor?.Id || selectedVendor?.id || selectedVendor?.ID,
        expenseName: opisTroska,
        amount: konacnaCijena, // saljemo izracunatu sumu iz budzeta
        categoryId: selectedVendor?.CategoryID,
        newDate: selectedCalendarDate 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setBookingMessage('🎉 Uspješno zakazano! Provjeri stranicu "Moji događaji".');
      setTimeout(() => {
        setSelectedVendor(null);
        setChosenEventId('');
        setSelectedCalendarDate(null);
        setBrojGostiju('');
        setOdabraniPaket('premium');
        setBookingMessage('');
        window.location.reload(); 
      }, 2000);

    } catch (error) {
      console.error(error);
      if (error.response?.data?.poruka) {
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

  const filtriraniVendori = Array.isArray(vendori) 
    ? vendori.filter((vendor) => {
        if (!vendor || !vendor.Name) return false;
        const odgovaraKategoriji = aktivnaKategorija === 'Sve' || Number(vendor.CategoryID) === aktivnaKategorija;
        const odgovaraPretrazi = vendor.Name.toLowerCase().includes(searchTerm.toLowerCase());
        const vendorCijena = Number(vendor.BasePrice) || 0;
        const minCijena = priceMin === '' ? 0 : Number(priceMin);
        const maxCijena = priceMax === '' ? Infinity : Number(priceMax);
        const odgovaraCijeni = vendorCijena >= minCijena && vendorCijena <= maxCijena; 
        return odgovaraKategoriji && odgovaraPretrazi && odgovaraCijeni;
      })
    : [];

  const mjeseciNazivi = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
  const danas = new Date();
  const danasnjiDatum = new Date(danas.getFullYear(), danas.getMonth(), danas.getDate());
  const jeTrenutniMjesec = prikazaniMjesec.getFullYear() === danas.getFullYear() && prikazaniMjesec.getMonth() === danas.getMonth();

  const prethodniMjesec = () => { if (!jeTrenutniMjesec) setPrikazaniMjesec(new Date(prikazaniMjesec.getFullYear(), prikazaniMjesec.getMonth() - 1, 1)); };
  const sljedeciMjesec = () => setPrikazaniMjesec(new Date(prikazaniMjesec.getFullYear(), prikazaniMjesec.getMonth() + 1, 1));

  const generisiDaneKalendara = () => {
    const godina = prikazaniMjesec.getFullYear();
    const mjesec = prikazaniMjesec.getMonth(); 
    const brojDanaUMjesecu = new Date(godina, mjesec + 1, 0).getDate();
    let prviDanUNedjelji = new Date(godina, mjesec, 1).getDay();
    prviDanUNedjelji = prviDanUNedjelji === 0 ? 6 : prviDanUNedjelji - 1;

    const dani = [];
    for (let p = 0; p < prviDanUNedjelji; p++) dani.push(<div key={`empty-${p}`}></div>);

    for (let i = 1; i <= brojDanaUMjesecu; i++) {
      const danFormatiran = i < 10 ? `0${i}` : i;
      const mjesecFormatiran = (mjesec + 1) < 10 ? `0${mjesec + 1}` : mjesec + 1;
      const proveraDatuma = `${godina}-${mjesecFormatiran}-${danFormatiran}`;
      
      const ovajDan = new Date(godina, mjesec, i);
      const jeProsliDan = ovajDan < danasnjiDatum;
      const jeZauzet = Array.isArray(busyDates) && busyDates.includes(proveraDatuma);
      const jeSelektovan = selectedCalendarDate === proveraDatuma;
      
      let bgColor, borderColor, textColor, dotColor, tooltipText;
      if (jeProsliDan) { bgColor = 'rgba(0, 0, 0, 0.05)'; borderColor = 'rgba(0, 0, 0, 0.1)'; textColor = '#888'; dotColor = 'transparent'; tooltipText = 'Prošao datum'; } 
      else if (jeZauzet) { bgColor = 'rgba(235, 77, 75, 0.2)'; borderColor = '#eb4d4b'; textColor = '#111'; dotColor = '#eb4d4b'; tooltipText = 'Zauzet termin'; } 
      else if (jeSelektovan) { bgColor = 'rgba(255, 193, 7, 0.4)'; borderColor = '#ffc107'; textColor = '#111'; dotColor = '#ffc107'; tooltipText = 'Novi datum!'; } 
      else { bgColor = 'rgba(106, 176, 76, 0.2)'; borderColor = '#6ab04c'; textColor = '#111'; dotColor = '#6ab04c'; tooltipText = 'Slobodno'; }

      dani.push(
        <div key={i} onClick={() => { if (!jeProsliDan && !jeZauzet) setSelectedCalendarDate(selectedCalendarDate === proveraDatuma ? null : proveraDatuma); }}
          style={{ background: bgColor, border: `2px solid ${borderColor}`, color: textColor, padding: '8px 5px', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem', fontWeight: '600', position: 'relative', opacity: jeProsliDan ? 0.6 : 1, cursor: (!jeProsliDan && !jeZauzet) ? 'pointer' : 'not-allowed', transform: jeSelektovan ? 'scale(1.05)' : 'none', transition: 'all 0.2s ease' }} title={tooltipText} >
          {i}.
          {dotColor !== 'transparent' && <span style={{ width: '6px', height: '6px', background: dotColor, borderRadius: '50%', position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)' }}></span>}
        </div>
      );
    }
    return dani;
  };

  if (loading) return <div className="dashboard-container"><h2 className="dashboard-loading">Učitavanje... 🌸</h2></div>;
  if (error) return <div className="dashboard-container"><h2 className="dashboard-error">{error}</h2></div>;

  return (
    <div className="dashboard-container">
      <div className="logo-container">
        <img src={logoSlika} alt="EventDreamer Logo" className="app-logo" />
      </div>
      <h1 className="dashboard-title">Pronađite savršene vendore</h1>
      
      <div className="search-filter-container">
        <div className="search-input-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" placeholder="Pretraži vendore" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-main-input" />
        </div>

        <div className="price-filter-wrapper">
          <span className="price-filter-label">Budžet:</span>
          <div className="price-inputs-container">
            <input type="number" placeholder="Od €" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="price-input-field" />
            <span className="price-separator">-</span>
            <input type="number" placeholder="Do €" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="price-input-field" />
          </div>
          {(priceMin || priceMax) && <button onClick={() => { setPriceMin(''); setPriceMax(''); }} className="filter-reset-btn">Poništi</button>}
        </div>
      </div>
      
      <div className="category-tabs">
        <button className={`tab-btn ${aktivnaKategorija === 'Sve' ? 'active' : ''}`} onClick={() => setAktivnaKategorija('Sve')}>Svi vendori</button>
        <button className={`tab-btn ${aktivnaKategorija === 1 ? 'active' : ''}`} onClick={() => setAktivnaKategorija(1)}>Sale i restorani</button>
        <button className={`tab-btn ${aktivnaKategorija === 2 ? 'active' : ''}`} onClick={() => setAktivnaKategorija(2)}>Fotografi</button>
        <button className={`tab-btn ${aktivnaKategorija === 3 ? 'active' : ''}`} onClick={() => setAktivnaKategorija(3)}>Muzika / bend</button>
        <button className={`tab-btn ${aktivnaKategorija === 4 ? 'active' : ''}`} onClick={() => setAktivnaKategorija(4)}>Dekoracija</button>
        <button className={`tab-btn ${aktivnaKategorija === 5 ? 'active' : ''}`} onClick={() => setAktivnaKategorija(5)}>Torte i slatkiši</button>
      </div>
      
      <div className="vendor-grid">
        {filtriraniVendori.length > 0 ? (
          filtriraniVendori.map((vendor) => {
            const vId = vendor?.Id || vendor?.id || vendor?.ID || Math.random();
            return (
              <div key={vId} className="vendor-card">
                <div className="vendor-image-container">
                  {vendor?.ImagePath ? <img src={`http://localhost:5000/uploads/${vendor.ImagePath}`} alt={vendor.Name} className="vendor-image" /> : <div className="placeholder-image">Nema slike</div>}
                </div>
                <div className="vendor-info">
                  <h3>{vendor?.Name}</h3>
                  <p className="kategorija">{getNazivKategorije(vendor?.CategoryID)}</p>
                  <div className="opis">
                    <p><strong>Kontakt:</strong> {vendor?.Contact}</p>
                    <p><strong>{Number(vendor?.CategoryID) === 1 ? 'Početna cijena menija' : 'Fiksna cijena usluge'}:</strong> {vendor?.BasePrice} €</p>
                  </div>
                  <button className="contact-btn" onClick={() => handleOpenModal(vendor)}>Zakaži termin</button>
                </div>
              </div>
            );
          })
        ) : <p className="no-vendors-text">Nema dostupnih vendora koji odgovaraju pretrazi.</p>}
      </div>

      {/* za zakazivanje */}
      {selectedVendor && (
        <div className="modal-overlay" onClick={() => setSelectedVendor(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedVendor(null)}>✖</button>
            
            <h2 className="modal-header-title">Zakaži: {selectedVendor?.Name}</h2>
            <p className="modal-service-price" style={{ marginBottom: '10px' }}>
              {Number(selectedVendor?.CategoryID) === 1 ? 'Premium svadbeni meni' : 'Fiksna cijena usluge'}: <strong>{selectedVendor?.BasePrice || 0} €</strong>
            </p>
            
            {/* za izbor paketa i broja gostiju */}
            {Number(selectedVendor?.CategoryID) === 1 && (
              <div style={{ background: 'rgba(246, 222, 234, 0.4)', border: '1px solid var(--logo-pink)', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                
                <label style={{ fontWeight: '600', color: '#111', display: 'block', marginBottom: '8px' }}>Odaberite paket usluga:</label>
                <select 
                  value={odabraniPaket} 
                  onChange={(e) => setOdabraniPaket(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '15px', fontSize: '0.95rem', cursor: 'pointer' }}
                >
                  <option value="premium">💍 Svadbeni paket (Premium) - {selectedVendor?.BasePrice} € / osobi</option>
                  <option value="standard">🎂 Rođendanski paket (Standard) - {Math.max(15, Number(selectedVendor?.BasePrice) - 10)} € / osobi</option>
                  <option value="poslovni">💼 Poslovni paket - {Math.max(10, Number(selectedVendor?.BasePrice) - 15)} € / osobi</option>
                </select>

                <label style={{ fontWeight: '600', color: '#111', display: 'block', marginBottom: '8px' }}>Unesite procijenjen broj gostiju:</label>
                <input 
                  type="number" 
                  min="1"
                  value={brojGostiju} 
                  onChange={(e) => setBrojGostiju(e.target.value)} 
                  placeholder="Npr. 150"
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', width: '100%', maxWidth: '200px', fontSize: '1rem' }}
                />

                {brojGostiju && Number(brojGostiju) > 0 && (
                  <div style={{ marginTop: '15px', background: 'rgba(255,255,255,0.7)', padding: '10px', borderRadius: '8px', borderLeft: '4px solid var(--logo-green)' }}>
                    <p style={{ margin: 0, fontSize: '1rem', color: '#333' }}>
                      Ukupna procijenjena cijena: <strong style={{ color: '#111', fontSize: '1.25rem' }}>
                        {odabraniPaket === 'premium' ? Number(brojGostiju) * Number(selectedVendor.BasePrice) :
                         odabraniPaket === 'standard' ? Number(brojGostiju) * Math.max(15, Number(selectedVendor.BasePrice) - 10) :
                         Number(brojGostiju) * Math.max(10, Number(selectedVendor.BasePrice) - 15)} €
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {bookingMessage ? (
              <p className="success-booking-msg">{bookingMessage}</p>
            ) : (
              <div>
                <div style={{ marginBottom: '25px', background: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <button onClick={prethodniMjesec} disabled={jeTrenutniMjesec} style={{ background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '5px', padding: '5px 12px', cursor: jeTrenutniMjesec ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: '#111', opacity: jeTrenutniMjesec ? 0.4 : 1 }}>&lt; Prethodni</button>
                    <h4 style={{ fontSize: '1.1rem', margin: '0', color: '#111' }}>🗓️ {mjeseciNazivi[prikazaniMjesec.getMonth()]} {prikazaniMjesec.getFullYear()}.</h4>
                    <button onClick={sljedeciMjesec} style={{ background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '5px', padding: '5px 12px', cursor: 'pointer', fontWeight: 'bold', color: '#111' }}>Sljedeći &gt;</button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '8px', textAlign: 'center', fontSize: '0.8rem', color: '#555', fontWeight: 'bold' }}>
                    <div>Pon</div><div>Uto</div><div>Sri</div><div>Čet</div><div>Pet</div><div>Sub</div><div>Ned</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>{generisiDaneKalendara()}</div>
                  
                  {selectedCalendarDate && (
                    <div style={{ background: 'rgba(255, 193, 7, 0.2)', border: '1px solid #ffc107', padding: '10px', borderRadius: '8px', marginTop: '15px', fontSize: '0.9rem', color: '#111' }}>
                      ⭐ Izabrali ste <strong>{new Date(selectedCalendarDate).toLocaleDateString('me-ME')}</strong>. <br/>
                      Ukoliko potvrdite rezervaciju, datum vašeg događaja biće pomjeren na ovaj dan!
                    </div>
                  )}
                </div>

                <h4 className="event-selection-title">Izaberi za koji događaj rezervišeš:</h4>
                <div className="event-selection-list">
                  {userEvents && userEvents.length === 0 ? <p>Nemaš kreiranih događaja. Prvo napravi događaj!</p> : (
                    userEvents.map(event => (
                      <div key={event?.Id || event?.id} className={`event-option-card ${chosenEventId === (event?.Id || event?.id) ? 'selected' : ''}`} onClick={() => setChosenEventId(event?.Id || event?.id)}>
                        <div className="event-option-info">
                          <h4>{event?.Title}</h4>
                          <span className="event-option-date">Trenutni datum: 📅 {event?.Date ? new Date(event.Date).toLocaleDateString('me-ME') : ''}</span>
                        </div>
                        <div className="radio-circle"></div>
                      </div>
                    ))
                  )}
                </div>

                <button className={`confirm-booking-btn ${chosenEventId ? 'active' : 'disabled'}`} onClick={handleConfirmBooking} disabled={!chosenEventId}>
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