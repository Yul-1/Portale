import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import styles from './AlloggioDetail.module.css';

interface AlloggioData {
  id: number;
  nome: string;
  descrizione: string;
  posizione: string;
  prezzoNotte: number;
  numeroOspitiMax: number;
  numeroCamere: number;
  numeroBagni: number;
  servizi: string[];
  immagini: string[];
  disponibile: boolean;
}

const AlloggioDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [alloggio, setAlloggio] = useState<AlloggioData | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [numeroOspiti, setNumeroOspiti] = useState(1);
  const [loading, setLoading] = useState(true);

  // Simula il caricamento dei dati (in futuro sarà una chiamata API)
  useEffect(() => {
    const mockData: AlloggioData = {
      id: parseInt(id || '1'),
      nome: id === '1' ? 'Casa Iperione' : 'Villa Aurora',
      descrizione: 'Comoda casa spaziosa e luminosa. Perfetta per una vacanza rilassante, offre tutti i comfort moderni mantenendo il fascino rustico tipico della regione.',
      posizione: 'Noto, città patrimonio UNESCO, a 15 minuti dal centro storico',
      prezzoNotte: id === '1' ? 150 : 200,
      numeroOspitiMax: 5,
      numeroCamere: 2,
      numeroBagni: 1,
      servizi: [
        'Wi-Fi gratuito',
        'Aria condizionata',
        'Cucina attrezzata',
        'Lavatrice'],
      immagini: [
        `https://via.placeholder.com/800x600?text=${id === '1' ? 'Casa+Iperione' : 'Villa+Aurora'}+1`,
        `https://via.placeholder.com/800x600?text=${id === '1' ? 'Casa+Iperione' : 'Villa+Aurora'}+2`,
        `https://via.placeholder.com/800x600?text=${id === '1' ? 'Casa+Iperione' : 'Villa+Aurora'}+3`,
        `https://via.placeholder.com/800x600?text=${id === '1' ? 'Casa+Iperione' : 'Villa+Aurora'}+4`,
      ],
      disponibile: true
    };

    setTimeout(() => {
      setAlloggio(mockData);
      setLoading(false);
    }, 500);
  }, [id]);

  const handlePrenotazione = (e: React.FormEvent) => {
    e.preventDefault();
    // In futuro qui ci sarà la logica per salvare la prenotazione
    alert(`Prenotazione per ${alloggio?.nome} dal ${checkIn} al ${checkOut} per ${numeroOspiti} ospiti`);
    navigate('/prenotazioni');
  };

  const calcolaTotale = () => {
    if (!checkIn || !checkOut || !alloggio) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const giorni = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    return giorni * alloggio.prezzoNotte;
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!alloggio) {
    return (
      <div className={styles.notFound}>
        <h2>Alloggio non trovato</h2>
        <Link to="/">Torna alla home</Link>
      </div>
    );
  }

  return (
    <div className={styles.detailPage}>
      {/* Header con navigazione */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.backLink}>← Torna alla home</Link>
          <h1>{alloggio.nome}</h1>
        </div>
      </header>

      {/* Galleria immagini */}
      <section className={styles.gallery}>
        <div className={styles.mainImage}>
          <img 
            src={alloggio.immagini[selectedImage]} 
            alt={`${alloggio.nome} - Foto ${selectedImage + 1}`}
          />
        </div>
        <div className={styles.thumbnails}>
          {alloggio.immagini.map((img, index) => (
            <div 
              key={index}
              className={`${styles.thumbnail} ${selectedImage === index ? styles.active : ''}`}
              onClick={() => setSelectedImage(index)}
            >
              <img src={img} alt={`Thumbnail ${index + 1}`} />
            </div>
          ))}
        </div>
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
                <span>Fino a {alloggio.numeroOspitiMax} ospiti</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.icon}>🛏️</span>
                <span>{alloggio.numeroCamere} camere da letto</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.icon}>🚿</span>
                <span>{alloggio.numeroBagni} bagni</span>
              </div>
            </div>
          </div>

          <div className={styles.servizi}>
            <h3>Servizi inclusi</h3>
            <div className={styles.serviziGrid}>
              {alloggio.servizi.map((servizio, index) => (
                <div key={index} className={styles.servizioItem}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>{servizio}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Form prenotazione */}
        <aside className={styles.bookingSection}>
          <div className={styles.bookingCard}>
            <div className={styles.priceHeader}>
              <span className={styles.price}>€{alloggio.prezzoNotte}</span>
              <span className={styles.perNight}>/ notte</span>
            </div>

            <form onSubmit={handlePrenotazione} className={styles.bookingForm}>
              <div className={styles.dateInputs}>
                <div className={styles.inputGroup}>
                  <label htmlFor="checkIn">Check-in</label>
                  <input 
                    type="date" 
                    id="checkIn"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
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
                    min={checkIn || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="ospiti">Numero di ospiti</label>
                <select 
                  id="ospiti"
                  value={numeroOspiti}
                  onChange={(e) => setNumeroOspiti(parseInt(e.target.value))}
                  required
                >
                  {[...Array(alloggio.numeroOspitiMax)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {i === 0 ? 'ospite' : 'ospiti'}
                    </option>
                  ))}
                </select>
              </div>

              {checkIn && checkOut && (
                <div className={styles.summary}>
                  <div className={styles.summaryRow}>
                    <span>Totale notti:</span>
                    <span>{Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 3600 * 24))}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Prezzo per notte:</span>
                    <span>€{alloggio.prezzoNotte}</span>
                  </div>
                  <div className={styles.summaryTotal}>
                    <span>Totale:</span>
                    <span>€{calcolaTotale()}</span>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className={styles.bookButton}
                disabled={!alloggio.disponibile}
              >
                {alloggio.disponibile ? 'Prenota Ora' : 'Non Disponibile'}
              </button>
            </form>

            <p className={styles.info}>
              Non verrà addebitato alcun importo in questa fase
            </p>
          </div>
        </aside>
      </div>

      {/* Mappa placeholder */}
      <section className={styles.mapSection}>
        <h2>Posizione</h2>
        <div className={styles.mapContainer}>
          <div className={styles.mapPlaceholder}>
            <p>Mappa interattiva - {alloggio.posizione}</p>
            <a 
              href={`https://maps.google.com/maps?q=${encodeURIComponent(alloggio.posizione)}`}
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