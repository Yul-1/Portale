# Aggiorna il file backend/api/urls.py con questo contenuto completo

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Configurazione del router per le API REST
router = DefaultRouter()
router.register(r'alloggi', views.AlloggioViewSet, basename='alloggio')
router.register(r'fotoalloggi', views.FotoAlloggioViewSet, basename='fotoalloggio')
router.register(r'prenotazioni', views.PrenotazioneViewSet, basename='prenotazione')  # NUOVO

urlpatterns = [
    # Endpoint di stato per health check
    path('status/', views.status_view, name='api_status'),
    
    # Endpoint specifico per verifica disponibilità generale
    path('disponibilita/', views.disponibilita_generale, name='disponibilita_generale'),
    
    # Include tutte le route del router (alloggi, foto, prenotazioni)
    path('', include(router.urls)),
]

# Le seguenti route sono ora disponibili automaticamente tramite il router:
#
# ALLOGGI:
# GET    /api/alloggi/                     - Lista alloggi
# POST   /api/alloggi/                     - Crea nuovo alloggio
# GET    /api/alloggi/{id}/                - Dettagli alloggio
# PUT    /api/alloggi/{id}/                - Aggiorna alloggio (completo)
# PATCH  /api/alloggi/{id}/                - Aggiorna alloggio (parziale)
# DELETE /api/alloggi/{id}/                - Elimina alloggio
# GET    /api/alloggi/{id}/disponibilita/  - Verifica disponibilità alloggio
#
# FOTO:
# GET    /api/fotoalloggi/                 - Lista foto
# POST   /api/fotoalloggi/                 - Upload nuova foto
# GET    /api/fotoalloggi/{id}/            - Dettagli foto
# PUT    /api/fotoalloggi/{id}/            - Aggiorna foto
# DELETE /api/fotoalloggi/{id}/            - Elimina foto
#
# PRENOTAZIONI:
# GET    /api/prenotazioni/                - Lista prenotazioni
# POST   /api/prenotazioni/                - Crea nuova prenotazione
# GET    /api/prenotazioni/{id}/           - Dettagli prenotazione
# PUT    /api/prenotazioni/{id}/           - Aggiorna prenotazione (completo)
# PATCH  /api/prenotazioni/{id}/           - Aggiorna prenotazione (parziale)
# DELETE /api/prenotazioni/{id}/           - Cancella prenotazione
# POST   /api/prenotazioni/{id}/conferma/  - Conferma prenotazione
# POST   /api/prenotazioni/{id}/rifiuta/   - Rifiuta prenotazione
#
# ALTRI:
# GET    /api/status/                      - Status API e database
# GET    /api/disponibilita/               - Verifica disponibilità generale