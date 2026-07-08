import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'stats';
  const categoryParam = searchParams.get('category');
  const vendorCategory = categoryParam === null || categoryParam === 'Sve' ? 'Sve' : Number(categoryParam);
  
  const [stats, setStats] = useState({ ukupnoKorisnika: 0, ukupnoDogadjaja: 0, ukupnoVendora: 0 });
  const [usersList, setUsersList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [allEventsList, setAllEventsList] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [showAddForm, setShowAddForm] = useState(false);
  const [vendorData, setVendorData] = useState({ CategoryID: '', Name: '', Contact: '', BasePrice: '' });
  const [slika, setSlika] = useState(null);

  const [editRowId, setEditRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({ CategoryID: '', Name: '', Contact: '', BasePrice: '' });
  const [editFile, setEditFile] = useState(null);

  const fetchAllAdminData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [statsRes, usersRes, vendorsRes, eventsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/vendors', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/admin/events', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setStats(statsRes.data);
      setUsersList(usersRes.data);
      setVendorsList(vendorsRes.data);
      setAllEventsList(eventsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Greška pri učitavanju admin podataka:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const roleId = localStorage.getItem('roleId');

    if (!token || Number(roleId) !== 1) {
      navigate('/login');
      return;
    }

    fetchAllAdminData();
  }, [navigate]);

  // =========================================================================
  // NOVO: Funkcija za brisanje korisnika (sa svim njegovim događajima)
  // =========================================================================
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Da li ste sigurni da želite obrisati ovog korisnika? Oprez: Svi njegovi događaji, gosti i troškovi će takođe biti trajno izbrisani!')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Korisnik i svi njegovi podaci su uspješno obrisani!');
      setUsersList(usersList.filter(user => user.Id !== userId));
      setStats(prev => ({ ...prev, ukupnoKorisnika: prev.ukupnoKorisnika - 1 }));
      
      // Osvježavamo događaje jer su obrisani i korisnikovi događaji
      fetchAllAdminData(); 
    } catch (error) {
      console.error('Greška pri brisanju korisnika:', error);
      if(error.response?.data?.poruka) {
        alert(error.response.data.poruka);
      } else {
        alert('Došlo je do greške pri brisanju korisnika.');
      }
    }
  };

  const handleEditClick = (vendor) => {
    setEditRowId(vendor.Id);
    setEditFormData({
      CategoryID: vendor.CategoryID,
      Name: vendor.Name,
      Contact: vendor.Contact,
      BasePrice: vendor.BasePrice
    });
    setEditFile(null); 
  };

  const cancelEdit = () => {
    setEditRowId(null);
    setEditFormData({ CategoryID: '', Name: '', Contact: '', BasePrice: '' });
    setEditFile(null);
  };

  const handleSaveInline = async (id) => {
    try {
      const token = localStorage.getItem('token');
      let imagePath = '';

      if (editFile) {
        const formData = new FormData();
        formData.append('slika', editFile);
        const uploadResponse = await axios.post('http://localhost:5000/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
        });
        imagePath = uploadResponse.data.ImagePath;
      }

      const payload = {
        CategoryID: editFormData.CategoryID,
        Name: editFormData.Name,
        Contact: editFormData.Contact,
        BasePrice: editFormData.BasePrice
      };
      if (imagePath) payload.ImagePath = imagePath;

      await axios.put(`http://localhost:5000/api/admin/vendors/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Podaci o vendoru uspješno izmijenjeni!');
      await fetchAllAdminData();
      cancelEdit(); 
    } catch (error) {
      console.error('Greška:', error);
      alert('Došlo je do greške prilikom izmjene vendora.');
    }
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovog vendora?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/vendors/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Vendor uspješno obrisan!');
      setVendorsList(vendorsList.filter(vendor => vendor.Id !== id));
      setStats(prev => ({ ...prev, ukupnoVendora: prev.ukupnoVendora - 1 }));
    } catch (error) {
      console.error('Greška pri brisanju vendora:', error);
      alert('Došlo je do greške pri brisanju vendora.');
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
  
    if (!slika) {
      alert('Slika za novog vendora je obavezna!');
      return;
    }
  
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('slika', slika);
  
      const uploadResponse = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
      });
      const imagePath = uploadResponse.data.ImagePath;
  
      await axios.post('http://localhost:5000/api/vendors', {
        CategoryID: vendorData.CategoryID,
        Name: vendorData.Name,
        Contact: vendorData.Contact,
        BasePrice: vendorData.BasePrice,
        ImagePath: imagePath 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Vendor uspješno dodat!');
      await fetchAllAdminData();
      resetujFormu();
  
    } catch (error) {
      console.error('Greška:', error);
      alert('Došlo je do greške prilikom obrade podataka.');
    }
  };

  const resetujFormu = () => {
    setVendorData({ CategoryID: '', Name: '', Contact: '', BasePrice: '' });
    setSlika(null);
    setShowAddForm(false);
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

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('me-ME', options);
  };

  const filtriraniVendori = vendorCategory === 'Sve' 
    ? vendorsList 
    : vendorsList.filter((vendor) => Number(vendor.CategoryID) === vendorCategory);

  const countVendors = (categoryId) => vendorsList.filter(v => Number(v.CategoryID) === categoryId).length;

  if (loading) {
    return (
      <div className="dashboard-container admin-loading">
        <h2 className="admin-loading-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M4.93 4.93l2.83 2.83"></path><path d="M16.24 16.24l2.83 2.83"></path><path d="M2 12h4"></path><path d="M18 12h4"></path><path d="M4.93 19.07l2.83-2.83"></path><path d="M16.24 7.76l2.83-2.83"></path></svg>
          Učitavanje admin panela...
        </h2>
      </div>
    );
  }

  const DugmeNazad = () => (
    <button className="btn-back" onClick={() => setSearchParams({ tab: 'stats' })}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Nazad na statistiku
    </button>
  );

  return (
    <div className="dashboard-container admin-wrapper">
      
      <div className="admin-header">
        <h1 className="admin-title">Admin panel</h1>
        <p className="admin-subtitle">Pregled i upravljanje EventDreamer sistemom.</p>
      </div>

      <div className="category-tabs admin-tabs-container">
        <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'stats' })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'middle'}}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          Statistika
        </button>
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'users' })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'middle'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Svi korisnici
        </button>
        <button className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'events' })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'middle'}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Svi događaji
        </button>
        <button className={`tab-btn ${activeTab === 'vendors' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 'Sve' })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'middle'}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Vendori
        </button>
      </div>

      {activeTab === 'stats' && (
        <div className="fade-in">
          <div className="admin-grid-main">
            <div className="admin-stat-card pink-top" onClick={() => setSearchParams({ tab: 'users' })}>
              <div className="admin-icon-circle pink">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <h3 className="admin-stat-label">Ukupno korisnika</h3>
              <p className="admin-stat-number">{stats.ukupnoKorisnika}</p>
            </div>

            <div className="admin-stat-card green-top" onClick={() => setSearchParams({ tab: 'events' })}>
              <div className="admin-icon-circle green">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path></svg>
              </div>
              <h3 className="admin-stat-label">Kreiranih događaja</h3>
              <p className="admin-stat-number">{stats.ukupnoDogadjaja}</p>
            </div>
          </div>

          <h2 className="admin-section-title">Pregled usluga i vendora</h2>
          
          <div className="admin-grid-secondary">
            <div className="admin-vendor-card" onClick={() => setSearchParams({ tab: 'vendors', category: 1 })}>
              <div className="admin-vendor-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"></path><path d="M5 21v-4"></path><path d="M19 21v-4"></path><path d="M3 7v10c0 2.2 1.8 4 4 4h10c2.2 0 4-1.8 4-4V7"></path><path d="M9 21v-4"></path><path d="M15 21v-4"></path><path d="M3 7l9-4 9 4"></path></svg></div>
              <h4 className="admin-vendor-label">Sale / restorani</h4>
              <p className="admin-vendor-number">{countVendors(1)}</p>
            </div>
            <div className="admin-vendor-card" onClick={() => setSearchParams({ tab: 'vendors', category: 2 })}>
              <div className="admin-vendor-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div>
              <h4 className="admin-vendor-label">Fotografi</h4>
              <p className="admin-vendor-number">{countVendors(2)}</p>
            </div>
            <div className="admin-vendor-card" onClick={() => setSearchParams({ tab: 'vendors', category: 3 })}>
              <div className="admin-vendor-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>
              <h4 className="admin-vendor-label">Muzika</h4>
              <p className="admin-vendor-number">{countVendors(3)}</p>
            </div>
            <div className="admin-vendor-card" onClick={() => setSearchParams({ tab: 'vendors', category: 4 })}>
              <div className="admin-vendor-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg></div>
              <h4 className="admin-vendor-label">Dekoracija</h4>
              <p className="admin-vendor-number">{countVendors(4)}</p>
            </div>
            <div className="admin-vendor-card" onClick={() => setSearchParams({ tab: 'vendors', category: 5 })}>
              <div className="admin-vendor-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"></path><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2-1 2-1"></path><path d="M2 21h20"></path><path d="M7 8v2"></path><path d="M12 8v2"></path><path d="M17 8v2"></path><path d="M7 4h.01"></path><path d="M12 4h.01"></path><path d="M17 4h.01"></path></svg></div>
              <h4 className="admin-vendor-label">Torte</h4>
              <p className="admin-vendor-number">{countVendors(5)}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="fade-in">
          <DugmeNazad />
          <h2 className="admin-table-title">Spisak registrovanih korisnika</h2>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ime i prezime</th>
                  <th>Email adresa</th>
                  <th>Uloga u sistemu</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length > 0 ? usersList.map((user) => (
                  <tr key={user.Id}>
                    <td data-label="ID" className="td-id">#{user.Id}</td>
                    <td data-label="Ime i prezime" className="td-bold-dark">{user.FirstName} {user.LastName}</td>
                    <td data-label="Email adresa" className="td-gray">{user.Email}</td>
                    <td data-label="Uloga">
                      {user.RoleId === 1 ? (
                        <span className="admin-badge badge-admin admin-badge-flex">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                          </svg>
                          Admin
                        </span>
                      ) : (
                        <span className="admin-badge badge-user admin-badge-flex">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                          Korisnik
                        </span>
                      )}
                    </td>
                    <td data-label="Akcije" className="td-actions">
                      {user.RoleId !== 1 && (
                        <button 
                          className="logout-btn btn-delete-action" 
                          onClick={() => handleDeleteUser(user.Id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          title="Obriši korisnika i njegove događaje"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          Obriši
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="td-first empty-table-row">Nema registrovanih korisnika.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="fade-in">
          <DugmeNazad />
          <h2 className="admin-table-title">Svi kreirani događaji</h2>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Naziv događaja</th>
                  <th>Datum</th>
                  <th>Lokacija</th>
                  <th>Budžet</th>
                  <th>Kreator</th>
                </tr>
              </thead>
              <tbody>
                {allEventsList.length > 0 ? allEventsList.map((ev) => (
                  <tr key={ev.Id}>
                    <td data-label="Naziv događaja" className="td-bold-dark">{ev.Title}</td>
                    <td data-label="Datum" className="td-date">
                      <span className="badge-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px', verticalAlign: 'middle'}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        {formatDate(ev.Date)}
                      </span>
                    </td>
                    <td data-label="Lokacija" className="td-gray">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px', verticalAlign: 'middle'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      {ev.Location}
                    </td>
                    <td data-label="Budžet">
                      <span className="badge-budget">{ev.TotalBudget} €</span>
                    </td>
                    <td data-label="Kreator">
                      <div className="user-info-group">
                        <span className="user-name">{ev.FirstName} {ev.LastName}</span>
                        <span className="user-email">{ev.Email}</span>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="td-first empty-table-row">Trenutno nema kreiranih događaja u sistemu.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'vendors' && (
        <div className="fade-in">
          <DugmeNazad />
          
          <div className="vendor-filter-header">
            <h2 className="admin-table-title">Svi vendori</h2>
            <button 
              className="modern-btn btn-add-vendor" 
              onClick={() => {
                if (showAddForm) resetujFormu();
                else setShowAddForm(true);
              }}
            >
              {showAddForm ? 'Odustani' : '+ Dodaj vendora'}
            </button>
          </div>

          {showAddForm && (
            <div className="admin-form-overlay fade-in">
              <div className="admin-form-card">
                <div className="admin-form-header">
                  <h3>Dodaj novog vendora</h3>
                </div>
                
                <form onSubmit={handleAddVendor} className="admin-grid-form">
                  <div className="input-group">
                    <label>Naziv vendora</label>
                    <input type="text" placeholder="Npr. Imanje Knjaz" value={vendorData.Name} onChange={(e) => setVendorData({...vendorData, Name: e.target.value})} required />
                  </div>

                  <div className="input-group">
                    <label>Kategorija</label>
                    <select value={vendorData.CategoryID} onChange={(e) => setVendorData({...vendorData, CategoryID: e.target.value})} required className="modern-select">
                      <option value="" disabled>Izaberite kategoriju...</option>
                      <option value="1">Sala / restoran</option>
                      <option value="2">Fotograf</option>
                      <option value="3">Muzika / bend</option>
                      <option value="4">Dekoracija</option>
                      <option value="5">Torte i slatkiši</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Kontakt</label>
                    <input type="text" placeholder="Broj telefona ili Email" value={vendorData.Contact} onChange={(e) => setVendorData({...vendorData, Contact: e.target.value})} required />
                  </div>

                  <div className="input-group">
                    <label>Početna cijena (€)</label>
                    <input type="number" placeholder="Npr. 500" value={vendorData.BasePrice} onChange={(e) => setVendorData({...vendorData, BasePrice: e.target.value})} required />
                  </div>

                  <div className="input-group full-width">
                    <label>Slika vendora</label>
                    <div className="file-upload-wrapper">
                      <input type="file" id="file-upload" accept="image/*" onChange={(e) => setSlika(e.target.files[0])} required />
                      <label htmlFor="file-upload" className="file-upload-label">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        {slika ? slika.name : 'Kliknite da izaberete sliku sa uređaja'}
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="auth-btn full-width mt-10">
                    Sačuvaj vendora u bazu
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="vendor-filter-group vendor-filter-group-spaced">
            <button className={`tab-btn filter-btn-small ${vendorCategory === 'Sve' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 'Sve' })}>Sve</button>
            <button className={`tab-btn filter-btn-small ${vendorCategory === 1 ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 1 })}>Sale / restorani</button>
            <button className={`tab-btn filter-btn-small ${vendorCategory === 2 ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 2 })}>Fotografi</button>
            <button className={`tab-btn filter-btn-small ${vendorCategory === 3 ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 3 })}>Muzika</button>
            <button className={`tab-btn filter-btn-small ${vendorCategory === 4 ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 4 })}>Dekoracija</button>
            <button className={`tab-btn filter-btn-small ${vendorCategory === 5 ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 5 })}>Torte</button>
          </div>
          
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Naziv vendora</th>
                  <th>Kategorija</th>
                  <th>Kontakt</th>
                  <th>Početna cijena</th>
                  <th className="td-actions">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filtriraniVendori.length > 0 ? filtriraniVendori.map((vendor) => {
                  
                  // prikaz inputa ako je ovo red koji treba da izmijenimo
                  if (editRowId === vendor.Id) {
                    return (
                      <tr key={vendor.Id} className="edit-row-active">
                        <td data-label="Naziv vendora">
                          <input type="text" value={editFormData.Name} onChange={(e) => setEditFormData({...editFormData, Name: e.target.value})} className="modern-select inline-edit-input" />
                        </td>
                        <td data-label="Kategorija">
                          <select value={editFormData.CategoryID} onChange={(e) => setEditFormData({...editFormData, CategoryID: e.target.value})} className="modern-select inline-edit-input">
                            <option value="1">Sala / restoran</option>
                            <option value="2">Fotograf</option>
                            <option value="3">Muzika / bend</option>
                            <option value="4">Dekoracija</option>
                            <option value="5">Torte i slatkiši</option>
                          </select>
                        </td>
                        <td data-label="Kontakt">
                          <input type="text" value={editFormData.Contact} onChange={(e) => setEditFormData({...editFormData, Contact: e.target.value})} className="modern-select inline-edit-input" />
                        </td>
                        <td data-label="Početna cijena">
                          <input type="number" value={editFormData.BasePrice} onChange={(e) => setEditFormData({...editFormData, BasePrice: e.target.value})} className="modern-select inline-edit-input-small" />
                        </td>
                        <td data-label="Akcije" className="td-actions">
                          <div className="action-buttons-col">
                            <div className="action-buttons-row">
                              <button onClick={() => handleSaveInline(vendor.Id)} className="logout-btn btn-save-inline" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Sačuvaj
                              </button>
                              <button onClick={cancelEdit} className="logout-btn btn-cancel-inline" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                Odustani
                              </button>
                            </div>
                            <label className="inline-image-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                               <input type="file" style={{display: 'none'}} accept="image/*" onChange={(e) => setEditFile(e.target.files[0])}/>
                               {editFile ? (
                                 <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#137333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Slika dodata</>
                               ) : (
                                 <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Promijeni sliku</>
                               )}
                            </label>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  // ako ne mijenjamo da se prikaze tekst
                  return (
                    <tr key={vendor.Id}>
                      <td data-label="Naziv vendora" className="td-bold-dark">{vendor.Name}</td>
                      <td data-label="Kategorija">
                        <span className="badge-category">{getNazivKategorije(vendor.CategoryID)}</span>
                      </td>
                      <td data-label="Kontakt" className="td-gray">{vendor.Contact}</td>
                      <td data-label="Početna cijena" className="td-price">
                         <span className="price-tag">{vendor.BasePrice} €</span>
                      </td>
                      <td data-label="Akcije" className="td-actions">
                        <div className="action-buttons-row">
                          <button className="logout-btn btn-edit-action" onClick={() => handleEditClick(vendor)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            Izmijeni
                          </button>
                          <button className="logout-btn btn-delete-action" onClick={() => handleDeleteVendor(vendor.Id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Obriši
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan="5" className="td-first empty-table-row">Nema vendora u odabranoj kategoriji.</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}

export default Admin;