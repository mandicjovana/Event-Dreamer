import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(1);
  const [contact, setContact] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [file, setFile] = useState(null);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('roleId');
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Niste prijavljeni!');
      return;
    }

    try {
      let imagePath = '';

      if (file) {
        const formData = new FormData();
        formData.append('slika', file);

        const uploadResponse = await axios.post('http://localhost:5000/api/upload', formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        imagePath = uploadResponse.data.ImagePath; 
      }

      await axios.post('http://localhost:5000/api/vendors', {
        CategoryID: categoryId,
        Name: name,
        Contact: contact,
        BasePrice: basePrice,
        ImagePath: imagePath
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      alert('Vendor je uspješno dodat u bazu!');
      
      setName('');
      setContact('');
      setBasePrice('');
      setFile(null);

    } catch (error) {
      console.error(error);
      alert('Došlo je do greške pri dodavanju vendora.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '50px auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Admin Panel</h2>
        <button onClick={handleLogout} style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Odjavi se</button>
      </div>
      
      <h3 style={{ marginBottom: '15px' }}>Dodaj novog vendora</h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ fontWeight: 'bold' }}>Kategorija: </label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
            <option value={1}>Restoran / Sala</option>
            <option value={2}>Muzika / Bend</option>
            <option value={3}>Fotograf</option>
            <option value={4}>Dekoracija</option>
          </select>
        </div>

        <div>
          <label style={{ fontWeight: 'bold' }}>Naziv vendora: </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <div>
          <label style={{ fontWeight: 'bold' }}>Kontakt: </label>
          <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <div>
          <label style={{ fontWeight: 'bold' }}>Cijena (€): </label>
          <input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <div>
          <label style={{ fontWeight: 'bold' }}>Slika: </label>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} accept="image/*" style={{ marginTop: '5px' }} />
        </div>

        <button type="submit" style={{ marginTop: '10px', padding: '12px', backgroundColor: '#28A745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem' }}>
          Sačuvaj vendora
        </button>
      </form>
    </div>
  );
}

export default Admin;