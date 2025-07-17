    // frontend/src/App.js

    import React from 'react';
    import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
    // Assicurati che questi componenti siano esportati come 'default' nei loro file
    import HomePage from './pages/HomePage'; // Rimosso .tsx
    import AlloggioDetail from './pages/AlloggioDetail'; // Rimosso .tsx
    import BookingPage from './pages/BookingPage'; // Rimosso .tsx
    import BookingConfirmationPage from './pages/BookingConfirmationPage'; // Rimosso .tsx

    import './App.css';

    function App() {
      return (
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/alloggi/dettaglio/:id" element={<AlloggioDetail />} />
              <Route path="/prenotazioni/:alloggioId?" element={<BookingPage />} />
              <Route path="/prenotazione-confermata" element={<BookingConfirmationPage />} />
              {/* Rotte TODO esistenti */}
              <Route path="/galleria" element={<div style={{padding: '50px'}}>Galleria (TODO)</div>} />
              <Route path="/privacy-policy" element={<div style={{padding: '50px'}}>Privacy Policy (TODO)</div>} />
              <Route path="/chi-siamo" element={<div style={{padding: '50px'}}>Chi Siamo (TODO)</div>} />
              <Route path="/contatti" element={<div style={{padding: '50px'}}>Contatti (TODO)</div>} />
            </Routes>
          </div>
        </Router>
      );
    }

    export default App;
    