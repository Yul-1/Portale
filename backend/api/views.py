# backend/api/views.py

import datetime
import os
import socket

from django.db import connection  # Importa connection per il controllo DB
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt  # Importa csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.parsers import FormParser, MultiPartParser  # Per upload file
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.decorators import method_decorator

# Importazioni aggiunte per le email
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings # Per accedere alle impostazioni di Django

from .models import Alloggio, FotoAlloggio, Prenotazione
from .serializers import (
    AlloggioCreateUpdateSerializer,
    AlloggioDetailSerializer,
    AlloggioListSerializer,
    DisponibilitaSerializer,
    FotoAlloggioSerializer,
    FotoAlloggioUploadSerializer,
    PrenotazioneListSerializer,
    PrenotazioneDetailSerializer,
    PrenotazioneCreateSerializer,
    PrenotazioneUpdateSerializer,
)


@csrf_exempt  # Solo per test iniziale, rimuovere in produzione
@require_http_methods(["GET"])
def status_view(request):
    """
    Endpoint di test per verificare che l'API funzioni correttamente.
    Restituisce informazioni base sul sistema e lo stato del database.
    """
    try:
        hostname = socket.gethostname()
    except Exception:
        hostname = "unknown"

    db_status = "ok"
    db_message = "Database connected"
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1"
            )  # Esegue una query semplice per testare la connessione al DB
    except Exception as e:
        db_status = "error"
        db_message = f"Database connection failed: {e}"
        # Se il DB non è connesso, potresti voler restituire un errore HTTP 500
        # return JsonResponse({"status": "error", "message": db_message}, status=500)

    response_data = {
        "status": "ok"
        if db_status == "ok"
        else "degraded",  # "ok" se tutto bene, "degraded" se DB ha problemi ma app risponde
        "message": "API is running",
        "timestamp": datetime.datetime.now().isoformat(),
        "version": "1.0.0",
        "environment": os.environ.get("ENVIRONMENT", "development"),  # Leggi ENVIRONMENT dalla variabile d'ambiente
        "hostname": hostname,
        "path": request.path,
        "method": request.method,
        "headers": {
            "host": request.META.get("HTTP_HOST", ""),
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            "x_forwarded_for": request.META.get("HTTP_X_FORWARDED_FOR", ""),
            "x_real_ip": request.META.get("HTTP_X_REAL_IP", ""),
        },
        "database_status": db_status,
        "database_message": db_message,
    }

    # Se il database non è connesso, restituisci uno stato HTTP 500
    if db_status == "error":
        return JsonResponse(response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR, json_dumps_params={'indent': 2})

    return JsonResponse(response_data, json_dumps_params={'indent': 2})


@api_view(['GET'])
def api_root(request):
    """
    API root endpoint che mostra tutti gli endpoint disponibili.
    Usa Django REST Framework.
    """
    return Response({
        'message': 'Benvenuto alle API del Portale Prenotazioni',
        'endpoints': {
            'status': request.build_absolute_uri('/api/status/'),
            'alloggi': request.build_absolute_uri('/api/alloggi/'),
            'fotoalloggi': request.build_absolute_uri('/api/fotoalloggi/'),  # Nuovo endpoint
            'api-root': request.build_absolute_uri('/api/'),
        },
        'version': '1.0.0',
        'framework': 'Django REST Framework'
    })


class AlloggioViewSet(viewsets.ModelViewSet):
    """
    ViewSet per gestire le operazioni CRUD sugli alloggi.

    list: Ritorna la lista di tutti gli alloggi disponibili
    retrieve: Ritorna il dettaglio di un singolo alloggio
    create: Crea un nuovo alloggio (solo admin)
    update: Aggiorna un alloggio esistente (solo admin)
    destroy: Elimina un alloggio (solo admin)
    """

    queryset = Alloggio.objects.prefetch_related('foto').all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        """Usa serializer diversi per lista, dettaglio e creazione/aggiornamento."""
        if self.action == 'list':
            return AlloggioListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return AlloggioCreateUpdateSerializer
        return AlloggioDetailSerializer

    def get_queryset(self):
        """
        Filtra gli alloggi in base ai parametri della query.
        Permette di filtrare per disponibilità.
        """
        queryset = super().get_queryset()

        # Filtra per disponibilità se richiesto
        disponibile = self.request.query_params.get('disponibile', None)
        if disponibile is not None:
            queryset = queryset.filter(disponibile=disponibile.lower() == 'true')

        return queryset


class FotoAlloggioViewSet(viewsets.ModelViewSet):
    """
    ViewSet per gestire le operazioni CRUD sulle foto degli alloggi.
    Permette l'upload di immagini e l'associazione con un alloggio esistente.
    """

    queryset = FotoAlloggio.objects.all()
    serializer_class = FotoAlloggioSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]  # Per gestire upload di file

    def get_serializer_class(self):
        """Usa serializer diverso per upload vs. altri metodi."""
        if self.action == 'create':
            return FotoAlloggioUploadSerializer
        return FotoAlloggioSerializer

    def perform_create(self, serializer):
        """Salva l'immagine e associala all'alloggio."""
        serializer.save()

    def list(self, request, *args, **kwargs):
        """Override per aggiungere paginazione anche per le foto."""
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'count': self.paginator.page.paginator.count,
                'num_pages': self.paginator.page.paginator.num_pages,
                'page_size': self.paginator.page_size,
                'current_page': self.paginator.page.number,
                'results': serializer.data,
                'timestamp': datetime.datetime.now().isoformat()
            })

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data,
            'timestamp': datetime.datetime.now().isoformat()
        })

@method_decorator(csrf_exempt, name='create')
@method_decorator(csrf_exempt, name='update')
@method_decorator(csrf_exempt, name='partial_update')
class PrenotazioneViewSet(viewsets.ModelViewSet):
    """
    ViewSet per gestire le operazioni CRUD sulle prenotazioni.
    
    Endpoints disponibili:
    - GET /prenotazioni/ - Lista paginata delle prenotazioni
    - POST /prenotazioni/ - Crea una nuova prenotazione
    - GET /prenotazioni/{id}/ - Dettagli di una prenotazione
    - PUT/PATCH /prenotazioni/{id}/ - Aggiorna una prenotazione
    - DELETE /prenotazioni/{id}/ - Cancella una prenotazione
    """
    
    queryset = Prenotazione.objects.all()
    permission_classes = [AllowAny]
    
    # Filtri per le query
    filterset_fields = ['alloggio', 'stato', 'check_in', 'check_out']
    search_fields = ['ospite_nome', 'ospite_email', 'alloggio__nome']
    ordering_fields = ['check_in', 'check_out', 'created_at', 'prezzo_totale']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Restituisce il serializer appropriato in base all'azione."""
        if self.action == 'list':
            return PrenotazioneListSerializer
        elif self.action == 'create':
            return PrenotazioneCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PrenotazioneUpdateSerializer
        else:  # retrieve
            return PrenotazioneDetailSerializer
    
    def get_queryset(self):
        """Filtra le prenotazioni in base ai parametri della query."""
        queryset = super().get_queryset()
        
        # Filtro per alloggio
        alloggio_id = self.request.query_params.get('alloggio', None)
        if alloggio_id:
            queryset = queryset.filter(alloggio_id=alloggio_id)
        
        # Filtro per stato
        stato = self.request.query_params.get('stato', None)
        if stato:
            queryset = queryset.filter(stato=stato)
        
        # Filtro per date
        data_da = self.request.query_params.get('data_da', None)
        data_a = self.request.query_params.get('data_a', None)
        
        if data_da:
            queryset = queryset.filter(check_in__gte=data_da)
        if data_a:
            queryset = queryset.filter(check_out__lte=data_a)
        
        # Filtro per ospite
        ospite = self.request.query_params.get('ospite', None)
        if ospite:
            queryset = queryset.filter(
                models.Q(ospite_nome__icontains=ospite) |
                models.Q(ospite_email__icontains=ospite)
            )
        
        return queryset.select_related('alloggio')
    
    def perform_create(self, serializer):
        """Salva la nuova prenotazione e invia le email di conferma/notifica."""
        prenotazione = serializer.save()
        
        # Log dell'operazione
        print(f"Nuova prenotazione creata: {prenotazione.id} - {prenotazione.ospite_nome}")

        # Ottieni l'alloggio associato alla prenotazione
        alloggio = prenotazione.alloggio 

        # Contesto per i template email
        email_context = {
            'prenotazione': prenotazione,
            'alloggio': alloggio,
            'year': datetime.datetime.now().year, # Usa datetime.datetime.now().year
        }

        # --- Invio Email di Conferma all'Utente ---
        try:
            subject_user = f"Conferma Prenotazione: {alloggio.nome} - ID #{prenotazione.id}"
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email_user = [prenotazione.ospite_email]

            html_content_user = render_to_string('booking_confirmation_email.html', email_context)
            text_content_user = f"""
            Gentile {prenotazione.ospite_nome},

            La tua prenotazione presso il nostro alloggio è stata confermata con successo!

            Dettagli della Prenotazione:
            Alloggio: {alloggio.nome}
            Posizione: {alloggio.posizione}
            Check-in: {prenotazione.check_in.strftime('%d/%m/%Y')}
            Check-out: {prenotazione.check_out.strftime('%d/%m/%Y')}
            Numero Ospiti: {prenotazione.numero_ospiti}
            Prezzo Totale: {prenotazione.prezzo_totale} €
            ID Prenotazione: {prenotazione.id}

            Ti preghiamo di conservare questa email per riferimento futuro. Ti aspettiamo!
            Se hai domande o necessiti di assistenza, non esitare a contattarci.

            © {datetime.datetime.now().year} Portale Alloggi. Tutti i diritti riservati.
            """

            msg_user = EmailMultiAlternatives(subject_user, text_content_user, from_email, to_email_user)
            msg_user.attach_alternative(html_content_user, "text/html")
            msg_user.send()
            print(f"Email di conferma inviata a: {prenotazione.ospite_email}")
        except Exception as e:
            print(f"Errore durante l'invio dell'email di conferma all'utente: {e}")
            # Considera di loggare l'errore o di inviare una notifica all'amministratore

        # --- Invio Email di Notifica all'Amministratore ---
        try:
            subject_admin = f"Nuova Prenotazione Ricevuta: {alloggio.nome} - ID #{prenotazione.id}"
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email_admin = [settings.ADMIN_EMAIL] # Usa l'email dell'amministratore definita in settings

            html_content_admin = render_to_string('admin_booking_notification_email.html', email_context)
            text_content_admin = f"""
            Ciao Amministratore,

            È stata effettuata una nuova prenotazione sul Portale Alloggi.

            Dettagli della Prenotazione:
            ID Prenotazione: {prenotazione.id}
            Alloggio: {alloggio.nome}
            Posizione Alloggio: {alloggio.posizione}
            Ospite: {prenotazione.ospite_nome}
            Email Ospite: {prenotazione.ospite_email}
            Telefono Ospite: {prenotazione.ospite_telefono}
            Check-in: {prenotazione.check_in.strftime('%d/%m/%Y')}
            Check-out: {prenotazione.check_out.strftime('%d/%m/%Y')}
            Numero Ospiti: {prenotazione.numero_ospiti}
            Prezzo Totale: {prenotazione.prezzo_totale} €

            Accedi al pannello di amministrazione per maggiori dettagli.

            © {datetime.datetime.now().year} Portale Alloggi. Tutti i diritti riservati.
            """

            msg_admin = EmailMultiAlternatives(subject_admin, text_content_admin, from_email, to_email_admin)
            msg_admin.attach_alternative(html_content_admin, "text/html")
            msg_admin.send()
            print(f"Email di notifica inviata all'amministratore: {settings.ADMIN_EMAIL}")
        except Exception as e:
            print(f"Errore durante l'invio dell'email di notifica all'amministratore: {e}")
            # Considera di loggare l'errore
    
    def perform_update(self, serializer):
        """Aggiorna la prenotazione esistente."""
        prenotazione = serializer.save()
        
        # Log dell'operazione
        print(f"Prenotazione aggiornata: {prenotazione.id} - {prenotazione.ospite_nome}")
    
    def perform_destroy(self, instance):
        """Elimina la prenotazione (soft delete tramite cambio stato)."""
        if instance.is_cancellabile():
            instance.stato = 'CANCELLATA'
            instance.save()
            print(f"Prenotazione cancellata: {instance.id} - {instance.ospite_nome}")
        else:
            raise ValidationError(
                "Impossibile cancellare questa prenotazione. "
                "Contattare l'amministratore per l'assistenza."
            )
    
    @action(detail=True, methods=['post'])
    def conferma(self, request, pk=None):
        """
        Endpoint per confermare una prenotazione.
        POST /prenotazioni/{id}/conferma/
        """
        prenotazione = self.get_object()
        
        if prenotazione.stato != 'PENDENTE':
            return Response(
                {'error': 'Solo le prenotazioni pendenti possono essere confermate.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        prenotazione.stato = 'CONFERMATA'
        prenotazione.save()
        
        serializer = self.get_serializer(prenotazione)
        return Response({
            'message': 'Prenotazione confermata con successo.',
            'prenotazione': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def rifiuta(self, request, pk=None):
        """
        Endpoint per rifiutare una prenotazione.
        POST /prenotazioni/{id}/rifiuta/
        """
        prenotazione = self.get_object()
        
        if prenotazione.stato not in ['PENDENTE', 'CONFERMATA']:
            return Response(
                {'error': 'Solo le prenotazioni pendenti o confermate possono essere rifiutate.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        motivo = request.data.get('motivo', '')
        if motivo:
            prenotazione.note_interne = f"Rifiutata: {motivo}"
        
        prenotazione.stato = 'RIFIUTATA'
        prenotazione.save()
        
        serializer = self.get_serializer(prenotazione)
        return Response({
            'message': 'Prenotazione rifiutata.',
            'prenotazione': serializer.data
        })
    
    def list(self, request, *args, **kwargs):
        """Override per aggiungere metadati alla risposta paginata."""
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'count': self.paginator.page.paginator.count,
                'num_pages': self.paginator.page.paginator.num_pages,
                'page_size': self.paginator.page_size,
                'current_page': self.paginator.page.number,
                'results': serializer.data,
                'timestamp': datetime.datetime.now().isoformat()
            })

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data,
            'timestamp': datetime.datetime.now().isoformat()
        })


# Aggiungi l'action di disponibilità alla classe AlloggioViewSet esistente
# (questa va aggiunta DENTRO la classe AlloggioViewSet esistente)

@action(detail=True, methods=['get'])
def disponibilita(self, request, pk=None):
    """
    Endpoint per verificare la disponibilità di un alloggio.
    GET /alloggi/{id}/disponibilita/?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD
    """
    alloggio = self.get_object()
    
    # Ottieni i parametri dalla query string
    check_in = request.query_params.get('check_in')
    check_out = request.query_params.get('check_out')
    
    if not check_in or not check_out:
        return Response(
            {'error': 'Parametri check_in e check_out sono obbligatori.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Valida i dati usando il serializer
    serializer = DisponibilitaSerializer(data={
        'alloggio_id': alloggio.id,
        'check_in': check_in,
        'check_out': check_out
    })
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Verifica disponibilità
    disponibile = serializer.get_disponibilita()
    
    # Calcola informazioni aggiuntive
    numero_notti = (serializer.validated_data['check_out'] - 
                   serializer.validated_data['check_in']).days
    prezzo_totale = alloggio.prezzo_notte * numero_notti
    
    return Response({
        'disponibile': disponibile,
        'alloggio': {
            'id': alloggio.id,
            'nome': alloggio.nome,
            'prezzo_notte': alloggio.prezzo_notte,
        },
        'periodo': {
            'check_in': check_in,
            'check_out': check_out,
            'numero_notti': numero_notti,
        },
        'calcolo': {
            'prezzo_totale': prezzo_totale,
            'prezzo_per_notte': alloggio.prezzo_notte,
        }
    })


@api_view(['GET'])
@csrf_exempt
def disponibilita_generale(request):
    """
    Endpoint per verificare la disponibilità generale.
    GET /api/disponibilita/?alloggio_id=1&check_in=YYYY-MM-DD&check_out=YYYY-MM-DD
    """
    alloggio_id = request.query_params.get('alloggio_id')
    check_in = request.query_params.get('check_in')
    check_out = request.query_params.get('check_out')
    
    if not all([alloggio_id, check_in, check_out]):
        return Response(
            {'error': 'Parametri alloggio_id, check_in e check_out sono obbligatori.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Valida i dati
    serializer = DisponibilitaSerializer(data={
        'alloggio_id': alloggio_id,
        'check_in': check_in,
        'check_out': check_out
    })
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Verifica disponibilità
    disponibile = serializer.get_disponibilita()
    
    return Response({
        'disponibile': disponibile,
        'message': 'Disponibile' if disponibile else 'Non disponibile per le date selezionate'
    })
