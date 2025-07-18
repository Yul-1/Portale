// frontend/src/pages/HomePage.tsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';
import apiService, { AlloggioData as OriginalAlloggioData, ApiListResponse } from '../services/api';

// Estendi AlloggioData per includere la proprietà 'immagine' usata nel frontend
type AlloggioData = OriginalAlloggioData & { immagine?: string };

// Non è più necessaria un'interfaccia Alloggio locale se AlloggioData è completa
// interface Alloggio {
//   id: number;
//   nome: string;
//   immagine: string; // URL dell'immagine
//   posizione?: string;
//   prezzo_notte?: number;
//   numero_ospiti_max?: number;
//   disponibile?: boolean;
// }


const HomePage: React.FC = () => {
  // Ora alloggi è tipizzato come AlloggioData[]
  const [alloggi, setAlloggi] = useState<AlloggioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useState({
    checkin: '',
    checkout: '',
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Dati di fallback (assicurati che rispettino l'interfaccia AlloggioData completa)
  const alloggiFallback: AlloggioData[] = [
    {
      id: 1,
      nome: 'Casa Iperione',
      descrizione: 'Splendida casa toscana con vista panoramica sulla valle.', // Campo obbligatorio
      posizione: 'Lucca, Toscana - Colline lucchesi',
      prezzo_notte: 150.00,
      numero_ospiti_max: 6,
      numero_camere: 3, // Campo obbligatorio
      numero_bagni: 2, // Campo obbligatorio
      servizi: ["Wi-Fi gratuito", "Piscina privata"], // Campo obbligatorio
      disponibile: true,
      immagine_principale: '/images/alloggi/casa-iperione.jpg'
    },
    {
      id: 2,
      nome: 'Villa Aurora',
      descrizione: 'Elegante villa con piscina privata immersa nel verde.', // Campo obbligatorio
      posizione: 'Lucca, Toscana - Zona San Concordio',
      prezzo_notte: 200.00,
      numero_ospiti_max: 8,
      numero_camere: 4, // Campo obbligatorio
      numero_bagni: 3, // Campo obbligatorio
      servizi: ["Wi-Fi gratuito", "Piscina privata"], // Campo obbligatorio
      disponibile: true,
      immagine_principale: '/images/alloggi/villa-aurora.jpg'
    }
  ];
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { id, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSearch = async () => {
    // Validazione
    if (!searchParams.checkin || !searchParams.checkout) {
      setSearchError('Per favore, seleziona sia la data di check-in che quella di check-out.');
      return;
    }
    if (new Date(searchParams.checkout) <= new Date(searchParams.checkin)) {
      setSearchError('La data di check-out deve essere successiva a quella di check-in.');
      return;
    }

    setSearchError(null);
    setIsSearching(true);

    try {
      // Chiamata API
      const results = await apiService.cercaDisponibilita(
        searchParams.checkin,
        searchParams.checkout
      );

      // Navigazione alla pagina dei risultati con i dati
      navigate('/risultati-disponibilita', {
        state: {
          results: results,
          checkIn: searchParams.checkin,
          checkOut: searchParams.checkout,
        },
      });

    } catch (err) {
      console.error('Errore durante la ricerca della disponibilità:', err);
      setSearchError(err instanceof Error ? err.message : 'Si è verificato un errore. Riprova più tardi.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    loadAlloggi();
  }, []);

  const loadAlloggi = async () => {
    setLoading(true);
    setError(null);
    try {
      // Ora 'response' è tipizzato correttamente come ApiListResponse<AlloggioData>
      const response: ApiListResponse<AlloggioData> = await apiService.getAlloggi();
      console.log('Risposta API per gli alloggi:', response);

      // Accedi direttamente all'array degli alloggi annidato nel campo 'results' dell'oggetto 'results'
      const alloggiDalBackend: AlloggioData[] = response.results;      // Usiamo immagine_principale come fonte primaria
      const alloggiMappatiPerFrontend: AlloggioData[] = alloggiDalBackend.map(alloggio => ({
        ...alloggio, // Copia tutte le proprietà esistenti dall'oggetto alloggio
        immagine: alloggio.immagine_principale || // Priorità all'immagine principale
                  (alloggio.foto && alloggio.foto.length > 0 ? alloggio.foto[0].image_url : null) || // Poi la prima foto se esiste
                  `/images/alloggi/${alloggio.nome.toLowerCase().replace(/\s+/g, '-')}.jpg`, // Fallback locale
      }));

      // Se non ci sono alloggi dal backend, usa i dati di fallback
      setAlloggi(alloggiMappatiPerFrontend.length > 0 ? alloggiMappatiPerFrontend : alloggiFallback);

    } catch (err) {
      console.error('Errore nel caricamento degli alloggi dal backend:', err);
      // Cattura il messaggio d'errore specifico per mostrarlo all'utente
      setError(`Impossibile caricare gli alloggi. ${err instanceof Error ? err.message : 'Si prega di riprovare più tardi.'}`);
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
            <p>Nessun alloggio disponibile al momento. Utilizzo dati di esempio.</p>
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
                  {/* Usa alloggio.immagine, che è stata mappata e ora è sempre presente */}
                  <img
                    src={alloggio.immagine || ''}
                    alt={alloggio.nome}
                    className={styles.alloggioImage}
                    onError={handleImageError}
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
          <input
            type="date"
            id="checkin"
            value={searchParams.checkin}
            onChange={handleDateChange}
            min={new Date().toISOString().split('T')[0]} // Imposta data minima a oggi
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="checkout">Check-out</label>
          <input
            type="date"
            id="checkout"
            value={searchParams.checkout}
            onChange={handleDateChange}
            min={searchParams.checkin || new Date().toISOString().split('T')[0]} // Data minima dinamica
          />
        </div>
          </div>
          {/* Mostra errore di ricerca se presente */}
          {searchError && <p className={styles.errorMessage}>{searchError}</p>}
          <button
        className={styles.searchButton}
        onClick={handleSearch}
        disabled={isSearching}
          >
        {isSearching ? 'Ricerca in corso...' : 'Cerca Disponibilità'}
          </button>
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
            href="http://googleusercontent.com/maps.google.com/6"
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
          <p>© 2025 Portale Prenotazioni. Tutti i diritti riservati.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;