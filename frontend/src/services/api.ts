const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost/api';

export interface AlloggioData {
  id: number;
  nome: string;
  descrizione: string;
  posizione: string;
  prezzo_notte: number;
  numero_ospiti_max: number;
  numero_camere: number;
  numero_bagni: number;
  servizi: string[];
  disponibile: boolean;
}

export interface PrenotazioneData {
  alloggio_id: number;
  check_in: string;
  check_out: string;
  numero_ospiti: number;
  ospite_nome?: string;
  ospite_email?: string;
  ospite_telefono?: string;
}

class ApiService {
  // Recupera tutti gli alloggi
  async getAlloggi(): Promise<AlloggioData[]> {
    const response = await fetch(`${API_BASE_URL}/alloggi/`);
    if (!response.ok) throw new Error('Errore nel recupero degli alloggi');
    return response.json();
  }

  // Recupera un singolo alloggio
  async getAlloggio(id: string): Promise<AlloggioData> {
    const response = await fetch(`${API_BASE_URL}/alloggi/${id}/`);
    if (!response.ok) throw new Error('Alloggio non trovato');
    return response.json();
  }

  // Crea una prenotazione
  async creaPrenotazione(data: PrenotazioneData): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/prenotazioni/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Errore nella creazione della prenotazione');
    return response.json();
  }

  // Verifica disponibilità
  async verificaDisponibilita(alloggioId: number, checkIn: string, checkOut: string): Promise<boolean> {
    const response = await fetch(
      `${API_BASE_URL}/alloggi/${alloggioId}/disponibilita/?check_in=${checkIn}&check_out=${checkOut}`
    );
    if (!response.ok) throw new Error('Errore nella verifica disponibilità');
    const data = await response.json();
    return data.disponibile;
  }
}

export default new ApiService();