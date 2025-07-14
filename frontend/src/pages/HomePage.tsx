// frontend/src/pages/HomePage.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';
import apiService from '../services/api'; // Assicurati che api.ts sia già aggiornato

interface Alloggio {
  id: number;
  nome: string;
  immagine: string; // URL dell'immagine
  posizione?: string; // Aggiunto per mostrare la posizione
  prezzo_notte?: number; // Aggiunto per mostrare il prezzo
  numero_ospiti_max?: number; // Aggiunto per mostrare il numero massimo di ospiti
  disponibile?: boolean; // Aggiunto per mostrare lo stato di disponibilità
}

const HomePage: React.FC = () => {
  // Stati per gestire i dati
  const [alloggi, setAlloggi] = useState<Alloggio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Nuovo stato per la gestione errori

  // Dati di fallback (gli originali)
  const alloggiFallback: Alloggio[] = [
    {
      id: 1,
      nome: 'Casa Iperione',
      immagine: '/images/alloggi/casa-iperione.jpg',
      posizione: 'Lucca, Toscana - Colline lucchesi',
      prezzo_notte: 150.00,
      numero_ospiti_max: 6,
      disponibile: true,
    },
    {
      id: 2,
      nome: 'Villa Aurora',
      immagine: '/images/alloggi/villa-aurora.jpg',
      posizione: 'Lucca, Toscana - Zona San Concordio',
      prezzo_notte: 200.00,
      numero_ospiti_max: 8,
      disponibile: true,
    }
  ];

  useEffect(() => {
    loadAlloggi();
  }, []);

  const loadAlloggi = async () => {
    setLoading(true);
    setError(null);
    try {
      // Chiama l'API
      const response = await apiService.getAlloggi();
      console.log('Risposta API:', response); // Debug

      let alloggiData: any[] = [];

      // Gestisci la struttura della risposta
      if (response && (response as any).results) {
        // Se la risposta è un oggetto con una proprietà 'results' (paginazione)
        alloggiData = (response as any).results.results || (response as any).results;
      } else if (Array.isArray(response)) {
        // Se la risposta è direttamente un array
        alloggiData = response;
      }

      // Mappa i dati dal backend nel formato richiesto dal frontend
      const alloggiMappati: Alloggio[] = alloggiData.map((alloggio: any) => ({
        id: alloggio.id,
        nome: alloggio.nome,
        // Priorità: immagine principale dal backend, poi path locale, poi placeholder
        immagine: alloggio.immagine_principale ||
                  alloggio.foto?.[0]?.image_url ||
                  `/images/alloggi/${alloggio.nome.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        posizione: alloggio.posizione,
        prezzo_notte: alloggio.prezzo_notte,
        numero_ospiti_max: alloggio.numero_ospiti_max,
        disponibile: alloggio.disponibile,
      }));

      setAlloggi(alloggiMappati.length > 0 ? alloggiMappati : alloggiFallback);

    } catch (err) {
      console.error('Errore nel caricamento degli alloggi:', err);
      setError('Impossibile caricare gli alloggi. Si prega di riprovare più tardi.');
      setAlloggi(alloggiFallback); // In caso di errore, usa i dati di fallback
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    const alloggioNome = target.alt || 'Alloggio';
    target.src = `https://via.placeholder.com/300x300?text=${encodeURIComponent(alloggioNome)}`;
  };

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
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Caricamento alloggi...</p>
          </div>
        )}
        {error && (
          <div className={styles.errorMessage}>
            <p>{error}</p>
            <button onClick={loadAlloggi}>Riprova</button>
          </div>
        )}
        {!loading && alloggi.length === 0 && !error && (
          <div className={styles.noResults}>
            <p>Nessun alloggio disponibile al momento.</p>
          </div>
        )}
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
                    onError={handleImageError}
                  />
                  {alloggio.disponibile && (
                    <span className={styles.badge}>Disponibile</span>
                  )}
                </div>
                <div className={styles.cardContent}>
                  <h3>{alloggio.nome}</h3>
                  <div className={styles.location}>
                    <span className={styles.locationIcon}>📍</span>
                    <span>{alloggio.posizione}</span>
                  </div>
                  <div className={styles.cardFooter}>
                    <div className={styles.priceInfo}>
                      <span className={styles.price}>€{alloggio.prezzo_notte}</span>
                      <span className={styles.perNight}>/ notte</span>
                    </div>
                    <div className={styles.capacity}>
                      <span className={styles.capacityIcon}>👥</span>
                      <span>Fino a {alloggio.numero_ospiti_max} ospiti</span>
                    </div>
                  </div>
                </div>
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
        <h2>Perché Scegliere Noi?</h2>
        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.icon}>🏡</span>
            <h3>Alloggi Selezionati</h3>
            <p>Solo le migliori strutture verificate</p>
          </div>
          <div className={styles.feature}>
            <span className={styles.icon}>🔒</span>
            <h3>Prenotazione Sicura</h3>
            <p>Pagamenti protetti e garantiti</p>
          </div>
          <div className={styles.feature}>
            <span className={styles.icon}>💬</span>
            <h3>Assistenza 24/7</h3>
            <p>Sempre a tua disposizione</p>
          </div>
        </div>
      </section>

      {/* Mappa placeholder */}
      <section className={styles.mapSection}>
        <h2>Dove Siamo</h2>
        <div className={styles.mapPlaceholder}>
          <p>Mappa interattiva - Link a Google Maps</p>
          <a
            href="https://www.google.com/maps/search/alloggi+toscana" // URL generico per la mappa
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
          <nav className={styles.footerLinks}>
            <Link to="/chi-siamo">Chi Siamo</Link>
            <Link to="/contatti">Contatti</Link>
            <Link to="/privacy-policy" className={styles.privacyLink}>
              Termini e condizioni del trattamento dei dati personali
            </Link>
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2025 Portale Prenotazioni. Tutti i diritti riservati.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;