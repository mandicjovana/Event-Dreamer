import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedEvent, setSelectedEvent] = useState(null); 
  
  // Stanja za kreiranje događaja
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eventTypes, setEventTypes] = useState([]);
  const [venues, setVenues] = useState([]); 
  const [newEvent, setNewEvent] = useState({
    title: '',
    eventTypeId: '',
    date: '',
    location: '',
    totalBudget: ''
  });

  // stanja za unose unutar prozora za detalje
  const [inputTaskName, setInputTaskName] = useState('');
  const [inputGuestFirst, setInputGuestFirst] = useState('');
  const [inputGuestLast, setInputGuestLast] = useState('');

  const navigate = useNavigate();

  // funkcija za učitavanje svih podataka sa servera
  const fetchAllData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // za upozorenje kad admin hoce da udje na my-events
    const roleId = localStorage.getItem('roleId');
    if (Number(roleId) === 1) {
      window.alert('❌ Pristup odbijen! Administratori nemaju pristup korisničkim stranicama.');
      navigate('/admin'); 
      return; 
    }

    try {
      const responseEvents = await axios.get('http://localhost:5000/api/my-events', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(responseEvents.data);

      const responseTypes = await axios.get('http://localhost:5000/api/event-types');
      setEventTypes(responseTypes.data);

      const responseVendors = await axios.get('http://localhost:5000/api/vendors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const samoSale = responseVendors.data.filter(v => Number(v.CategoryID) === 1);
      setVenues(samoSale);

      // za azuriranje podataka ako je modal otvoren
      if (selectedEvent) {
        const trenutniEvent = responseEvents.data.find(e => e.Id === selectedEvent.Id);
        if (trenutniEvent) setSelectedEvent(trenutniEvent);
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Došlo je do greške pri učitavanju podataka.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [navigate]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.post('http://localhost:5000/api/events', newEvent, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('🎉 Događaj je uspješno kreiran!');
      setIsCreateModalOpen(false);
      fetchAllData();
    } catch (err) {
      console.error(err);
      alert('Greška pri kreiranju događaja.');
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const token = localStorage.getItem('token');
    const newStatus = !currentStatus;
    try {
      await axios.put(`http://localhost:5000/api/tasks/${taskId}/toggle`, 
        { isCompleted: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAllData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateRSVP = async (guestId, newStatus) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`http://localhost:5000/api/guests/${guestId}/rsvp`, 
        { rsvpStatus: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAllData();
    } catch (error) {
      console.error(error);
    }
  };

  //funkcija za promjenu placanja troska
  const handleToggleExpensePaid = async (expenseId, currentStatus) => {
    const token = localStorage.getItem('token');
    const newStatus = !currentStatus; 

    try {
      await axios.put(`http://localhost:5000/api/expenses/${expenseId}/paid`, 
        { isPaid: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAllData(); 
    } catch (error) {
      console.error('Greška pri ažuriranju plaćanja', error);
    }
  };

  // funkcija za dodavanje zadataka na klik
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!inputTaskName.trim()) return;
    const token = localStorage.getItem('token');
    try {
      await axios.post('http://localhost:5000/api/tasks', {
        eventId: selectedEvent.Id,
        taskName: inputTaskName
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setInputTaskName('');
      fetchAllData(); 
    } catch (error) {
      console.error(error);
    }
  };

  // funkcija za dodavanje novog gosta na klik
  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!inputGuestFirst.trim() || !inputGuestLast.trim()) return;
    const token = localStorage.getItem('token');
    try {
      await axios.post('http://localhost:5000/api/guests', {
        eventId: selectedEvent.Id,
        firstName: inputGuestFirst,
        lastName: inputGuestLast
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setInputGuestFirst('');
      setInputGuestLast('');
      fetchAllData(); 
    } catch (error) {
      console.error(error);
    }
  };

  // Funkcija za potvrdu da li zelimo da izadjemo iz prikza detaja
  const handleCloseModal = () => {
    const isConfirmed = window.confirm("Da li ste sigurni da želite da zatvorite prozor? Sve promjene koje ste napravili su već uspješno sačuvane.");
    if (isConfirmed) {
      setSelectedEvent(null);
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
            
            // imena svih rezervisanih vendora za glavnu karticu
            let rezervisaniVendori = 'Još uvijek nema rezervacija';
            if (event.expenses && event.expenses.length > 0) {
              const ostaliVendori = event.expenses
                .map(e => e.VendorName || "Nepoznat vendor")
                .filter(imeVendora => !event.Location.includes(imeVendora)); // Filtrira duplikat!
              
              if (ostaliVendori.length > 0) {
                rezervisaniVendori = ostaliVendori.join(', ');
              } else {
                rezervisaniVendori = 'Za sada rezervisana samo lokacija';
              }
            }

            return (
              <div key={event.Id} className="event-glass-card">
                <div className="event-header">
                  <h2>{event.Title}</h2>
                  <span className="event-date">📅 {formatDate(event.Date)}</span>
                  <span className="event-location">📍 {event.Location}</span>
                  {/*prikay rezervisanih vendora na glavnoj kartici*/}
                  <span className="event-location" style={{ marginTop: '10px', color: '#137333', fontWeight: '600' }}>
                    🏪 Rezervisano: <span style={{ color: '#444', fontWeight: '500' }}>{rezervisaniVendori}</span>
                  </span>
                </div>

                <div className="event-stats">
                  <div className="stat-box">
                    <h4>Budžet</h4>
                    <p className="stat-numbers">{potroseno} € <span className="stat-total">/ {event.TotalBudget} €</span></p>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill pink-fill" 
                        style={{ 
                          width: `${Math.min((potroseno / event.TotalBudget) * 100, 100)}%`,
                          fontSize: '10px', 
                          color: '#111', 
                          fontWeight: 'bold', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          minWidth: potroseno > 0 ? '20px' : '0' 
                        }}
                      >
                        {event.TotalBudget > 0 ? `${Math.round((potroseno / event.TotalBudget) * 100)}%` : '0%'}
                      </div>
                    </div>
                  </div>

                  <div className="stat-box">
                    <h4>Zadaci</h4>
                    <p className="stat-numbers">{zavrseniZadaci} <span className="stat-total">/ {ukupnoZadataka}</span></p>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill green-fill" 
                        style={{ 
                          width: `${ukupnoZadataka > 0 ? (zavrseniZadaci / ukupnoZadataka) * 100 : 0}%`,
                          fontSize: '10px', 
                          color: '#111', 
                          fontWeight: 'bold', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          minWidth: zavrseniZadaci > 0 ? '20px' : '0'
                        }}
                      >
                        {ukupnoZadataka > 0 ? `${Math.round((zavrseniZadaci / ukupnoZadataka) * 100)}%` : '0%'}
                      </div>
                    </div>
                  </div>

                  {/* za goste*/}
                  <div className="stat-box">
                    <h4>Gosti</h4>
                    <p className="stat-numbers">{potvrdiliGosti} <span className="stat-total">/ {ukupnoGostiju}</span></p>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${ukupnoGostiju > 0 ? (potvrdiliGosti / ukupnoGostiju) * 100 : 0}%`,
                          background: 'var(--logo-pink)', 
                          fontSize: '10px', 
                          color: '#111', 
                          fontWeight: 'bold', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          minWidth: potvrdiliGosti > 0 ? '20px' : '0'
                        }}
                      >
                        {ukupnoGostiju > 0 ? `${Math.round((potvrdiliGosti / ukupnoGostiju) * 100)}%` : '0%'}
                      </div>
                    </div>
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

      {/* prikaz detalja */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" style={{ maxWidth: '1050px', width: '95%', padding: '45px' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={handleCloseModal}>✖</button>
            
            <h2 style={{ borderBottom: '2px solid rgba(0,0,0,0.05)', paddingBottom: '15px', marginBottom: '25px', fontSize: '1.7rem' }}>
              {selectedEvent.Title} - Detaljna organizacija
            </h2>
            
            <div className="modal-sections" style={{ gap: '40px' }}>
              
              {/* sekcija za zadatke */}
              <div className="modal-section" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3>📝 To-Do Lista</h3>
                  <ul style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                    {selectedEvent.tasks && selectedEvent.tasks.length > 0 ? selectedEvent.tasks.map(task => (
                      <li 
                        key={task.Id} 
                        onClick={() => handleToggleTask(task.Id, task.IsCompleted)}
                        style={{ 
                          textDecoration: task.IsCompleted ? 'line-through' : 'none', 
                          color: task.IsCompleted ? '#777' : '#111',
                          cursor: 'pointer',
                          padding: '8px 0',
                          fontSize: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{task.IsCompleted ? '✅' : '⬜'}</span> {task.TaskName}
                      </li>
                    )) : <li>Nema dodatih zadataka.</li>}
                  </ul>
                </div>
                
                <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '5px', width: '100%', marginTop: 'auto' }}>
                  <input 
                    type="text" 
                    placeholder="Novi zadatak..." 
                    value={inputTaskName}
                    onChange={(e) => setInputTaskName(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.9rem', flex: 1, minWidth: '0', boxSizing: 'border-box' }}
                  />
                  <button type="submit" style={{ padding: '10px 15px', background: 'var(--logo-green)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>+</button>
                </form>
              </div>

              {/* sekcija za goste */}
              <div className="modal-section" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3>💌 Lista Gostiju</h3>
                  <ul style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                    {selectedEvent.guests && selectedEvent.guests.length > 0 ? selectedEvent.guests.map(guest => (
                      <li key={guest.Id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed rgba(0,0,0,0.05)' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '500' }}>{guest.FirstName} {guest.LastName}</span>
                        <select 
                          value={guest.RSVPStatus || 'Na čekanju'} 
                          onChange={(e) => handleUpdateRSVP(guest.Id, e.target.value)}
                          style={{ 
                            padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
                            background: guest.RSVPStatus === 'Potvrdio' ? '#e6f4ea' : guest.RSVPStatus === 'Odbio' ? '#fce8e6' : '#fff',
                            color: guest.RSVPStatus === 'Potvrdio' ? '#137333' : guest.RSVPStatus === 'Odbio' ? '#c5221f' : '#333',
                          }}
                        >
                          <option value="Na čekanju">⏳ Čekanje</option>
                          <option value="Potvrdio">✅ Dolazi</option>
                          <option value="Odbio">❌ Ne dolazi</option>
                        </select>
                      </li>
                    )) : <li>Nema gostiju.</li>}
                  </ul>
                </div>
                
                <form onSubmit={handleAddGuest} style={{ display: 'flex', gap: '8px', flexDirection: 'column', width: '100%', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                    <input 
                      type="text" 
                      placeholder="Ime..." 
                      value={inputGuestFirst}
                      onChange={(e) => setInputGuestFirst(e.target.value)}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.9rem', flex: 1, minWidth: '0', boxSizing: 'border-box' }}
                    />
                    <input 
                      type="text" 
                      placeholder="Prezime..." 
                      value={inputGuestLast}
                      onChange={(e) => setInputGuestLast(e.target.value)}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.9rem', flex: 1, minWidth: '0', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button type="submit" style={{ padding: '10px', background: 'var(--logo-green)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>+ Dodaj gosta</button>
                </form>
              </div>

              {/* sekcija za placanje I VENDORE */}
              <div className="modal-section" style={{ minHeight: '350px' }}>
                <h3>🏪 Rezervisani Vendori</h3>
                <ul style={{ maxHeight: '310px', overflowY: 'auto', paddingRight: '5px' }}>
                  {selectedEvent.expenses && selectedEvent.expenses.length > 0 ? selectedEvent.expenses.map(expense => (
                    <li key={expense.Id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: '700', fontSize: '1.05rem', color: '#111' }}>
                          {expense.VendorName || 'Nepoznat vendor'}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>
                          {expense.ExpenseName.replace('Angažovanje: ', '')}
                        </span>
                        <span style={{ fontSize: '0.95rem', color: '#333', fontWeight: '500' }}>
                          Iznos: {expense.ActualAmount} €
                        </span>
                      </div>
                      <select 
                        value={expense.IsPaid ? "1" : "0"} 
                        onChange={() => handleToggleExpensePaid(expense.Id, expense.IsPaid)}
                        style={{ 
                          padding: '5px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
                          background: expense.IsPaid ? '#e6f4ea' : '#fce8e6',
                          color: expense.IsPaid ? '#137333' : '#c5221f',
                        }}
                      >
                        <option value="1">✅ Plaćeno</option>
                        <option value="0">❌ Nije plaćeno</option>
                      </select>
                    </li>
                  )) : <li>Još uvijek nema rezervisanih vendora. Opcija zakazivanja se nalazi na Dashboardu!</li>}
                </ul>
              </div>

            </div>

            {/* dugme za zavrsetak izmjene */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '35px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '20px' }}>
              <button 
                className="create-event-btn" 
                style={{ background: 'var(--logo-pink)', color: '#111', padding: '14px 45px', fontSize: '1.05rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                onClick={() => setSelectedEvent(null)}
              >
                ✔ Završi pregled i sačuvaj
              </button>
            </div>

          </div>
        </div>
      )}

      {/* za kreiranje dogadjaja*/}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" style={{maxWidth: '500px'}} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setIsCreateModalOpen(false)}>✖</button>
            <h2>Kreiraj novi događaj</h2>
            <form onSubmit={handleCreateEvent} className="create-event-form">
              <div className="form-group">
                <label>Naziv događaja</label>
                <input type="text" placeholder="Npr. Vjenčanje Milica & Marko" required value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}/>
              </div>
              <div className="form-group">
                <label>Tip događaja</label>
                <select required value={newEvent.eventTypeId} onChange={(e) => setNewEvent({...newEvent, eventTypeId: e.target.value})}>
                  <option value="">-- Odaberi tip --</option>
                  {eventTypes.map(type => <option key={type.Id} value={type.Id}>{type.Name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Datum i vrijeme</label>
                <input type="datetime-local" required value={newEvent.date} onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}/>
              </div>
              <div className="form-group">
                <label>Lokacija</label>
                <input list="venues-list" placeholder="Klikni za odabir sale..." required value={newEvent.location} onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}/>
                <datalist id="venues-list">
                  {venues.map(venue => <option key={venue.Id} value={venue.Name} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label>Ukupan budžet (€)</label>
                <input type="number" placeholder="Npr. 5000" required value={newEvent.totalBudget} onChange={(e) => setNewEvent({...newEvent, totalBudget: e.target.value})}/>
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