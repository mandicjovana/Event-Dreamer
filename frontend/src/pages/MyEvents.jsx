import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedEvent, setSelectedEvent] = useState(null); 
  // stanje koje čuva radnu kopiju događaja dok je modal otvoren
  const [draftEvent, setDraftEvent] = useState(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eventTypes, setEventTypes] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    eventTypeId: '',
    date: '',
    totalBudget: ''
  });

  const [inputTaskName, setInputTaskName] = useState('');
  const [inputGuestFirst, setInputGuestFirst] = useState('');
  const [inputGuestLast, setInputGuestLast] = useState('');

  const navigate = useNavigate();

  const fetchAllData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const roleId = localStorage.getItem('roleId');
    if (Number(roleId) === 1) {
      window.alert('Pristup odbijen! Administratori nemaju pristup korisničkim stranicama.');
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

      // ako je modal otvoren nakon snimanja, osvježavamo original
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
    e.preventDefault();//zaustavlja refresovanje i preuyima kontrolu nad podacima 
    const token = localStorage.getItem('token');
    try {
      await axios.post('http://localhost:5000/api/events', newEvent, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Događaj je uspješno kreiran!');
      setIsCreateModalOpen(false);
      fetchAllData();
    } catch (err) {
      console.error(err);
      alert('Greška pri kreiranju događaja.');
    }
  };
  const handleDeleteEvent = async (eventId, e) => {
    e.stopPropagation(); // sprečava da se otvori modal kada kliknemo na dugme
    const isConfirmed = window.confirm("Da li ste sigurni da želite trajno da obrišete ovaj događaj? Svi gosti, zadaci i troškovi će biti izbrisani!");
    
    if (!isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Događaj je uspješno obrisan!');
      fetchAllData(); // osvježavamo prikaz da kartica nestane
    } catch (err) {
      console.error(err);
      alert('Došlo je do greške pri brisanju događaja.');
    }
  };

  // lokalne funkcije za modal

  const handleToggleTaskLocal = (taskId) => {
    setDraftEvent(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.Id === taskId ? { ...t, IsCompleted: !t.IsCompleted } : t)
    }));
  };

  const handleUpdateGuestFieldLocal = (guestId, field, value) => {
    setDraftEvent(prev => ({
      ...prev,
      guests: prev.guests.map(g => g.Id === guestId ? { ...g, [field]: value } : g)
    }));
  };

  const handleToggleExpensePaidLocal = (expenseId, currentStatus) => {
    setDraftEvent(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.Id === expenseId ? { ...e, IsPaid: !currentStatus } : e)
    }));
  };

  const handleUpdateGuestsCountLocal = (expense) => {
    const unos = window.prompt("Unesite konačan broj gostiju:");
    if (!unos) return; 

    const noviBroj = parseInt(unos, 10);
    if (isNaN(noviBroj) || noviBroj <= 0) {
      alert('Molimo unesite validan broj veći od nule.');
      return;
    }

    const match = expense.ExpenseName.match(/- ([\d.]+) € po osobi/);
    if (!match) {
      alert('Nije moguće izmijeniti goste za ovu uslugu.');
      return;
    }

    const cijenaPoOsobi = parseFloat(match[1]);
    const novaUkupnaCijena = cijenaPoOsobi * noviBroj;
    const stariOpis = expense.ExpenseName;
    const noviOpis = stariOpis.replace(/za \d+ osoba/, `za ${noviBroj} osoba`);

    setDraftEvent(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.Id === expense.Id ? { ...e, ActualAmount: novaUkupnaCijena, ExpenseName: noviOpis } : e)
    }));
  };

  const handleAddTaskLocal = (e) => {
    e.preventDefault();
    if (!inputTaskName.trim()) return;
    
    const newTask = {
      Id: `temp-${Date.now()}`, 
      TaskName: inputTaskName,
      IsCompleted: false,
      isNew: true 
    };

    setDraftEvent(prev => ({ ...prev, tasks: [...(prev.tasks || []), newTask] }));
    setInputTaskName('');
  };

  const handleAddGuestLocal = (e) => {
    e.preventDefault();
    if (!inputGuestFirst.trim() || !inputGuestLast.trim()) return;
    
    const newGuest = {
      Id: `temp-${Date.now()}`,
      FirstName: inputGuestFirst,
      LastName: inputGuestLast,
      RSVPStatus: 'Na čekanju',
      isNew: true 
    };

    setDraftEvent(prev => ({ ...prev, guests: [...(prev.guests || []), newGuest] }));
    setInputGuestFirst('');
    setInputGuestLast('');
  };

  // cuvanje svih promjena odjednom na server
  const handleSaveChanges = async () => {
    const token = localStorage.getItem('token');
    const promises = [];

    // cuvamo zadatke
    draftEvent.tasks?.forEach(draftTask => {
      if (draftTask.isNew) {
        promises.push(axios.post('http://localhost:5000/api/tasks', { eventId: draftEvent.Id, taskName: draftTask.TaskName }, { headers: { Authorization: `Bearer ${token}` } }));
      } else {
        const origTask = selectedEvent.tasks.find(t => t.Id === draftTask.Id);
        if (origTask && origTask.IsCompleted !== draftTask.IsCompleted) {
          promises.push(axios.put(`http://localhost:5000/api/tasks/${draftTask.Id}/toggle`, { isCompleted: draftTask.IsCompleted }, { headers: { Authorization: `Bearer ${token}` } }));
        }
      }
    });

    // cuvamo goste
    draftEvent.guests?.forEach(draftGuest => {
      if (draftGuest.isNew) {
        promises.push(axios.post('http://localhost:5000/api/guests', { 
          eventId: draftEvent.Id, 
          firstName: draftGuest.FirstName, 
          lastName: draftGuest.LastName, 
          rsvpStatus: draftGuest.RSVPStatus,
          tableNumber: draftGuest.RSVPStatus === 'Potvrdio' ? draftGuest.TableNumber : null,
          dietaryRequirement: draftGuest.RSVPStatus === 'Potvrdio' ? draftGuest.RequirementType : 'Nema'
        }, { headers: { Authorization: `Bearer ${token}` } }));
      } else {
        const origGuest = selectedEvent.guests.find(g => g.Id === draftGuest.Id);
        if (origGuest && (origGuest.RSVPStatus !== draftGuest.RSVPStatus || origGuest.TableNumber !== draftGuest.TableNumber || origGuest.RequirementType !== draftGuest.RequirementType)) {
          promises.push(axios.put(`http://localhost:5000/api/guests/${draftGuest.Id}/update`, { 
            rsvpStatus: draftGuest.RSVPStatus,
            tableNumber: draftGuest.RSVPStatus === 'Potvrdio' ? draftGuest.TableNumber : null,
            dietaryRequirement: draftGuest.RSVPStatus === 'Potvrdio' ? draftGuest.RequirementType : 'Nema'
          }, { headers: { Authorization: `Bearer ${token}` } }));
        }
      }
    });

    // cuvamo troškove/vendore
    draftEvent.expenses?.forEach(draftExp => {
      const origExp = selectedEvent.expenses.find(e => e.Id === draftExp.Id);
      if (origExp) {
        if (origExp.IsPaid !== draftExp.IsPaid) {
          promises.push(axios.put(`http://localhost:5000/api/expenses/${draftExp.Id}/paid`, { isPaid: draftExp.IsPaid }, { headers: { Authorization: `Bearer ${token}` } }));
        }
        if (origExp.ActualAmount !== draftExp.ActualAmount) {
          promises.push(axios.put(`http://localhost:5000/api/expenses/${draftExp.Id}/update-guests`, { eventId: draftEvent.Id, newAmount: draftExp.ActualAmount, newExpenseName: draftExp.ExpenseName }, { headers: { Authorization: `Bearer ${token}` } }));
        }
      }
    });

    try {
      setLoading(true); 
      await Promise.all(promises); 
      alert('Sve promjene su uspješno sačuvane!');
      setSelectedEvent(null);
      setDraftEvent(null);
      fetchAllData();
    } catch (err) {
      console.error(err);
      alert('Došlo je do greške pri čuvanju promjena.');
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    const isConfirmed = window.confirm("Da li ste sigurni da želite da zatvorite? Sve nesačuvane promjene biće izgubljene.");
    if (isConfirmed) {
      setSelectedEvent(null);
      setDraftEvent(null);
    }
  };
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('me-ME', options);
  };

  if (loading) return <div className="dashboard-container"><h2>Učitavanje tvojih događaja... </h2></div>;
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
            
            let rezervisaniVendori = 'Još uvijek nema rezervacija';
            if (event.expenses && event.expenses.length > 0) {
              const ostaliVendori = event.expenses
                .map(e => e.VendorName || "Nepoznat vendor")
                .filter(imeVendora => !event.Location.includes(imeVendora)); 
              
              if (ostaliVendori.length > 0) {
                rezervisaniVendori = ostaliVendori.join(', ');
              } else {
                rezervisaniVendori = 'Za sada rezervisana samo lokacija';
              }
            }

            return (
              <div key={event.Id} className="event-glass-card">
               <div className="event-header" style={{ position: 'relative' }}>
                  
                  {/*dugme za brisanje dogadjaja */}
                  <button 
                    onClick={(e) => handleDeleteEvent(event.Id, e)}
                    style={{ position: 'absolute', top: '0', right: '0', background: 'rgba(197, 34, 31, 0.1)', color: '#F6DEEA', border: '1px solid rgba(197, 34, 31, 0.3)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold', transition: 'all 0.3s ease' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#BCC5AA'; e.currentTarget.style.color = '#fff'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(197, 34, 31, 0.1)'; e.currentTarget.style.color = '#F6DEEA'; }}
                    title="Obriši događaj trajno"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Obriši
                  </button>

                  <h2 style={{ paddingRight: '80px' }}>{event.Title}</h2>
                  <span className="event-date">
                    <svg style={{marginRight: '5px', verticalAlign: 'middle'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    {formatDate(event.Date)}
                  </span>
                  <span className="event-location">
                    <svg style={{marginRight: '5px', verticalAlign: 'middle'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    {event.Location}
                  </span>
                  <span className="event-location" style={{ marginTop: '10px', color: '#137333', fontWeight: '600' }}>
                    <svg style={{marginRight: '5px', verticalAlign: 'middle'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> 
                    Rezervisano: <span style={{ color: '#444', fontWeight: '500' }}>{rezervisaniVendori}</span>
                  </span>
                </div>

                <div className="event-stats">
                  <div className="stat-box">
                    <h4>Budžet</h4>
                    <p className="stat-numbers">{potroseno} € <span className="stat-total">/ {event.TotalBudget} €</span></p>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill pink-fill" 
                        style={{ width: `${Math.min((potroseno / event.TotalBudget) * 100, 100)}%`, fontSize: '10px', color: '#111', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: potroseno > 0 ? '20px' : '0' }}
                      >
                        {event.TotalBudget > 0 ? `${Math.round((potroseno / event.TotalBudget) * 100)}%` : '0%'}
                      </div>
                    </div>
                  </div>

                  <div className="stat-box">
                    <h4>Zadaci</h4>
                    <p className="stat-numbers">{zavrseniZadaci} <span className="stat-total">/ {ukupnoZadataka}</span></p>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill green-fill" style={{ width: `${ukupnoZadataka > 0 ? (zavrseniZadaci / ukupnoZadataka) * 100 : 0}%`, fontSize: '10px', color: '#111', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: zavrseniZadaci > 0 ? '20px' : '0' }}>
                        {ukupnoZadataka > 0 ? `${Math.round((zavrseniZadaci / ukupnoZadataka) * 100)}%` : '0%'}
                      </div>
                    </div>
                  </div>

                  <div className="stat-box">
                    <h4>Gosti</h4>
                    <p className="stat-numbers">{potvrdiliGosti} <span className="stat-total">/ {ukupnoGostiju}</span></p>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${ukupnoGostiju > 0 ? (potvrdiliGosti / ukupnoGostiju) * 100 : 0}%`, background: 'var(--logo-pink)', fontSize: '10px', color: '#111', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: potvrdiliGosti > 0 ? '20px' : '0' }}>
                        {ukupnoGostiju > 0 ? `${Math.round((potvrdiliGosti / ukupnoGostiju) * 100)}%` : '0%'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* otvaranje modala sada pravi duboku kopiju događaja i pamti UI stanje za goste */}
                <button className="details-btn" onClick={() => { 
                  setSelectedEvent(event); 
                  const draftCopy = JSON.parse(JSON.stringify(event)); 
                  if(draftCopy.guests) {
                    draftCopy.guests = draftCopy.guests.map(g => ({...g, detailsConfirmed: g.RSVPStatus === 'Potvrdio'}));
                  }
                  setDraftEvent(draftCopy);
                }}>Prikaži detalje</button>
              </div>
            );
          })
        )}
      </div>

      {draftEvent && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" style={{ maxWidth: '1050px', width: '95%', padding: '45px' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={handleCloseModal}>✖</button>
            
            <h2 style={{ borderBottom: '2px solid rgba(0,0,0,0.05)', paddingBottom: '15px', marginBottom: '25px', fontSize: '1.7rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              {draftEvent.Title} - Detaljna organizacija
            </h2>
            
            <div className="modal-sections" style={{ gap: '40px' }}>
              
              <div className="modal-section" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    To-Do Lista
                  </h3>
                  <ul style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                    {draftEvent.tasks && draftEvent.tasks.length > 0 ? draftEvent.tasks.map(task => (
                      <li key={task.Id} onClick={() => handleToggleTaskLocal(task.Id)} style={{ textDecoration: task.IsCompleted ? 'line-through' : 'none', color: task.IsCompleted ? '#777' : '#111', cursor: 'pointer', padding: '8px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
                          {task.IsCompleted ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#137333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                          )}
                        </span> 
                        {task.TaskName}
                      </li>
                    )) : <li>Nema dodatih zadataka.</li>}
                  </ul>
                </div>
                <form onSubmit={handleAddTaskLocal} style={{ display: 'flex', gap: '5px', width: '100%', marginTop: 'auto' }}>
                  <input type="text" placeholder="Novi zadatak..." value={inputTaskName} onChange={(e) => setInputTaskName(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.9rem', flex: 1, minWidth: '0', boxSizing: 'border-box' }}/>
                  <button type="submit" style={{ padding: '10px 15px', background: 'var(--logo-green)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>+</button>
                </form>
              </div>

              <div className="modal-section" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Lista Gostiju
                  </h3>
                  <ul style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                    {draftEvent.guests && draftEvent.guests.length > 0 ? draftEvent.guests.map(guest => (
                      <li key={guest.Id} style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', borderBottom: '1px dashed rgba(0,0,0,0.05)' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: '500', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            {guest.FirstName} {guest.LastName}
                            
                            {guest.RSVPStatus === 'Potvrdio' && guest.TableNumber && <span style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>(Sto #{guest.TableNumber})</span>}
                            {guest.RSVPStatus === 'Potvrdio' && guest.RequirementType && guest.RequirementType !== 'Nema' && (
                              <span style={{ fontSize: '0.85rem', color: '#c5221f', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>
                                {guest.RequirementType}
                              </span>
                            )}

                            {guest.RSVPStatus === 'Potvrdio' && guest.detailsConfirmed && (
                              <button 
                                onClick={() => handleUpdateGuestFieldLocal(guest.Id, 'detailsConfirmed', false)} 
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center', marginLeft: '2px', transition: 'color 0.2s' }} 
                                title="Izmijeni detalje o stolu i ishrani"
                                onMouseOver={(e) => e.currentTarget.style.color = '#111'}
                                onMouseOut={(e) => e.currentTarget.style.color = '#666'}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                              </button>
                            )}
                          </span>

                          <select 
                            value={guest.RSVPStatus || 'Na čekanju'} 
                            onChange={(e) => {
                              handleUpdateGuestFieldLocal(guest.Id, 'RSVPStatus', e.target.value);
                              if(e.target.value === 'Potvrdio') {
                                handleUpdateGuestFieldLocal(guest.Id, 'detailsConfirmed', false);
                              }
                            }} 
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', background: guest.RSVPStatus === 'Potvrdio' ? '#e6f4ea' : guest.RSVPStatus === 'Odbio' ? '#fce8e6' : '#fff', color: guest.RSVPStatus === 'Potvrdio' ? '#137333' : guest.RSVPStatus === 'Odbio' ? '#c5221f' : '#333' }}
                          >
                            <option value="Na čekanju">Čekanje</option>
                            <option value="Potvrdio">Dolazi</option>
                            <option value="Odbio">Ne dolazi</option>
                          </select>
                        </div>

                        {guest.RSVPStatus === 'Potvrdio' && !guest.detailsConfirmed && (
                          <div className="fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', background: 'rgba(188, 197, 170, 0.15)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(188, 197, 170, 0.5)', alignItems: 'center' }}>
                            <input 
                              type="number" 
                              placeholder="Sto br." 
                              value={guest.TableNumber || ''} 
                              onChange={(e) => handleUpdateGuestFieldLocal(guest.Id, 'TableNumber', e.target.value)} 
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', width: '80px', fontSize: '0.85rem' }} 
                              min="1"
                            />
                            <select 
                              value={guest.RequirementType || 'Nema'} 
                              onChange={(e) => handleUpdateGuestFieldLocal(guest.Id, 'RequirementType', e.target.value)} 
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', flex: 1, minWidth: '150px', fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                              <option value="Nema">Bez posebnih zahtjeva</option>
                              <option value="Vegetarijanac">Vegetarijanac</option>
                              <option value="Vegan">Vegan</option>
                              <option value="Bez glutena">Bez glutena</option>
                              <option value="Alergija na orašaste plodove">Alergija na orašaste plodove</option>
                            </select>
                            
                            <button 
                              onClick={() => handleUpdateGuestFieldLocal(guest.Id, 'detailsConfirmed', true)}
                              style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: 'var(--logo-green)', color: '#111', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.3s ease' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              Potvrdi
                            </button>
                          </div>
                        )}
                      </li>
                    )) : <li>Nema gostiju.</li>}
                  </ul>
                </div>

                <form onSubmit={handleAddGuestLocal} style={{ display: 'flex', gap: '8px', flexDirection: 'column', width: '100%', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <input type="text" placeholder="Ime..." value={inputGuestFirst} onChange={(e) => setInputGuestFirst(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.9rem', flex: 1, minWidth: '0', boxSizing: 'border-box' }}/>
                    <input type="text" placeholder="Prezime..." value={inputGuestLast} onChange={(e) => setInputGuestLast(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.9rem', flex: 1, minWidth: '0', boxSizing: 'border-box' }}/>
                  </div>
                  <button type="submit" style={{ padding: '10px', background: 'var(--logo-green)', color: '#111', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '5px', transition: 'all 0.3s ease' }}>
                    + Dodaj gosta
                  </button>
                </form>
              </div>

              <div className="modal-section" style={{ minHeight: '350px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"></path><path d="M5 21v-4"></path><path d="M19 21v-4"></path><path d="M3 7v10c0 2.2 1.8 4 4 4h10c2.2 0 4-1.8 4-4V7"></path><path d="M9 21v-4"></path><path d="M15 21v-4"></path><path d="M3 7l9-4 9 4"></path></svg>
                  Rezervisani Vendori
                </h3>
                <ul style={{ maxHeight: '310px', overflowY: 'auto', paddingRight: '5px' }}>
                  {draftEvent.expenses && draftEvent.expenses.length > 0 ? draftEvent.expenses.map(expense => {
                    const mozeSeMijenjati = expense.ExpenseName.includes('po osobi');

                    return (
                    <li key={expense.Id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: '700', fontSize: '1.05rem', color: '#111' }}>
                          {expense.VendorName || 'Nepoznat vendor'}
                        </span>
                        
                        <span style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {expense.ExpenseName.replace('Angažovanje: ', '')}
                          {mozeSeMijenjati && (
                            <button 
                              onClick={() => handleUpdateGuestsCountLocal(expense)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }} 
                              title="Izmijeni konačan broj gostiju"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                          )}
                        </span>
                        
                        <span style={{ fontSize: '0.95rem', color: '#333', fontWeight: '500' }}>
                          Iznos: {expense.ActualAmount} €
                        </span>
                      </div>
                      <select value={expense.IsPaid ? "1" : "0"} onChange={() => handleToggleExpensePaidLocal(expense.Id, expense.IsPaid)} style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', background: expense.IsPaid ? '#e6f4ea' : '#fce8e6', color: expense.IsPaid ? '#137333' : '#c5221f' }}>
                        <option value="1">Plaćeno</option>
                        <option value="0">Nije plaćeno</option>
                      </select>
                    </li>
                  )}) : <li>Još uvijek nema rezervisanih vendora. Opcija zakazivanja se nalazi na Dashboardu!</li>}
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '35px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '20px' }}>
              <button className="create-event-btn" style={{ background: 'var(--logo-pink)', color: '#111', padding: '14px 45px', fontSize: '1.05rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} onClick={handleSaveChanges}>
                ✔ Završi pregled i sačuvaj
              </button>
            </div>
          </div>
        </div>
      )}

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