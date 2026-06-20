import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MyEvents from './pages/MyEvents'; 
import Navbar from './components/Navbar'; 

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <Navbar /> 
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-events" element={<MyEvents />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;