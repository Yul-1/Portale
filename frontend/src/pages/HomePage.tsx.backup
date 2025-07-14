import React from 'react';
import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';

interface Alloggio {
  id: number;
  nome: string;
  immagine: string;
}

const HomePage: React.FC = () => {
  // Dati di esempio per gli alloggi
  const alloggi: Alloggio[] = [
    {
      id: 1,
      nome: 'Casa Iperione',
      immagine: '/images/alloggi/casa-iperione.jpg'  // ✅ Immagine ottimizzata locale
    },
    {
      id: 2,
      nome: 'Villa Aurora',
      immagine: '/images/alloggi/villa-aurora.jpg'   // ✅ Immagine ottimizzata locale
    }
  ];

  return (
    <div className={styles.homePage}>
      {/* Banner superiore */}
      <header className={styles.banner}>
        <h1>Benvenuti al Portale Prenotazioni</h1>
        <p>Scopri i nostri alloggi esclusivi in Toscana</p>
      </header>

      {/* Sezione alloggi */}
      <section className={styles.alloggiSection}>
        <h2>I Nostri Alloggi</h2>
        <div className={styles.alloggiGrid}>
          {alloggi.map((alloggio) => (
            <Link 
              key={alloggio.id} 
              to={`/alloggi/dettaglio/${alloggio.id}`}
              className={styles.alloggioLink}
            >
              <div className={styles.alloggioCard}>
                <div className={styles.imageContainer}>
                  <img 
                    src={alloggio.immagine} 
                    alt={alloggio.nome}
                    className={styles.alloggioImage}
                    onError={(e) => {
                      // ✅ Fallback in caso di errore
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/300x300?text=${encodeURIComponent(alloggio.nome)}`;
                    }}
                  />
                </div>
                <h3>{alloggio.nome}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>


      {/* Zona disponibilità */}
      <section className={styles.disponibilitaSection}>
        <h2>Controlla la Disponibilità</h2>
        <div className={styles.searchContainer}>
          <div className={styles.dateInputs}>
            <div className={styles.inputGroup}>
              <label htmlFor="checkin">Check-in</label>
              <input type="date" id="checkin" />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="checkout">Check-out</label>
              <input type="date" id="checkout" />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="ospiti">Ospiti</label>
              <select id="ospiti">
                <option value="1">1 ospite</option>
                <option value="2">2 ospiti</option>
                <option value="3">3 ospiti</option>
                <option value="4">4+ ospiti</option>
              </select>
            </div>
          </div>
          <button className={styles.searchButton}>Cerca Disponibilità</button>
        </div>
      </section>

      {/* Sezione Prenota e Galleria */}
      <section className={styles.infoSection}>
        <div className={styles.infoGrid}>
          <div className={styles.prenotaCard}>
            <h2>Prenota il tuo soggiorno</h2>
            <p>Scopri le nostre offerte esclusive e prenota la tua vacanza da sogno in Toscana.</p>
            <Link to="/prenotazioni" className={styles.ctaButton}>
              Prenota Ora
            </Link>
          </div>
          <div className={styles.galleriaCard}>
            <h2>Galleria fotografica</h2>
            <p>Esplora le immagini dei nostri alloggi e degli splendidi paesaggi circostanti.</p>
            <Link to="/galleria" className={styles.ctaButton}>
              Vedi Galleria
            </Link>
          </div>
        </div>
      </section>

      {/* Mappa placeholder */}
      <section className={styles.mapSection}>
        <h2>Dove Siamo</h2>
        <div className={styles.mapPlaceholder}>
          <p>Mappa interattiva - Link a Google Maps</p>
          <a 
            href="https://maps.google.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.mapLink}
          >
            Apri in Google Maps
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerInfo}>
            <h3>Portale Prenotazioni</h3>
            <p>Il tuo partner per vacanze indimenticabili</p>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/chi-siamo">Chi Siamo</Link>
            <Link to="/contatti">Contatti</Link>
            <Link to="/privacy-policy" className={styles.privacyLink}>
              Termini e condizioni del trattamento dei dati personali
            </Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; 2025 Portale Prenotazioni. Tutti i diritti riservati.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;