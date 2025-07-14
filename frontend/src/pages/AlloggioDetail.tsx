// frontend/src/pages/AlloggioDetail.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import styles from './AlloggioDetail.module.css';
// Importa apiService e le interfacce AlloggioData e FotoAlloggio da api.ts
import apiService, { AlloggioData, FotoAlloggio } from '../services/api';

const AlloggioDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Ottiene l'ID dall'URL
  const navigate = useNavigate(); // Mantenuto se usato per reindirizzamenti
  const [alloggio, setAlloggio] = useState<AlloggioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Dati di fallback per un alloggio singolo, in caso di errore di caricamento o ID non valido
  // Assicurati che questi dati rispecchino la struttura completa di AlloggioData da api.ts
  const alloggioFallback: AlloggioData = {
    id: 0, // ID fittizio per fallback
    nome: 'Alloggio Non Disponibile',
    descrizione: 'Spiacenti, i dettagli per questo alloggio non sono disponibili al momento. Potrebbe essere un ID non valido o un problema di connessione al server. Si prega di provare più tardi.',
    posizione: 'Controlla la tua connessione o l\'ID dell\'alloggio',
    prezzo_notte: 0.00,
    numero_ospiti_max: 0,
    numero_camere: 0,
    numero_bagni: 0,
    servizi: [],
    disponibile: false,
    immagine_principale: 'https://via.placeholder.com/800x600?text=Immagine+Non+Disponibile', // Placeholder generico
    foto: [], // Array vuoto per le foto di fallback
  };

  useEffect(() => {
    const loadAlloggioData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!id) {
          setError('ID alloggio non fornito nell\'URL.');
          setAlloggio(alloggioFallback);
          return;
        }

        // Chiamata all'API per recuperare i dati dell'alloggio
        const data = await apiService.getAlloggio(id);
        console.log('Dati alloggio dal backend:', data); // Questo log dovrebbe ora apparire!

        setAlloggio(data);

        // Se l'alloggio ha delle foto, imposta l'indice dell'immagine corrente a 0
        if (data.foto && data.foto.length > 0) {
          setCurrentImageIndex(0);
        } else if (data.immagine_principale) {
          // Se non ci sono foto nell'array 'foto' ma c'è un'immagine principale, la usiamo
          // per la galleria, anche se sarà una sola immagine.
          setAlloggio(prev => prev ? { ...prev, foto: [{ id: 0, image_url: data.immagine_principale ?? 'https://via.placeholder.com/800x600?text=Immagine+Non+Disponibile', descrizione: 'Immagine principale', tipo: 'principale', ordine: 0 }] } : null);
          setCurrentImageIndex(0);
        } else {
          // Nessuna immagine disponibile, usa il placeholder
          setAlloggio(prev => prev ? { ...prev, foto: [{ id: 0, image_url: 'https://via.placeholder.com/800x600?text=Nessuna+Immagine', descrizione: 'Nessuna immagine disponibile', tipo: 'altro', ordine: 0 }] } : null);
          setCurrentImageIndex(0);
        }

      } catch (err) {
        console.error('Errore nel caricamento dell\'alloggio dal backend:', err);
        // Cattura il messaggio d'errore specifico per mostrarlo all'utente
        setError(`Impossibile caricare i dettagli dell\'alloggio. ${err instanceof Error ? err.message : 'Si prega di riprovare più tardi.'}`);
        setAlloggio(alloggioFallback); // Usa i dati di fallback in caso di errore
      } finally {
        setLoading(false);
      }
    };

    loadAlloggioData(); // Invoca la funzione di caricamento dati
  }, [id]); // Re-invoca se l'ID nell'URL cambia

  // Funzioni per la navigazione nella galleria (se più di una foto)
  const handlePrevImage = () => {
    if (alloggio && alloggio.foto && alloggio.foto.length > 0) {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === 0 ? alloggio.foto!.length - 1 : prevIndex - 1
      );
    }
  };

  const handleNextImage = () => {
    if (alloggio && alloggio.foto && alloggio.foto.length > 0) {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === alloggio.foto!.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Funzione per gestire errori di caricamento delle singole immagini
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = 'https://via.placeholder.com/800x600?text=Immagine+Non+Disponibile'; // Fallback per singola immagine
  };


  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Caricamento dettagli alloggio...</p>
      </div>
    );
  }

  // Gestione dell'errore (quando setError è stato chiamato)
  if (error) {
    return (
      <div className={styles.notFound}> {/* Usa la classe .notFound esistente */}
        <h2>Errore</h2>
        <p>{error}</p>
        <Link to="/" className={styles.backLink}>Torna alla Home</Link>
      </div>
    );
  }

  // Gestione dell'alloggio non trovato (alloggio è null o non ha un ID valido dopo il caricamento)
  if (!alloggio || !alloggio.id) {
    return (
      <div className={styles.notFound}>
        <h2>Alloggio non trovato</h2>
        <Link to="/" className={styles.backLink}>Torna alla Home</Link>
      </div>
    );
  }

  // Determina l'URL dell'immagine principale da visualizzare nella galleria
  const mainImageSrc = (alloggio.foto && alloggio.foto.length > 0)
    ? alloggio.foto[currentImageIndex].image_url // Se ci sono foto nell'array 'foto'
    : alloggio.immagine_principale || 'https://via.placeholder.com/800x600?text=Nessuna+Immagine'; // Altrimenti immagine principale o fallback


  return (
    <div className={styles.detailPage}>
      {/* Header con navigazione */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.backLink}>← Torna alla home</Link>
          <h1>{alloggio.nome}</h1>
        </div>
      </header>

      {/* Galleria Immagini */}
      <section className={styles.gallery}>
        <div className={styles.mainImage}>
          <img
            src={mainImageSrc}
            alt={alloggio.nome + ' - ' + (alloggio.foto && alloggio.foto.length > 0 ? alloggio.foto[currentImageIndex].descrizione : 'Immagine principale')}
            onError={handleImageError}
            loading="lazy"
          />
          {alloggio.foto && alloggio.foto.length > 1 && (
            <>
              <button onClick={handlePrevImage} className={styles.navButton}>&#10094;</button>
              <button onClick={handleNextImage} className={styles.navButton}>&#10095;</button>
            </>
          )}
        </div>
        {alloggio.foto && alloggio.foto.length > 0 && (
          <div className={styles.thumbnails}>
            {alloggio.foto.map((foto, index) => (
              <div
                key={foto.id || index}
                className={`${styles.thumbnail} ${index === currentImageIndex ? styles.active : ''}`}
                onClick={() => handleThumbnailClick(index)}
              >
                <img
                  src={foto.image_url}
                  alt={foto.descrizione || `Thumbnail ${index + 1}`}
                  onError={handleImageError}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contenuto principale */}
      <div className={styles.mainContent}>
        {/* Informazioni alloggio */}
        <section className={styles.infoSection}>
          <div className={styles.description}>
            <h2>Descrizione</h2>
            <p>{alloggio.descrizione}</p>

            <div className={styles.details}>
              <div className={styles.detailItem}>
                <span className={styles.icon}>📍</span>
                <span>{alloggio.posizione}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.icon}>👥</span>
                <span>Fino a {alloggio.numero_ospiti_max} ospiti</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.icon}>🛏️</span>
                <span>{alloggio.numero_camere} camere da letto</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.icon}>🚿</span>
                <span>{alloggio.numero_bagni} bagni</span>
              </div>
            </div>
          </div>

          <div className={styles.servizi}>
            <h3>Servizi inclusi</h3>
            <div className={styles.serviziGrid}>
              {alloggio.servizi && alloggio.servizi.length > 0 ? (
                alloggio.servizi.map((servizio, index) => (
                  <div key={index} className={styles.servizioItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>{servizio}</span>
                  </div>
                ))
              ) : (
                <p>Nessun servizio specificato.</p>
              )}
            </div>
          </div>
        </section>

        {/* Form prenotazione */}
        <aside className={styles.bookingSection}>
          <div className={styles.bookingCard}>
            <div className={styles.priceHeader}>
              {/* Usa alloggio.prezzo_notte direttamente */}
              <span className={styles.price}>€{alloggio.prezzo_notte.toFixed(2)}</span>
              <span className={styles.perNight}>/ notte</span>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); alert('Funzione di prenotazione non implementata.'); }} className={styles.bookingForm}>
              <div className={styles.dateInputs}>
                <div className={styles.inputGroup}>
                  <label htmlFor="checkIn">Check-in</label>
                  <input
                    type="date"
                    id="checkIn"
                    value="" // Sarà gestito da stato in fasi future
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="checkOut">Check-out</label>
                  <input
                    type="date"
                    id="checkOut"
                    value="" // Sarà gestito da stato in fasi future
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="ospiti">Numero ospiti</label>
                <select
                  id="ospiti"
                  defaultValue="1" // Sarà gestito da stato in fasi future
                >
                  {[...Array(alloggio.numero_ospiti_max)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {i === 0 ? 'ospite' : 'ospiti'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rimuovi calcolaTotale e priceBreakdown per ora, in quanto non abbiamo lo stato delle date */}
              {/* checkIn && checkOut && (
                <div className={styles.priceBreakdown}>
                  <div className={styles.priceRow}>
                    <span>Totale ({Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 3600 * 24))} notti)</span>
                    <span>€{calcolaTotale()}</span>
                  </div>
                </div>
              )*/}

              <button
                type="submit"
                className={styles.bookButton}
                // disabled={!checkIn || !checkOut} // disabilitato se non abbiamo stato date
              >
                Verifica Disponibilità e Prenota
              </button>
            </form>
          </div>
        </aside>
      </div>
      <section className={styles.mapSection}>
        <h2>Posizione</h2>
        <div className={styles.mapContainer}>
          <div className={styles.mapPlaceholder}>
            <p>Mappa interattiva - {alloggio.posizione}</p>
            <a
              href={`http://maps.google.com/?q=${encodeURIComponent(alloggio.posizione)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mapLink}
            >
              Apri in Google Maps
            </a>
          </div>
        </div>
      </section>

      {/* Footer semplice */}
      <footer className={styles.footer}>
        <p>
          Hai domande? <Link to="/contatti">Contattaci</Link> |
          <Link to="/privacy-policy"> Termini e condizioni del trattamento dei dati personali</Link>
        </p>
      </footer>
    </div>
  );
};

export default AlloggioDetail;