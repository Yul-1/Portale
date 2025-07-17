// frontend/src/pages/BookingConfirmationPage.tsx

import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import styles from './BookingConfirmationPage.module.css';

// Interfaccia per i dati della prenotazione che ci aspettiamo dal backend
interface PrenotazioneData {
  id: number; // L'ID sarà presente dopo la creazione nel backend
  alloggio: number;
  ospite_nome: string;
  ospite_email: string;
  ospite_telefono: string | null;
  check_in: string; // <-- Corretto: usa check_in
  check_out: string; // <-- Corretto: usa check_out
  numero_ospiti: number;
  prezzo_totale: string;
  stato: string;
  note_cliente: string | null; // <-- Corretto: note_cliente
  created_at?: string;
  updated_at?: string;
  alloggio_details?: {
    id: number;
    nome: string;
    posizione: string;
    prezzo_notte: string;
    foto?: Array<{ url: string }>;
  };
}

const BookingConfirmationPage: React.FC = () => {
  const location = useLocation();
  const [bookingDetails, setBookingDetails] = useState<PrenotazioneData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location.state && (location.state as { bookingDetails: PrenotazioneData }).bookingDetails) {
      setBookingDetails((location.state as { bookingDetails: PrenotazioneData }).bookingDetails);
      setLoading(false);
    } else {
      setError("Dettagli della prenotazione non trovati. Si prega di tornare alla pagina di prenotazione o controllare l'URL.");
      setLoading(false);
    }
  }, [location.state]);

  if (loading) {
    return <div className={styles.container}>Caricamento dettagli prenotazione...</div>;
  }

  if (error) {
    return (
      <div className={`${styles.container} ${styles.errorContainer}`}>
        <h2>Errore</h2>
        <p>{error}</p>
        <Link to="/" className={styles.button}>Torna alla Home</Link>
      </div>
    );
  }

  if (!bookingDetails) {
    return (
      <div className={`${styles.container} ${styles.errorContainer}`}>
        <h2>Nessun dettaglio di prenotazione disponibile.</h2>
        <p>Potrebbe esserci stato un problema o la pagina è stata caricata direttamente.</p>
        <Link to="/" className={styles.button}>Torna alla Home</Link>
      </div>
    );
  }

  // Formatta le date per una migliore leggibilità
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('it-IT', options);
    } catch (e) {
      console.error("Errore formattazione data:", e);
      return dateString;
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Prenotazione Confermata!</h1>
      <div className={styles.confirmationCard}>
        <p className={styles.message}>Grazie, <span className={styles.highlight}>{bookingDetails.ospite_nome}</span>! La tua prenotazione è stata ricevuta con successo.</p>
        <p className={styles.message}>Ti abbiamo inviato una email di conferma a <span className={styles.highlight}>{bookingDetails.ospite_email}</span> con tutti i dettagli.</p>

        <div className={styles.detailsSection}>
          <h3>Riepilogo Prenotazione</h3>
          <p><strong>ID Prenotazione:</strong> {bookingDetails.id}</p>
          {bookingDetails.alloggio_details && (
            <>
              <p><strong>Alloggio:</strong> {bookingDetails.alloggio_details.nome}</p>
              <p><strong>Posizione:</strong> {bookingDetails.alloggio_details.posizione}</p>
            </>
          )}
          <p><strong>Check-in:</strong> {formatDate(bookingDetails.check_in)}</p> {/* <-- Corretto qui */}
          <p><strong>Check-out:</strong> {formatDate(bookingDetails.check_out)}</p> {/* <-- Corretto qui */}
          <p><strong>Numero Ospiti:</strong> {bookingDetails.numero_ospiti}</p>
          <p className={styles.totalPrice}><strong>Prezzo Totale:</strong> €{parseFloat(bookingDetails.prezzo_totale).toFixed(2)}</p>
          <p><strong>Stato:</strong> <span className={styles.status}>{bookingDetails.stato.toUpperCase()}</span></p>
        </div>

        <div className={styles.actions}>
          <Link to="/" className={styles.button}>Torna alla Home</Link>
          {/* Potresti aggiungere un link per visualizzare i dettagli della prenotazione, se implementato */}
          {/* <Link to={`/mie-prenotazioni/${bookingDetails.id}`} className={styles.button}>Vedi le mie prenotazioni</Link> */}
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;
