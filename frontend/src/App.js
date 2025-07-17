// frontend/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.tsx';
import AlloggioDetail from './pages/AlloggioDetail.tsx';
import './App.css';
import BookingPage from './pages/BookingPage.tsx';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/alloggi/dettaglio/:id" element={<AlloggioDetail />} />
          <Route path="/prenotazioni" element={<div style={{padding: '50px'}}>Prenotazioni (TODO)</div>} />
          <Route path="/galleria" element={<div style={{padding: '50px'}}>Galleria (TODO)</div>} />
          <Route path="/privacy-policy" element={<div style={{padding: '50px'}}>Privacy Policy (TODO)</div>} />
          <Route path="/chi-siamo" element={<div style={{padding: '50px'}}>Chi Siamo (TODO)</div>} />
          <Route path="/contatti" element={<div style={{padding: '50px'}}>Contatti (TODO)</div>} />
          <Route path="/prenotazioni/nuovo/:id" element={<BookingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;