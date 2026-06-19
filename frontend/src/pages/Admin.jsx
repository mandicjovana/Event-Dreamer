import { useState } from 'react';
import axios from 'axios';

function Admin() {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('1');
  const [contact, setContact] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [slika, setSlika] = useState(null);

  const handleAddVendor = async (e) => {
    e.preventDefault();

    // token iz memorije koji je sa;uvan pri loginu
    const token = localStorage.getItem('token');
    
    if (!token) {
      alert('Niste ulogovani! Molimo vas da se prijavite kao Admin.');
      return;
    }

    // header sa tokenom za sigurnosnu provjeru
    const authConfig = {
      headers: { Authorization: `Bearer ${token}` }
    };

    try {
      let putanjaSlike = '';

      // ako imamo sliku saljemo je na upload
      if (slika) {
        const formData = new FormData();
        formData.append('slika', slika); 

        const uploadOdgovor = await axios.post('http://localhost:5000/api/upload', formData, {
          headers: {
            ...authConfig.headers,
            'Content-Type': 'multipart/form-data'
          }
        });

        // backend salje odgovor sa tacnim imenom slike
        putanjaSlike = uploadOdgovor.data.ImagePath; 
      }

      // saljemo tekstualne podatke + ime slike na /api/vendors
      await axios.post('http://localhost:5000/api/vendors', {
        Name: name,
        CategoryID: parseInt(categoryId),
        Contact: contact,
        BasePrice: parseFloat(basePrice),
        ImagePath: putanjaSlike 
      }, authConfig);

      alert('Uspješno dodato! Vendor i slika su sada u bazi.');
      
      // za ciscenje forme
      setName('');
      setCategoryId('1');
      setContact('');
      setBasePrice('');
      setSlika(null);
      document.getElementById('file-upload').value = ""; 
      
    } catch (error) {
      console.error('Greška:', error.response?.data || error.message);
      alert(error.response?.data?.greska || error.response?.data?.poruka || 'Došlo je do greške pri dodavanju.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <h2>Admin Panel</h2>
        <p style={{ marginBottom: '25px', color: '#444' }}>Dodajte novog vendora i sliku.</p>
        
        <form onSubmit={handleAddVendor}>
          
          <div className="input-group">
            <label>Naziv (Name)</label>
            <input 
              type="text" 
              placeholder="Npr. Hotel Splendid"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label>Kategorija (CategoryID)</label>
            <select 
              value={categoryId} 
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="1">Sale i restorani (1)</option>
              <option value="2">Fotografi (2)</option>
              <option value="3">Muzika / bendovi (3)</option>
              <option value="4">Dekoracija (4)</option>
              <option value="5">Torte i slatkiši (5)</option>
            </select>
          </div>

          <div className="input-group">
            <label>Kontakt (Contact)</label>
            <input 
              type="text" 
              placeholder="Npr. 067-111-222"
              value={contact} 
              onChange={(e) => setContact(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label>Početna cijena u € (BasePrice)</label>
            <input 
              type="number" 
              step="0.01"
              placeholder="Npr. 5000.00"
              value={basePrice} 
              onChange={(e) => setBasePrice(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label>Dodaj sliku</label>
            <input 
              id="file-upload"
              type="file" 
              accept="image/*"
              onChange={(e) => setSlika(e.target.files[0])} 
              style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.4)' }}
            />
          </div>
          
          <button type="submit" className="auth-btn">Sačuvaj vendora</button>
        </form>
      </div>
    </div>
  );
}

export default Admin;