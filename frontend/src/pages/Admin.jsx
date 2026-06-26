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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const roleId = localStorage.getItem('roleId');

    if (!token || Number(roleId) !== 1) {
      navigate('/login');
      return;
    }

    const fetchAllAdminData = async () => {
      try {
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

    fetchAllAdminData();
  }, [navigate]);

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
        <h2 className="admin-loading-title">Učitavanje admin panela... ⚙️</h2>
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
        <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'stats' })}>📊 Statistika</button>
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'users' })}>👥 Svi korisnici</button>
        <button className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'events' })}>🎉 Svi događaji</button>
        <button className={`tab-btn ${activeTab === 'vendors' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 'Sve' })}>🏪 Vendori</button>
      </div>

      {/* za statistiku */}
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
              <div className="admin-vendor-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"></path><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4-2 2-1 2-1"></path><path d="M2 21h20"></path><path d="M7 8v2"></path><path d="M12 8v2"></path><path d="M17 8v2"></path><path d="M7 4h.01"></path><path d="M12 4h.01"></path><path d="M17 4h.01"></path></svg></div>
              <h4 className="admin-vendor-label">Torte</h4>
              <p className="admin-vendor-number">{countVendors(5)}</p>
            </div>
          </div>
        </div>
      )}

      {/* za sve korisnike */}
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
                </tr>
              </thead>
              <tbody>
                {usersList.length > 0 ? usersList.map((user) => (
                  <tr key={user.Id}>
                    <td className="td-id">#{user.Id}</td>
                    <td className="td-bold-dark">{user.FirstName} {user.LastName}</td>
                    <td className="td-gray">{user.Email}</td>
                    <td>
                      {user.RoleId === 1 ? (
                        <span className="admin-badge badge-admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                          </svg>
                          Admin
                        </span>
                      ) : (
                        <span className="admin-badge badge-user" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                          Korisnik
                        </span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="td-first" style={{ textAlign: 'center' }}>Nema registrovanih korisnika.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* za sve dogadjaje */}
      {activeTab === 'events' && (
        <div className="fade-in">
          <DugmeNazad />
          <h2 className="admin-table-title">Svi kreirani događaji na platformi</h2>
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
                    <td className="td-bold-dark">{ev.Title}</td>
                    <td className="td-date">
                      <span className="badge-date">📅 {formatDate(ev.Date)}</span>
                    </td>
                    <td className="td-gray">📍 {ev.Location}</td>
                    <td>
                      <span className="badge-budget">{ev.TotalBudget} €</span>
                    </td>
                    <td>
                      <div className="user-info-group">
                        <span className="user-name">{ev.FirstName} {ev.LastName}</span>
                        <span className="user-email">{ev.Email}</span>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="td-first" style={{ textAlign: 'center' }}>Trenutno nema kreiranih događaja u sistemu.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* za vendore */}
      {activeTab === 'vendors' && (
        <div className="fade-in">
          <DugmeNazad />
          <div className="vendor-filter-header">
            <h2 className="admin-table-title">Baza vendora</h2>
            <div className="vendor-filter-group">
              <button className={`tab-btn filter-btn-small ${vendorCategory === 'Sve' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 'Sve' })}>Sve</button>
              <button className={`tab-btn filter-btn-small ${vendorCategory === 1 ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 1 })}>Sale / restorani</button>
              <button className={`tab-btn filter-btn-small ${vendorCategory === 2 ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 2 })}>Fotografi</button>
              <button className={`tab-btn filter-btn-small ${vendorCategory === 3 ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 3 })}>Muzika</button>
              <button className={`tab-btn filter-btn-small ${vendorCategory === 4 ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 4 })}>Dekoracija</button>
              <button className={`tab-btn filter-btn-small ${vendorCategory === 5 ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'vendors', category: 5 })}>Torte</button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Naziv vendora</th>
                  <th>Kategorija</th>
                  <th>Kontakt</th>
                  <th>Početna cijena</th>
                </tr>
              </thead>
              <tbody>
                {filtriraniVendori.length > 0 ? filtriraniVendori.map((vendor) => (
                  <tr key={vendor.Id}>
                    <td className="td-bold-dark">{vendor.Name}</td>
                    <td>
                      <span className="badge-category">{getNazivKategorije(vendor.CategoryID)}</span>
                    </td>
                    <td className="td-gray">{vendor.Contact}</td>
                    <td className="td-price">
                       <span className="price-tag">{vendor.BasePrice} €</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="td-first" style={{ textAlign: 'center' }}>Nema vendora u odabranoj kategoriji.</td></tr>
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