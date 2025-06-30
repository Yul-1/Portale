from rest_framework import serializers
from .models import Alloggio, FotoAlloggio


class FotoAlloggioSerializer(serializers.ModelSerializer):
    """Serializer per le foto degli alloggi."""
    
    class Meta:
        model = FotoAlloggio
        fields = ['id', 'url', 'descrizione', 'ordine']
        read_only_fields = ['id']


class AlloggioListSerializer(serializers.ModelSerializer):
    """
    Serializer semplificato per la lista degli alloggi.
    Mostra solo i campi essenziali per ottimizzare le performance.
    """
    foto_principale = serializers.SerializerMethodField()
    
    class Meta:
        model = Alloggio
        fields = [
            'id', 'nome', 'posizione', 'prezzo_notte', 
            'numero_ospiti_max', 'disponibile', 'foto_principale'
        ]
        read_only_fields = ['id']
    
    def get_foto_principale(self, obj):
        """Ritorna l'URL della prima foto o None."""
        prima_foto = obj.foto.first()
        return prima_foto.url if prima_foto else None


class AlloggioDetailSerializer(serializers.ModelSerializer):
    """
    Serializer completo per il dettaglio di un alloggio.
    Include tutte le informazioni e le foto associate.
    """
    foto = FotoAlloggioSerializer(many=True, read_only=True)
    immagini = serializers.SerializerMethodField()
    
    class Meta:
        model = Alloggio
        fields = [
            'id', 'nome', 'descrizione', 'posizione', 'prezzo_notte',
            'numero_ospiti_max', 'numero_camere', 'numero_bagni',
            'servizi', 'disponibile', 'created_at', 'updated_at',
            'foto', 'immagini'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_immagini(self, obj):
        """Ritorna un array di URL delle immagini per compatibilità con il frontend."""
        return [foto.url for foto in obj.foto.all()]
    
    def validate_prezzo_notte(self, value):
        """Valida che il prezzo sia positivo."""
        if value <= 0:
            raise serializers.ValidationError("Il prezzo deve essere maggiore di zero.")
        return value
    
    def validate_servizi(self, value):
        """Valida che servizi sia una lista."""
        if not isinstance(value, list):
            raise serializers.ValidationError("I servizi devono essere una lista.")
        return value


class DisponibilitaSerializer(serializers.Serializer):
    """Serializer per verificare la disponibilità di un alloggio."""
    check_in = serializers.DateField(required=True)
    check_out = serializers.DateField(required=True)
    
    def validate(self, data):
        """Valida che check_out sia dopo check_in."""
        if data['check_out'] <= data['check_in']:
            raise serializers.ValidationError(
                "La data di check-out deve essere successiva al check-in."
            )
        return data