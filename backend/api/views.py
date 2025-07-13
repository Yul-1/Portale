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

from .models import Alloggio, FotoAlloggio
from .serializers import (
    AlloggioCreateUpdateSerializer,
    AlloggioDetailSerializer,
    AlloggioListSerializer,
    DisponibilitaSerializer,
    FotoAlloggioSerializer,
    FotoAlloggioUploadSerializer,
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
    permission_classes = [IsAuthenticatedOrReadOnly]  # Permessi: tutti leggono, solo autenticati scrivono

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

    @action(detail=True, methods=['get'])
    def disponibilita(self, request, pk=None):
        """
        Endpoint custom per verificare la disponibilità di un alloggio.
        Richiede parametri check_in e check_out nella query string.

        Esempio: /api/alloggi/1/disponibilita/?check_in=2025-01-10&check_out=2025-01-15
        """
        alloggio = self.get_object()

        # Valida i parametri
        serializer = DisponibilitaSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        check_in = serializer.validated_data['check_in']
        check_out = serializer.validated_data['check_out']

        # Per ora ritorniamo sempre disponibile
        # In futuro qui ci sarà la logica per verificare le prenotazioni esistenti
        return Response({
            'alloggio_id': alloggio.id,
            'alloggio_nome': alloggio.nome,
            'check_in': check_in,
            'check_out': check_out,
            'disponibile': alloggio.disponibile,
            'prezzo_totale': str(
                (check_out - check_in).days * alloggio.prezzo_notte
            ),
            'numero_notti': (check_in - check_out).days  # Corretto: check_out - check_in
        })

    def list(self, request, *args, **kwargs):
        """Override del metodo list per aggiungere metadati e paginazione."""
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