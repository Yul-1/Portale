// frontend/src/services/api.ts

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost/api';

// Interfacce per le Foto
export interface FotoAlloggio {
  id: number;
  image_url: string;
  descrizione: string;
  tipo: 'principale' | 'camera' | 'bagno' | 'cucina' | 'esterno' | 'altro';
  ordine: number;
}

// Interfaccia aggiornata per Alloggio
export interface AlloggioData {
  id: number;
  nome: string;
  descrizione: string;
  posizione: string;
  prezzo_notte: number | string; // Il backend ritorna string
  numero_ospiti_max: number;
  numero_camere: number;
  numero_bagni: number;
  servizi: string[];
  disponibile: boolean;
  immagine_principale?: string;
  foto?: FotoAlloggio[];
  immagini?: string[]; // Array di URL per retrocompatibilità
  numero_foto?: number;
  created_at?: string;
  updated_at?: string;
}

// Response wrapper dal backend
export interface ApiListResponse<T> {
  count: number;
  results: T[];
  timestamp: string;
  num_pages?: number;
  page_size?: number;
  current_page?: number;
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

// Interfaccia per l'upload di foto
export interface FotoUploadData {
  alloggio: number;
  immagine?: File;
  url?: string;
  descrizione?: string;
  tipo?: 'principale' | 'camera' | 'bagno' | 'cucina' | 'esterno' | 'altro';
  ordine?: number;
}

// Gestione token di autenticazione
let authToken: string | null = null;

class ApiService {
  // Metodo per impostare il token di autenticazione
  setAuthToken(token: string | null) {
    authToken = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Recupera il token salvato
  getAuthToken(): string | null {
    if (!authToken) {
      authToken = localStorage.getItem('authToken');
    }
    return authToken;
  }

  // Headers di base per le richieste
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

  // Gestione errori centralizzata
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.detail || errorData?.message || `Errore HTTP: ${response.status}`;
      throw new Error(errorMessage);
    }
    return response.json();
  }

  // ==== METODI PER GLI ALLOGGI ====
  
  // Recupera tutti gli alloggi con paginazione opzionale
  async getAlloggi(page: number = 1, pageSize: number = 10): Promise<ApiListResponse<AlloggioData>> {
    const url = new URL(`${API_BASE_URL}/alloggi/`);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('page_size', pageSize.toString());
    
    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    
    const data = await this.handleResponse<ApiListResponse<AlloggioData>>(response);
    
    // Normalizza i prezzi da string a number se necessario
    data.results = data.results.map(alloggio => ({
      ...alloggio,
      prezzo_notte: typeof alloggio.prezzo_notte === 'string' 
        ? parseFloat(alloggio.prezzo_notte) 
        : alloggio.prezzo_notte
    }));
    
    return data;
  }

  // Recupera un singolo alloggio con tutti i dettagli
  async getAlloggio(id: string | number): Promise<AlloggioData> {
    const response = await fetch(`${API_BASE_URL}/alloggi/${id}/`, {
      headers: this.getHeaders(),
    });
    
    const data = await this.handleResponse<AlloggioData>(response);
    
    // Normalizza il prezzo
    if (typeof data.prezzo_notte === 'string') {
      data.prezzo_notte = parseFloat(data.prezzo_notte);
    }
    
    return data;
  }

  // Crea un nuovo alloggio (richiede autenticazione)
  async createAlloggio(data: Partial<AlloggioData>): Promise<AlloggioData> {
    const response = await fetch(`${API_BASE_URL}/alloggi/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    return this.handleResponse<AlloggioData>(response);
  }

  // Aggiorna un alloggio esistente (richiede autenticazione)
  async updateAlloggio(id: string | number, data: Partial<AlloggioData>): Promise<AlloggioData> {
    const response = await fetch(`${API_BASE_URL}/alloggi/${id}/`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    return this.handleResponse<AlloggioData>(response);
  }

  // Elimina un alloggio (richiede autenticazione)
  async deleteAlloggio(id: string | number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/alloggi/${id}/`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Errore nell'eliminazione: ${response.status}`);
    }
  }

  // ==== METODI PER LE FOTO ====
  
  // Upload foto da file
  async uploadFotoFile(data: FotoUploadData): Promise<FotoAlloggio> {
    const formData = new FormData();
    formData.append('alloggio', data.alloggio.toString());
    
    if (data.immagine) {
      formData.append('immagine', data.immagine);
    }
    
    if (data.descrizione) {
      formData.append('descrizione', data.descrizione);
    }
    
    if (data.tipo) {
      formData.append('tipo', data.tipo);
    }
    
    if (data.ordine !== undefined) {
      formData.append('ordine', data.ordine.toString());
    }
    
    const response = await fetch(`${API_BASE_URL}/foto-alloggi/`, {
      method: 'POST',
      headers: this.getHeaders(true), // true = no Content-Type per FormData
      body: formData,
    });
    
    return this.handleResponse<FotoAlloggio>(response);
  }

  // Upload foto da URL
  async uploadFotoUrl(data: FotoUploadData): Promise<FotoAlloggio> {
    const response = await fetch(`${API_BASE_URL}/foto-alloggi/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        alloggio: data.alloggio,
        url: data.url,
        descrizione: data.descrizione,
        tipo: data.tipo,
        ordine: data.ordine,
      }),
    });
    
    return this.handleResponse<FotoAlloggio>(response);
  }

  // Elimina una foto
  async deleteFoto(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/foto-alloggi/${id}/`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Errore nell'eliminazione della foto: ${response.status}`);
    }
  }

  // ==== METODI PER LE PRENOTAZIONI ====
  
  // Crea una prenotazione
  async creaPrenotazione(data: PrenotazioneData): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/prenotazioni/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    return this.handleResponse<any>(response);
  }

  // Verifica disponibilità
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
  
  // Login
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

  // Logout
  async logout(): Promise<void> {
    // Se il backend ha un endpoint di logout
    try {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch (error) {
      // Ignora errori di logout
    }
    
    this.setAuthToken(null);
  }

  // ==== METODI UTILITY ====
  
  // Verifica lo stato dell'API
  async checkApiStatus(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/status/`);
    return this.handleResponse<any>(response);
  }
}

// Esporta un'istanza singleton
const apiService = new ApiService();

// Recupera il token salvato all'avvio
apiService.getAuthToken();

export default apiService;