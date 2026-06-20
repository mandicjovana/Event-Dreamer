import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedEvent, setSelectedEvent] = useState(null); // Za prikaz detalja
  
  // Stanja za kreiranje događaja
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eventTypes, setEventTypes] = useState([]);
  const [venues, setVenues] = useState([]); // cuva samo sale i restorane
  const [newEvent, setNewEvent] = useState({
    title: '',
    eventTypeId: '',
    date: '',
    location: '',
    totalBudget: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // ucitavanje dogadjaja za korisnika
        const responseEvents = await axios.get('http://localhost:5000/api/my-events', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEvents(responseEvents.data);

        // ucitavanje tipova dogadjaja
        const responseTypes = await axios.get('http://localhost:5000/api/event-types');
        setEventTypes(responseTypes.data);

        // ucitavamo vendore ali i filtriramo kategoriju ya sale i restorane dje je id = 1
        const responseVendors = await axios.get('http://localhost:5000/api/vendors', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const samoSale = responseVendors.data.filter(v => Number(v.CategoryID) === 1);
        setVenues(samoSale);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Došlo je do greške pri učitavanju podataka.');
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // ovo je funkcija za slanje novog dogadjaja u bazu
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      await axios.post('http://localhost:5000/api/events', newEvent, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('🎉 Događaj je uspješno kreiran!');
      setIsCreateModalOpen(false);
      window.location.reload(); // osvjezavanje stranice za prikaz novog dogadjaja
    } catch (err) {
      console.error(err);
      alert('Greška pri kreiranju događaja. Provjeri da li si unijela sve podatke.');
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('me-ME', options);
  };

  if (loading) return <div className="dashboard-container"><h2>Učitavanje tvojih događaja... 🌸</h2></div>;
  if (error) return <div className="dashboard-container"><h2 style={{color: 'red'}}>{error}</h2></div>;

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '900px', margin: '0 auto 30px auto' }}>
        <h1 className="dashboard-title" style={{ margin: 0 }}>Moji događaji</h1>
        <button className="create-event-btn" onClick={() => setIsCreateModalOpen(true)}>
          + Kreiraj događaj
        </button>
      </div>
      
      <div className="my-events-grid">
        {events.length === 0 ? (
          <p className="no-events">Trenutno nemaš zakazanih događaja. Započni planiranje tako što ćeš kreirati novi!</p>
        ) : (
          events.map((event) => {
            const potroseno = event.expenses ? event.expenses.reduce((suma, trosak) => suma + Number(trosak.ActualAmount), 0) : 0;
            const zavrseniZadaci = event.tasks ? event.tasks.filter(t => t.IsCompleted).length : 0;
            const ukupnoZadataka = event.tasks ? event.tasks.length : 0;
            const ukupnoGostiju = event.guests ? event.guests.length : 0;
            const potvrdiliGosti = event.guests ? event.guests.filter(g => g.RSVPStatus === 'Potvrdio').length : 0;

            return (
              <div key={event.Id} className="event-glass-card">
                <div className="event-header">
                  <h2>{event.Title}</h2>
                  <span className="event-date">📅 {formatDate(event.Date)}</span>
                  <span className="event-location">📍 {event.Location}</span>
                </div>

                <div className="event-stats">
                  <div className="stat-box">
                    <h4>Budžet</h4>
                    <p className="stat-numbers">{potroseno} € <span className="stat-total">/ {event.TotalBudget} €</span></p>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill pink-fill" style={{ width: `${Math.min((potroseno / event.TotalBudget) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="stat-box">
                    <h4>Zadaci</h4>
                    <p className="stat-numbers">{zavrseniZadaci} <span className="stat-total">/ {ukupnoZadataka}</span></p>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill green-fill" style={{ width: `${ukupnoZadataka > 0 ? (zavrseniZadaci / ukupnoZadataka) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                  <div className="stat-box">
                    <h4>Gosti</h4>
                    <p className="stat-numbers">{potvrdiliGosti} <span className="stat-total">/ {ukupnoGostiju}</span></p>
                  </div>
                </div>

                <button className="details-btn" onClick={() => setSelectedEvent(event)}>
                  Prikaži detalje
                </button>
              </div>
            );
          })
        )}
      </div>

      {/*Za prikaz detalja */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedEvent(null)}>✖</button>
            <h2>{selectedEvent.Title} - Detalji</h2>
            <div className="modal-sections">
              <div className="modal-section">
                <h3>📝 To-Do Lista</h3>
                <ul>
                  {selectedEvent.tasks && selectedEvent.tasks.length > 0 ? selectedEvent.tasks.map(task => (
                    <li key={task.Id} style={{ textDecoration: task.IsCompleted ? 'line-through' : 'none', color: task.IsCompleted ? '#888' : '#111' }}>
                      {task.IsCompleted ? '✅' : '⏳'} {task.TaskName}
                    </li>
                  )) : <li>Nema dodatih zadataka.</li>}
                </ul>
              </div>
              <div className="modal-section">
                <h3>💌 Gosti</h3>
                <ul>
                  {selectedEvent.guests && selectedEvent.guests.length > 0 ? selectedEvent.guests.map(guest => (
                    <li key={guest.Id}>{guest.FirstName} {guest.LastName} - <strong>{guest.RSVPStatus}</strong></li>
                  )) : <li>Nema dodatih gostiju.</li>}
                </ul>
              </div>
              <div className="modal-section">
                <h3>💸 Plaćanja Vendora</h3>
                <ul>
                  {selectedEvent.expenses && selectedEvent.expenses.length > 0 ? selectedEvent.expenses.map(expense => (
                    <li key={expense.Id}>{expense.VendorName} ({expense.ExpenseName}): {expense.ActualAmount} € - {expense.IsPaid ? '✅ Plaćeno' : '❌ Nije plaćeno'}</li>
                  )) : <li>Još uvijek nema troškova.</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Za kreiranje dogadjaja*/}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" style={{maxWidth: '500px'}} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setIsCreateModalOpen(false)}>✖</button>
            <h2>Kreiraj novi događaj</h2>
            
            <form onSubmit={handleCreateEvent} className="create-event-form">
              <div className="form-group">
                <label>Naziv događaja</label>
                <input 
                  type="text" 
                  placeholder="Npr. Vjenčanje Milica & Marko" 
                  required 
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Tip događaja</label>
                <select 
                  required
                  value={newEvent.eventTypeId}
                  onChange={(e) => setNewEvent({...newEvent, eventTypeId: e.target.value})}
                >
                  <option value="">-- Odaberi tip --</option>
                  {eventTypes.map(type => (
                    <option key={type.Id} value={type.Id}>{type.Name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Datum i vrijeme</label>
                <input 
                  type="datetime-local" 
                  required 
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Lokacija (Izaberi salu ili unesi svoju)</label>
                <input 
                  list="venues-list"
                  placeholder="Klikni za odabir sale ili ukucaj lokaciju..." 
                  required 
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                />
                <datalist id="venues-list">
                  {venues.map(venue => (
                    <option key={venue.Id} value={venue.Name} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Ukupan budžet (€)</label>
                <input 
                  type="number" 
                  placeholder="Npr. 5000" 
                  required 
                  value={newEvent.totalBudget}
                  onChange={(e) => setNewEvent({...newEvent, totalBudget: e.target.value})}
                />
              </div>

              <button type="submit" className="auth-btn" style={{marginTop: '15px'}}>Sačuvaj događaj</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyEvents;