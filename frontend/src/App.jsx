import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home'; // Uvozimo novu Početnu stranicu
import Login from './pages/Login';
import Admin from './pages/Admin';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          {}
          <Route path="/" element={<Home />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<h2>Ovo je stranica za Registraciju</h2>} />
          <Route path="/dashboard" element={<h2>Ovo je korisnički Dashboard (Pretraga vendora)</h2>} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;