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

// Stati per prenotazioni
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [numeroOspiti, setNumeroOspiti] = useState(1);
  const [disponibile, setDisponibile] = useState<boolean | null>(null);
  const [verificandoDisponibilita, setVerificandoDisponibilita] = useState(false);

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
          setAlloggio(prev => prev ? {
            ...prev,
            foto: [{
              id: 0,
              image_url: 'https://via.placeholder.com/800x600?text=Nessuna+Immagine+Disponibile',
              descrizione: 'Immagine placeholder',
              tipo: 'altro',
              ordine: 0
            }]
          } : null);
          setCurrentImageIndex(0);
        }

      } catch (err) {
        console.error('Errore caricamento alloggio:', err);
        setError('Errore nel caricamento dei dati dell\'alloggio.');
        setAlloggio(alloggioFallback);
      } finally {
        setLoading(false);
      }
    };

    loadAlloggioData();
  }, [id]);

  // Gestione errore immagini
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Immagine+Non+Disponibile';
  };

  // Navigazione immagini
  const handlePrevImage = () => {
    if (alloggio?.foto && alloggio.foto.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + alloggio.foto!.length) % alloggio.foto!.length);
    }
  };

  const handleNextImage = () => {
    if (alloggio?.foto && alloggio.foto.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % alloggio.foto!.length);
    }
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Caricamento...</div>;
  }

  if (error || !alloggio) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h1>Errore</h1>
        <p>{error || 'Alloggio non trovato'}</p>
        <Link to="/">← Torna alla Homepage</Link>
      </div>
    );
  }
// Funzioni helper per prenotazioni
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMinCheckOut = () => {
    if (!checkIn) return getTodayDate();
    const checkInDate = new Date(checkIn);
    checkInDate.setDate(checkInDate.getDate() + 1);
    return checkInDate.toISOString().split('T')[0];
  };

  const verificaDisponibilita = async () => {
    if (!alloggio || !checkIn || !checkOut) return;
    
    console.log('Verificando disponibilità per:', {
      alloggio: alloggio.id,
      checkIn,
      checkOut
    });
    
    try {
      setVerificandoDisponibilita(true);
      
      const url = `https://localhost/api/disponibilita/?alloggio_id=${alloggio.id}&check_in=${checkIn}&check_out=${checkOut}`;
      console.log('URL chiamata:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      console.log('Risposta disponibilità:', data);
      
      if (!response.ok) {
        console.error('Errore response:', data);
        setDisponibile(false);
        return;
      }
      
      setDisponibile(data.disponibile || false);
      
    } catch (err) {
      console.error('Errore verifica disponibilità:', err);
      setDisponibile(false);
    } finally {
      setVerificandoDisponibilita(false);
    }
  };

  const handlePrenotaClick = () => {
    if (!alloggio) return;
    
    if (checkIn && checkOut && disponibile) {
      // Naviga alla pagina BookingPage
      navigate(`/prenotazioni/nuovo/${alloggio.id}`, {
        state: {
          alloggio,
          checkIn,
          checkOut,
          numeroOspiti
        }
      });
    } else {
      alert('Verifica prima la disponibilità per le date selezionate');
    }
  };

  return (
    <div className={styles.detailPage}>
      {/* Header */}
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Torna agli alloggi</Link>
        <h1>{alloggio.nome}</h1>
        <p>📍 {alloggio.posizione}</p>
      </header>

      {/* Gallery */}
      <section className={styles.gallery}>
        <div className={styles.mainImage}>
          <img
            src={alloggio.foto && alloggio.foto.length > 0 ? alloggio.foto[currentImageIndex].image_url : alloggio.immagine_principale || 'https://via.placeholder.com/800x600?text=Nessuna+Immagine'}
            alt={alloggio.foto && alloggio.foto.length > 0 ? (alloggio.foto[currentImageIndex].descrizione || 'Immagine principale') : 'Immagine principale'}
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
                          <div className={styles.bookingForm}>
              <div className={styles.dateInputs}>
                <div className={styles.inputGroup}>
                  <label htmlFor="checkIn">Check-in</label>
                  <input
                    type="date"
                    id="checkIn"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={getTodayDate()}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="checkOut">Check-out</label>
                  <input
                    type="date"
                    id="checkOut"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={getMinCheckOut()}
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="ospiti">Numero ospiti</label>
                <select
                  id="ospiti"
                  value={numeroOspiti}
                  onChange={(e) => setNumeroOspiti(parseInt(e.target.value))}
                >
                  {[...Array(alloggio.numero_ospiti_max)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {i === 0 ? 'ospite' : 'ospiti'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Verifica disponibilità */}
              {checkIn && checkOut && (
                <div style={{ margin: '20px 0' }}>
                  <button
                    type="button"
                    onClick={verificaDisponibilita}
                    style={{
                      width: '100%',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: verificandoDisponibilita ? 'not-allowed' : 'pointer',
                      marginBottom: '10px',
                      opacity: verificandoDisponibilita ? 0.6 : 1
                    }}
                    disabled={verificandoDisponibilita}
                  >
                    {verificandoDisponibilita ? 'Verifica in corso...' : 'Verifica Disponibilità'}
                  </button>
                  
                  {disponibile !== null && (
                    <div style={{
                      textAlign: 'center',
                      padding: '10px',
                      borderRadius: '5px',
                      fontWeight: '600',
                      backgroundColor: disponibile ? '#d4edda' : '#f8d7da',
                      color: disponibile ? '#155724' : '#721c24',
                      border: `1px solid ${disponibile ? '#c3e6cb' : '#f5c6cb'}`
                    }}>
                      {disponibile ? '✅ Disponibile' : '❌ Non disponibile'}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handlePrenotaClick}
                className={styles.bookButton}
                disabled={!checkIn || !checkOut || disponibile !== true}
                style={{
                  opacity: (!checkIn || !checkOut || disponibile !== true) ? 0.5 : 1,
                  cursor: (!checkIn || !checkOut || disponibile !== true) ? 'not-allowed' : 'pointer'
                }}
              >
                {disponibile === true ? 'Prenota Ora' : 'Verifica Disponibilità'}
              </button>
            </div>
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