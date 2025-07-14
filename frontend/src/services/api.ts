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

// Interfaccia per la parte di paginazione interna (che è il valore del campo 'results' principale)
export interface InnerPaginatedResults<T> {
  count: number;
  num_pages: number;
  page_size: number;
  current_page: number;
  results: T[]; // L'array effettivo di elementi (es. AlloggioData[])
  timestamp: string;
}

// Interfaccia per la risposta completa dall'API /alloggi/ (la root dell'oggetto JSON)
export interface ApiListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: InnerPaginatedResults<T>; // Il campo 'results' contiene l'oggetto con la paginazione interna
  timestamp: string;
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

// Interfaccia FotoUploadData - MANTENUTA A FINI DI REFERENZA MA NON USATA PER L'UPLOAD DIRETTO
// Questa interfaccia è utile per sapere come il backend si aspetta i dati di upload.
export interface FotoUploadData {
  alloggio: number;
  immagine?: File; // Per upload di file
  url_download?: string; // Per download da URL esterno
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

    data.results.results = data.results.results.map(alloggio => ({
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

  // createAlloggio, updateAlloggio, deleteAlloggio rimangono per future funzionalità admin
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

  // Questi metodi sono stati commentati per impedire l'upload diretto di immagini
  // dal frontend per motivi di sicurezza, come richiesto.
  // L'upload deve avvenire tramite l'interfaccia amministrativa del backend.

  /*
  async uploadFotoFromFile(data: FotoUploadData): Promise<FotoAlloggio> {
    console.warn("Upload di foto da file è disabilitato dal frontend per sicurezza.");
    throw new Error("Upload di foto da file non consentito dal frontend.");
    // Logica originale:
    // const formData = new FormData();
    // formData.append('alloggio', data.alloggio.toString());
    // if (data.immagine) { formData.append('immagine', data.immagine); }
    // if (data.descrizione) { formData.append('descrizione', data.descrizione); }
    // if (data.tipo) { formData.append('tipo', data.tipo); }
    // if (data.ordine !== undefined) { formData.append('ordine', data.ordine.toString()); }
    // const response = await fetch(`${API_BASE_URL}/fotoalloggi/`, {
    //   method: 'POST',
    //   headers: this.getHeaders(true),
    //   body: formData,
    // });
    // return this.handleResponse<FotoAlloggio>(response);
  }

  async uploadFotoFromUrl(data: FotoUploadData): Promise<FotoAlloggio> {
    console.warn("Upload di foto da URL è disabilitato dal frontend per sicurezza.");
    throw new Error("Upload di foto da URL non consentito dal frontend.");
    // Logica originale:
    // const response = await fetch(`${API_BASE_URL}/fotoalloggi/`, {
    //   method: 'POST',
    //   headers: this.getHeaders(),
    //   body: JSON.stringify({
    //     alloggio: data.alloggio,
    //     url_download: data.url_download,
    //     descrizione: data.descrizione,
    //     tipo: data.tipo,
    //     ordine: data.ordine,
    //   }),
    // });
    // return this.handleResponse<FotoAlloggio>(response);
  }
  */

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

  async creaPrenotazione(data: PrenotazioneData): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/prenotazioni/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(response);
  }

  async verificaDisponibilita(
    alloggioId: number,
    checkIn: string,
    checkOut: string
  ): Promise<boolean> {
    const url = new URL(`${API_BASE_URL}/alloggi/${alloggioId}/disponibilita/`);
    url.searchParams.append('check_in', checkIn);
    url.searchParams.append('check_out', checkOut);

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    const data = await this.handleResponse<{ disponibile: boolean }>(response);
    return data.disponibile;
  }

  // ==== METODI DI AUTENTICAZIONE ====

  async login(username: string, password: string): Promise<{ token: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await this.handleResponse<{ token: string }>(response);
    this.setAuthToken(data.token);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.warn('Errore durante il logout (potrebbe essere un token già invalido):', error);
    }
    this.setAuthToken(null);
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