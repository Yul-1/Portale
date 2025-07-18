// frontend/src/pages/BookingPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styles from './BookingPage.module.css';
import apiService, { AlloggioData, PrenotazioneData } from '../services/api';

// Interfaccia per lo stato passato tramite useLocation (se si arriva da AlloggioDetail)
interface BookingPageState {
  alloggio?: AlloggioData;
  checkIn?: string;
  checkOut?: string;
  numeroOspiti?: number;
}

const BookingPage: React.FC = () => {
  const { alloggioId } = useParams<{ alloggioId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const stateFromLocation = location.state as BookingPageState || {};
    
  const [alloggio, setAlloggio] = useState<AlloggioData | null>(stateFromLocation.alloggio || null);
  const [loading, setLoading] = useState(!stateFromLocation.alloggio);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    checkIn: stateFromLocation.checkIn || '',
    checkOut: stateFromLocation.checkOut || '',
    numeroOspiti: stateFromLocation.numeroOspiti || 1,
    ospiteNome: '',
    ospiteEmail: '',
    ospiteTelefono: null as string | null,
    noteCliente: null as string | null
  });
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [disponibile, setDisponibile] = useState<boolean | null>(null);
  const [prezzoTotale, setPrezzoTotale] = useState(0);
  const [numeroNotti, setNumeroNotti] = useState(0);
  const [verificandoDisponibilita, setVerificandoDisponibilita] = useState(false);

  useEffect(() => {
    if (!alloggio && alloggioId) {
      loadAlloggio();
    }
  }, [alloggioId, alloggio]);

  useEffect(() => {
    if (alloggio && formData.checkIn && formData.checkOut) {
      verificaDisponibilita();
    }
  }, [alloggio, formData.checkIn, formData.checkOut]);

  const loadAlloggio = async () => {
    if (!alloggioId) return;
    
    try {
      setLoading(true);
      const data = await apiService.getAlloggio(parseInt(alloggioId)); 
      setAlloggio(data);
    } catch (err) {
      setError('Errore nel caricamento dell\'alloggio');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verificaDisponibilita = async () => {
    if (!alloggio || !formData.checkIn || !formData.checkOut) {
      setDisponibile(null);
      return;
    }
    
    console.log('Verificando disponibilità per:', {
      alloggio: alloggio.id,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut
    });
    
    try {
      setVerificandoDisponibilita(true);
      
      const isAvailable = await apiService.verificaDisponibilita(
        alloggio.id,
        formData.checkIn,
        formData.checkOut
      );
      
      setDisponibile(isAvailable);
      
      if (isAvailable) {
        const checkInDate = new Date(formData.checkIn);
        const checkOutDate = new Date(formData.checkOut);
        const notti = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24));
        setNumeroNotti(notti);
        setPrezzoTotale(notti * alloggio.prezzo_notte);
      } else {
        setNumeroNotti(0);
        setPrezzoTotale(0);
      }
      
    } catch (err) {
      console.error('Errore verifica disponibilità:', err);
      setDisponibile(false);
      setNumeroNotti(0);
      setPrezzoTotale(0);
    } finally {
      setVerificandoDisponibilita(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'ospiteTelefono' || name === 'noteCliente') ? (value.trim() === '' ? null : value) : (name === 'numeroOspiti' ? parseInt(value) : value)
    }));
    if (name === 'checkIn' || name === 'checkOut' || name === 'numeroOspiti') {
      setDisponibile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!alloggio || disponibile === null || disponibile === false) {
      setSubmitError('Si prega di verificare la disponibilità e compilare tutti i campi richiesti.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      
      const checkinDate = new Date(formData.checkIn);
      const checkoutDate = new Date(formData.checkOut);
      const diffTime = Math.abs(checkoutDate.getTime() - checkinDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const prezzoTotaleCalcolato = diffDays * alloggio.prezzo_notte;

      const prenotazioneData: PrenotazioneData = {
        alloggio: alloggio.id,
        ospite_nome: formData.ospiteNome,
        ospite_email: formData.ospiteEmail,
        ospite_telefono: formData.ospiteTelefono,
        check_in: formData.checkIn,
        check_out: formData.checkOut,
        numero_ospiti: formData.numeroOspiti,
        prezzo_totale: prezzoTotaleCalcolato.toFixed(2),
        stato: 'PENDENTE', // <-- CORREZIONE QUI: da 'PENDING' a 'PENDENTE'
        note_cliente: formData.noteCliente
      };

      console.log('Dati prenotazione da inviare (DEBUG):', prenotazioneData);

      const responsePrenotazione = await apiService.creaPrenotazione(prenotazioneData);
      console.log('Risposta backend (prenotazione creata):', responsePrenotazione);
      
      setSuccessMessage('Prenotazione effettuata con successo! Reindirizzamento alla pagina di conferma...');

      navigate('/prenotazione-confermata', {
        state: {
          bookingDetails: {
            ...responsePrenotazione,
            alloggio_details: {
              id: alloggio.id,
              nome: alloggio.nome,
              posizione: alloggio.posizione,
              prezzo_notte: alloggio.prezzo_notte.toFixed(2),
              foto: alloggio.foto,
            }
          }
        }
      });

    } catch (err: any) {
      console.error('Errore creazione prenotazione:', err);
      if (err instanceof Error) {
        setSubmitError(`Errore durante la prenotazione: ${err.message}`);
      } else if (err.response && err.response.json) {
        const errorData = await err.response.json();
        let msg = 'Errore di validazione: ';
        for (const key in errorData) {
          if (Object.prototype.hasOwnProperty.call(errorData, key)) {
            msg += `${key}: ${Array.isArray(errorData[key]) ? errorData[key].join(', ') : errorData[key]}; `;
          }
        }
        setSubmitError(msg);
      } else {
        setSubmitError('Errore sconosciuto durante la prenotazione. Riprova.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMinCheckOut = () => {
    if (!formData.checkIn) return getTodayDate();
    const checkIn = new Date(formData.checkIn);
    checkIn.setDate(checkIn.getDate() + 1);
    return checkIn.toISOString().split('T')[0];
  };

  if (loading) {
    return <div className={styles.loading}>Caricamento modulo di prenotazione...</div>;
  }

  if (error || !alloggio) {
    return (
      <div className={styles.error}>
        <h1>Errore</h1>
        <p>{error || 'Dettagli alloggio non disponibili. Assicurati di aver selezionato un alloggio valido.'}</p>
        <button onClick={() => navigate('/')} className={styles.button}>Torna alla Homepage</button>
      </div>
    );
  }

  return (
    <div className={styles.bookingPage}>
      <div className={styles.container}>
        <header className={styles.header}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            ← Indietro
          </button>
          <h1>Prenotazione</h1>
        </header>

        <div className={styles.content}>
          <div className={styles.alloggioInfo}>
            <div className={styles.alloggioCard}>
              {alloggio.immagine_principale && (
                <img 
                  src={alloggio.immagine_principale} 
                  alt={alloggio.nome}
                  className={styles.alloggioImage}
                />
              )}
              <div className={styles.alloggioDetails}>
                <h2>{alloggio.nome}</h2>
                <p className={styles.posizione}>{alloggio.posizione}</p>
                <div className={styles.specs}>
                  <span>{alloggio.numero_ospiti_max} ospiti</span>
                  <span>{alloggio.numero_camere} camere</span>
                  <span>{alloggio.numero_bagni} bagni</span>
                </div>
                <div className={styles.price}>
                  <span className={styles.priceAmount}>€{alloggio.prezzo_notte.toFixed(2)}</span>
                  <span className={styles.priceUnit}>/ notte</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.bookingForm}>
            <form onSubmit={handleSubmit}>
              <div className={styles.section}>
                <h3>Date del soggiorno</h3>
                <div className={styles.dateInputs}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="checkIn">Check-in</label>
                    <input
                      type="date"
                      id="checkIn"
                      name="checkIn"
                      value={formData.checkIn}
                      onChange={handleInputChange}
                      min={getTodayDate()}
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label htmlFor="checkOut">Check-out</label>
                    <input
                      type="date"
                      id="checkOut"
                      name="checkOut"
                      value={formData.checkOut}
                      onChange={handleInputChange}
                      min={getMinCheckOut()}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3>Ospiti</h3>
                <div className={styles.inputGroup}>
                  <label htmlFor="numeroOspiti">Numero di ospiti</label>
                  <select
                    id="numeroOspiti"
                    name="numeroOspiti"
                    value={formData.numeroOspiti}
                    onChange={handleInputChange}
                    required
                  >
                    {[...Array(alloggio.numero_ospiti_max)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} {i === 0 ? 'ospite' : 'ospiti'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.checkIn && formData.checkOut && (
                <div className={styles.section}>
                  <div className={styles.disponibilita}>
                    {verificandoDisponibilita ? (
                      <div className={styles.verificando}>Verifica disponibilità in corso...</div>
                    ) : disponibile === true ? (
                      <div className={styles.disponibile}>
                        ✅ Disponibile per {numeroNotti} {numeroNotti === 1 ? 'notte' : 'notti'}
                        <div className={styles.prezzoCalcolo}>
                          Totale: €{prezzoTotale.toFixed(2)}
                        </div>
                      </div>
                    ) : disponibile === false ? (
                      <div className={styles.nonDisponibile}>
                        ❌ Non disponibile per le date selezionate
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {disponibile && (
                <div className={styles.section}>
                  <h3>I tuoi dati</h3>
                  <div className={styles.inputGroup}>
                    <label htmlFor="ospiteNome">Nome completo *</label>
                    <input
                      type="text"
                      id="ospiteNome"
                      name="ospiteNome"
                      value={formData.ospiteNome}
                      onChange={handleInputChange}
                      placeholder="Mario Rossi"
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label htmlFor="ospiteEmail">Email *</label>
                    <input
                      type="email"
                      id="ospiteEmail"
                      name="ospiteEmail"
                      value={formData.ospiteEmail}
                      onChange={handleInputChange}
                      placeholder="mario@example.com"
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label htmlFor="ospiteTelefono">Telefono</label>
                    <input
                      type="tel"
                      id="ospiteTelefono"
                      name="ospiteTelefono"
                      value={formData.ospiteTelefono || ''}
                      onChange={handleInputChange}
                      placeholder="+39 123 456 7890"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label htmlFor="noteCliente">Note aggiuntive</label>
                    <textarea
                      id="noteCliente"
                      name="noteCliente"
                      value={formData.noteCliente || ''}
                      onChange={handleInputChange}
                      placeholder="Richieste speciali, orari di arrivo, ecc..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {submitError && <p className={styles.errorMessage}>{submitError}</p>}
              {successMessage && <p className={styles.successMessage}>{successMessage}</p>}

              {disponibile && (
                <div className={styles.section}>
                  <div className={styles.summary}>
                    <h3>Riepilogo prenotazione</h3>
                    <div className={styles.summaryRow}>
                      <span>Alloggio:</span>
                      <span>{alloggio.nome}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Date:</span>
                      <span>{formData.checkIn} - {formData.checkOut}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Ospiti:</span>
                      <span>{formData.numeroOspiti}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Notti:</span>
                      <span>{numeroNotti}</span>
                    </div>
                    <div className={styles.summaryTotal}>
                      <span>Totale:</span>
                      <span>€{prezzoTotale.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={submitting || !disponibile}
                  >
                    {submitting ? 'Invio in corso...' : 'Conferma Prenotazione'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
