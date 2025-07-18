// frontend/src/pages/AvailabilityResultsPage.tsx

import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import styles from './AvailabilityResultsPage.module.css';
import { AlloggioData } from '../services/api';

const AvailabilityResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Estrai i dati passati tramite lo stato della navigazione
  const { results, checkIn, checkOut } = location.state || { results: [], checkIn: '', checkOut: '' };

  const handlePrenotaClick = (alloggioId: number) => {
    // Naviga alla pagina di prenotazione, passando le date per la pre-compilazione
    navigate(`/prenotazioni/${alloggioId}`, {
      state: {
        checkIn,
        checkOut,
      },
    });
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    const alloggioNome = target.alt || 'Alloggio';
    target.src = `https://via.placeholder.com/300x300?text=${encodeURIComponent(alloggioNome)}`;
  };

  return (
    <div className={styles.resultsPage}>
      <div className={styles.container}>
        <header className={styles.header}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            ← Nuova Ricerca
          </button>
          <h1>Alloggi Disponibili</h1>
          {checkIn && checkOut && (
            <p className={styles.dateRange}>
              Dal <strong>{checkIn}</strong> al <strong>{checkOut}</strong>
            </p>
          )}
        </header>

        {results.length > 0 ? (
          <div className={styles.alloggiGrid}>
            {results.map((alloggio: AlloggioData) => (
              <div key={alloggio.id} className={styles.alloggioCard}>
                <Link to={`/alloggi/dettaglio/${alloggio.id}`}>
                  <img
                    src={alloggio.immagine_principale || '/images/placeholder.jpg'}
                    alt={alloggio.nome}
                    className={styles.alloggioImage}
                    onError={handleImageError}
                  />
                </Link>
                <div className={styles.cardContent}>
                  <h3>{alloggio.nome}</h3>
                  <p className={styles.posizione}>{alloggio.posizione}</p>
                  <div className={styles.priceInfo}>
                    <span className={styles.price}>
                      €{Number(alloggio.prezzo_notte).toFixed(2)}
                    </span>
                    <span className={styles.perNight}>/ notte</span>
                  </div>
                  <button
                    onClick={() => handlePrenotaClick(alloggio.id)}
                    className={styles.prenotaButton}
                  >
                    Prenota Ora
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noResults}>
            <h2>Nessun alloggio trovato</h2>
            <p>Non ci sono alloggi disponibili per le date selezionate. Prova a modificare il periodo di ricerca.</p>
            <Link to="/" className={styles.backButton}>
              Torna alla Homepage
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilityResultsPage;
