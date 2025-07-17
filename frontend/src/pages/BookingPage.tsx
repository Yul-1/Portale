// frontend/src/pages/BookingPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styles from './BookingPage.module.css';
import apiService, { AlloggioData, PrenotazioneData } from '../services/api';

interface BookingPageState {
  alloggio?: AlloggioData;
  checkIn?: string;
  checkOut?: string;
  numeroOspiti?: number;
}

const BookingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Stato dal router (se passato da AlloggioDetail)
  const stateFromLocation = location.state as BookingPageState || {};
  
  // Stato del componente
  const [alloggio, setAlloggio] = useState<AlloggioData | null>(stateFromLocation.alloggio || null);
  const [loading, setLoading] = useState(!stateFromLocation.alloggio);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Stato del form
  const [formData, setFormData] = useState({
    checkIn: stateFromLocation.checkIn || '',
    checkOut: stateFromLocation.checkOut || '',
    numeroOspiti: stateFromLocation.numeroOspiti || 1,
    ospiteNome: '',
    ospiteEmail: '',
    ospiteTelefono: '',
    noteCliente: ''
  });
  
  // Stato per calcoli
  const [disponibile, setDisponibile] = useState<boolean | null>(null);
  const [prezzoTotale, setPrezzoTotale] = useState(0);
  const [numeroNotti, setNumeroNotti] = useState(0);
  const [verificandoDisponibilita, setVerificandoDisponibilita] = useState(false);

  // Carica alloggio se non passato dallo stato
  useEffect(() => {
    if (!alloggio && id) {
      loadAlloggio();
    }
  }, [id, alloggio]);

  // Verifica disponibilità quando cambiano le date
  useEffect(() => {
    if (alloggio && formData.checkIn && formData.checkOut) {
      verificaDisponibilita();
    }
  }, [alloggio, formData.checkIn, formData.checkOut]);

  const loadAlloggio = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await apiService.getAlloggio(id);
      setAlloggio(data);
    } catch (err) {
      setError('Errore nel caricamento dell\'alloggio');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verificaDisponibilita = async () => {
    if (!alloggio || !formData.checkIn || !formData.checkOut) return;
    
    console.log('Verificando disponibilità per:', {
      alloggio: alloggio.id,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut
    });
    
    try {
      setVerificandoDisponibilita(true);
      
      // USA LO STESSO ENDPOINT CHE FUNZIONA IN AlloggioDetail
      const url = `https://localhost/api/disponibilita/?alloggio_id=${alloggio.id}&check_in=${formData.checkIn}&check_out=${formData.checkOut}`;
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
      
      // Calcola prezzo
      const checkInDate = new Date(formData.checkIn);
      const checkOutDate = new Date(formData.checkOut);
      const notti = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24));
      setNumeroNotti(notti);
      setPrezzoTotale(notti * alloggio.prezzo_notte);
      
    } catch (err) {
      console.error('Errore verifica disponibilità:', err);
      setDisponibile(false);
    } finally {
      setVerificandoDisponibilita(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'numeroOspiti' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!alloggio || !disponibile) {
      alert('Verifica prima la disponibilità');
      return;
    }

    try {
      setSubmitting(true);
      
      // Prepara i dati ESATTI come il backend si aspetta
      const prenotazioneData = {
        alloggio: alloggio.id,  // Non alloggio_id!
        check_in: formData.checkIn,
        check_out: formData.checkOut,
        numero_ospiti: formData.numeroOspiti,
        ospite_nome: formData.ospiteNome,
        ospite_email: formData.ospiteEmail,
        ospite_telefono: formData.ospiteTelefono,
        note_cliente: formData.noteCliente.trim() || ""
      };

      console.log('Dati prenotazione da inviare:', prenotazioneData);

      // USA FETCH DIRETTO (stesso metodo di verificaDisponibilita)
      const response = await fetch('https://localhost/api/prenotazioni/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prenotazioneData),
      });

      const data = await response.json();
      console.log('Risposta backend:', data);

      if (!response.ok) {
        console.error('Errore response:', response.status, data);
        
        // Mostra errori specifici
        if (data && typeof data === 'object') {
          let errorMessage = 'Errori di validazione:\n';
          Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
              errorMessage += `- ${key}: ${data[key].join(', ')}\n`;
            } else {
              errorMessage += `- ${key}: ${data[key]}\n`;
            }
          });
          alert(errorMessage);
        } else {
          alert(`Errore HTTP ${response.status}: ${data.detail || data.message || 'Errore sconosciuto'}`);
        }
        return;
      }
      
      alert(`Prenotazione creata con successo! ID: ${data.alloggio}`);
      navigate('/prenotazioni');
      
    } catch (err: any) {
      console.error('Errore creazione prenotazione:', err);
      alert(`Errore di rete: ${err.message}`);
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
    return <div className={styles.loading}>Caricamento...</div>;
  }

  if (error || !alloggio) {
    return (
      <div className={styles.error}>
        <h1>Errore</h1>
        <p>{error || 'Alloggio non trovato'}</p>
        <button onClick={() => navigate('/')}>Torna alla Homepage</button>
      </div>
    );
  }

  return (
    <div className={styles.bookingPage}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            ← Indietro
          </button>
          <h1>Prenotazione</h1>
        </header>

        <div className={styles.content}>
          {/* Informazioni Alloggio */}
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
                  <span className={styles.priceAmount}>€{alloggio.prezzo_notte}</span>
                  <span className={styles.priceUnit}>/ notte</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Prenotazione */}
          <div className={styles.bookingForm}>
            <form onSubmit={handleSubmit}>
              {/* Date */}
              <div className={styles.section}>
                <h3>Date del soggiorno</h3>
                <div className={styles.dateInputs}>
                  <div className={styles.inputGroup}>
                    <label>Check-in</label>
                    <input
                      type="date"
                      name="checkIn"
                      value={formData.checkIn}
                      onChange={handleInputChange}
                      min={getTodayDate()}
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Check-out</label>
                    <input
                      type="date"
                      name="checkOut"
                      value={formData.checkOut}
                      onChange={handleInputChange}
                      min={getMinCheckOut()}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Ospiti */}
              <div className={styles.section}>
                <h3>Ospiti</h3>
                <div className={styles.inputGroup}>
                  <label>Numero di ospiti</label>
                  <select
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

              {/* Verifica Disponibilità */}
              {formData.checkIn && formData.checkOut && (
                <div className={styles.section}>
                  <div className={styles.disponibilita}>
                    {verificandoDisponibilita ? (
                      <div className={styles.verificando}>Verifica disponibilità in corso...</div>
                    ) : disponibile === true ? (
                      <div className={styles.disponibile}>
                        ✅ Disponibile per {numeroNotti} {numeroNotti === 1 ? 'notte' : 'notti'}
                        <div className={styles.prezzoCalcolo}>
                          Totale: €{prezzoTotale}
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

              {/* Dati Ospite */}
              {disponibile && (
                <div className={styles.section}>
                  <h3>I tuoi dati</h3>
                  <div className={styles.inputGroup}>
                    <label>Nome completo *</label>
                    <input
                      type="text"
                      name="ospiteNome"
                      value={formData.ospiteNome}
                      onChange={handleInputChange}
                      placeholder="Mario Rossi"
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Email *</label>
                    <input
                      type="email"
                      name="ospiteEmail"
                      value={formData.ospiteEmail}
                      onChange={handleInputChange}
                      placeholder="mario@example.com"
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Telefono</label>
                    <input
                      type="tel"
                      name="ospiteTelefono"
                      value={formData.ospiteTelefono}
                      onChange={handleInputChange}
                      placeholder="+39 123 456 7890"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Note aggiuntive</label>
                    <textarea
                      name="noteCliente"
                      value={formData.noteCliente}
                      onChange={handleInputChange}
                      placeholder="Richieste speciali, orari di arrivo, ecc..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Riepilogo e Submit */}
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
                      <span>€{prezzoTotale}</span>
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