# backend/api/urls.py


from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlloggioViewSet, FotoAlloggioViewSet, PrenotazioneViewSet, status_view, api_root, disponibilita_generale

# Crea un router predefinito
router = DefaultRouter()
# Registra i ViewSets con il router. Rimosso basename='alloggio'
router.register(r'alloggi', AlloggioViewSet) # <-- Modificato qui
router.register(r'fotoalloggi', FotoAlloggioViewSet)
router.register(r'prenotazioni', PrenotazioneViewSet)

urlpatterns = [
    path('', api_root, name='api-root'),
    path('status/', status_view, name='status'),
    path('disponibilita/', disponibilita_generale, name='disponibilita_generale'),
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