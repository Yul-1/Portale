from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny
from .models import Alloggio, FotoAlloggio
from .serializers import (
    AlloggioListSerializer, 
    AlloggioDetailSerializer,
    DisponibilitaSerializer
)
import datetime
import socket


@csrf_exempt  # Solo per test iniziale, rimuovere in produzione
@require_http_methods(["GET"])
def status_view(request):
    """
    Endpoint di test per verificare che l'API funzioni correttamente.
    Restituisce informazioni base sul sistema.
    """
    try:
        hostname = socket.gethostname()
    except:
        hostname = "unknown"
    
    response_data = {
        "status": "ok",
        "message": "API is running",
        "timestamp": datetime.datetime.now().isoformat(),
        "version": "1.0.0",
        "environment": "development",
        "hostname": hostname,
        "path": request.path,
        "method": request.method,
        "headers": {
            "host": request.META.get('HTTP_HOST', ''),
            "user_agent": request.META.get('HTTP_USER_AGENT', ''),
            "x_forwarded_for": request.META.get('HTTP_X_FORWARDED_FOR', ''),
            "x_real_ip": request.META.get('HTTP_X_REAL_IP', ''),
        }
    }
    
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
    permission_classes = [AllowAny]  # Per sviluppo, in produzione usare IsAuthenticatedOrReadOnly
    
    def get_serializer_class(self):
        """Usa serializer diversi per lista e dettaglio."""
        if self.action == 'list':
            return AlloggioListSerializer
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
            'numero_notti': (check_out - check_in).days
        })
    
    def list(self, request, *args, **kwargs):
        """Override del metodo list per aggiungere metadati."""
        response = super().list(request, *args, **kwargs)
        response.data = {
            'count': len(response.data),
            'results': response.data,
            'timestamp': datetime.datetime.now().isoformat()
        }
        return response