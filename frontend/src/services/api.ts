// frontend/src/services/api.ts

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost/api';

// Interfacce per le Foto
export interface FotoAlloggio {
  id: number;
  image_url: string; // L'URL finale dell'immagine (locale o remoto)
  descrizione: string;
  tipo: 'principale' | 'camera' | 'bagno' | 'cucina' | 'esterno' | 'altro';
  ordine: number;
  larghezza_originale?: number;
  altezza_originale?: number;
  created_at?: string;
  updated_at?: string;
}

// Interfaccia aggiornata per Alloggio
export interface AlloggioData {
  id: number;
  nome: string;
  descrizione: string;
  posizione: string;
  prezzo_notte: number; // Sarà sempre number dopo la normalizzazione
  numero_ospiti_max: number;
  numero_camere: number;
  numero_bagni: number;
  servizi: string[];
  disponibile: boolean;
  immagine_principale?: string; // URL dell'immagine principale (metodo property dal modello)
  foto?: FotoAlloggio[]; // Relazione one-to-many con FotoAlloggio
  numero_foto?: number; // Conteggio foto
  created_at?: string;
  updated_at?: string;
  extra_guests_cost?: number; // Aggiunto per l'API di dettaglio, se Django la espone
}

// Interfaccia per la risposta completa dall'API /alloggi/ (la root dell'oggetto JSON)
export interface ApiListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[]; 
}

// Interfaccia aggiornata per PrenotazioneData
export interface PrenotazioneData {
  id?: number; // L'ID è opzionale perché non esiste al momento della creazione
  alloggio: number; // Corretto: usa 'alloggio' come nel backend per la FK
  ospite_nome: string;
  ospite_email: string;
  ospite_telefono: string | null; // <-- Corretto: ospite_telefono
  check_in: string; // <-- Corretto: check_in
  check_out: string; // <-- Corretto: check_out
  numero_ospiti: number;
  prezzo_totale: string; // Stringa per Decimal
  stato: string;
  note_cliente: string | null; // <-- Corretto: note_cliente
  created_at?: string; // Opzionale, generato dal backend
  updated_at?: string; // Opzionale, generato dal backend
}

// Interfaccia FotoUploadData - MANTENUTA A FINI DI REFERENZA MA NON USATA PER L'UPLOAD DIRETTO
export interface FotoUploadData {
  alloggio: number;
  immagine?: File;
  url_download?: string;
  descrizione?: string;
  tipo?: 'principale' | 'camera' | 'bagno' | 'cucina' | 'esterno' | 'altro';
  ordine?: number;
}


// Gestione token di autenticazione
let authToken: string | null = null;

class ApiService {
  setAuthToken(token: string | null) {
    authToken = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getAuthToken(): string | null {
    if (!authToken) {
      authToken = localStorage.getItem('authToken');
    }
    return authToken;
  }

  private getHeaders(isFormData: boolean = false): HeadersInit {
    const headers: HeadersInit = {};

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.detail || errorData?.message || JSON.stringify(errorData) || `Errore HTTP: ${response.status}`;
      throw new Error(errorMessage);
    }
    return response.json();
  }

  // ==== METODI PER GLI ALLOGGI ====

  async getAlloggi(page: number = 1, pageSize: number = 10): Promise<ApiListResponse<AlloggioData>> {
    const url = new URL(`${API_BASE_URL}/alloggi/`);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('page_size', pageSize.toString());

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    const data = await this.handleResponse<ApiListResponse<AlloggioData>>(response);

    // Se prezzo_notte è una stringa nel backend, convertila qui per coerenza
    data.results = data.results.map(alloggio => ({
      ...alloggio,
      prezzo_notte: typeof alloggio.prezzo_notte === 'string'
        ? parseFloat(alloggio.prezzo_notte)
        : alloggio.prezzo_notte
    }));

    return data;
  }

  async getAlloggio(id: string | number): Promise<AlloggioData> {
    const response = await fetch(`${API_BASE_URL}/alloggi/${id}/`, {
      headers: this.getHeaders(),
    });

    const data = await this.handleResponse<AlloggioData>(response);

    if (typeof data.prezzo_notte === 'string') {
      data.prezzo_notte = parseFloat(data.prezzo_notte);
    }

    return data;
  }

  async createAlloggio(data: Partial<AlloggioData>): Promise<AlloggioData> {
    const response = await fetch(`${API_BASE_URL}/alloggi/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<AlloggioData>(response);
  }

  async updateAlloggio(id: string | number, data: Partial<AlloggioData>): Promise<AlloggioData> {
    const response = await fetch(`${API_BASE_URL}/alloggi/${id}/`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<AlloggioData>(response);
  }

  async deleteAlloggio(id: string | number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/alloggi/${id}/`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Errore nell'eliminazione: ${response.status}`);
    }
  }

  // ==== METODI PER LE FOTO DEGLI ALLOGGI (UPLOAD DISABILITATO DA FRONTEND PER SICUREZZA) ====
  // ... (rimane invariato) ...

  // deleteFoto rimane, in quanto eliminare foto esistenti è una funzionalità amministrativa
  async deleteFoto(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/fotoalloggi/${id}/`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Errore nell'eliminazione della foto: ${response.status}`);
    }
  }

  // ==== METODI PER LE PRENOTAZIONI ====

  async creaPrenotazione(data: PrenotazioneData): Promise<PrenotazioneData> {
    const response = await fetch(`${API_BASE_URL}/prenotazioni/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<PrenotazioneData>(response);
  }

  async verificaDisponibilita(
    alloggioId: number,
    checkIn: string,
    checkOut: string
  ): Promise<boolean> {
    const url = new URL(`${API_BASE_URL}/disponibilita/`);
    url.searchParams.append('alloggio_id', alloggioId.toString());
    url.searchParams.append('check_in', checkIn);
    url.searchParams.append('check_out', checkOut);

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    const data = await this.handleResponse<{ disponibile: boolean }>(response);
    return data.disponibile;
  }

    async cercaDisponibilita(data_inizio: string, data_fine: string): Promise<AlloggioData[]> {
    const url = new URL(`${API_BASE_URL}/verifica-disponibilita/`);
    url.searchParams.append('data_inizio', data_inizio);
    url.searchParams.append('data_fine', data_fine);

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    // Questo endpoint restituisce direttamente un array di alloggi, non un oggetto paginato
    return this.handleResponse<AlloggioData[]>(response);
  }

  // ==== METODI UTILITY ====

  async checkApiStatus(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/status/`);
    return this.handleResponse<any>(response);
  }
}

const apiService = new ApiService();
apiService.getAuthToken();
export default apiService;
