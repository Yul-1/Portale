from rest_framework import serializers
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from .models import Alloggio, FotoAlloggio, Prenotazione 
import requests
from django.core.files.base import ContentFile
import re


class FotoAlloggioSerializer(serializers.ModelSerializer):
    """
    Serializer per le foto degli alloggi.
    Gestisce sia upload di file che URL esterni.
    """
    # Campo read-only per l'URL finale dell'immagine
    image_url = serializers.SerializerMethodField()
    
    # Override del campo immagine per gestire Base64
    immagine = serializers.ImageField(
        required=False,
        allow_null=True,
        max_length=None,
        use_url=True
    )
    
    class Meta:
        model = FotoAlloggio
        fields = [
            'id', 'immagine', 'url', 'image_url', 'descrizione', 
            'tipo', 'ordine', 'larghezza_originale', 'altezza_originale',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['larghezza_originale', 'altezza_originale', 'created_at', 'updated_at']
    
    def get_image_url(self, obj):
        """Ritorna l'URL dell'immagine (locale o remoto)."""
        request = self.context.get('request')
        if obj.immagine and request:
            return request.build_absolute_uri(obj.immagine.url)
        return obj.url or ''
    
    def validate(self, data):
        """Validazione custom per assicurare che ci sia immagine O url."""
        # Se stiamo aggiornando, prendiamo i valori esistenti
        if self.instance:
            immagine = data.get('immagine', self.instance.immagine)
            url = data.get('url', self.instance.url)
        else:
            immagine = data.get('immagine')
            url = data.get('url')
        
        # Validazione: deve esserci almeno uno dei due
        if not immagine and not url:
            raise serializers.ValidationError(
                "Devi fornire un'immagine o un URL."
            )
        
        # Validazione: non possono esserci entrambi
        if immagine and url:
            raise serializers.ValidationError(
                "Puoi fornire solo un'immagine O un URL, non entrambi."
            )
        
        # Validazione URL se presente
        if url:
            validator = URLValidator()
            try:
                validator(url)
                # Verifica che sia un URL di immagine
                if not re.match(r'.*\.(jpg|jpeg|png|gif|webp)(\?.*)?$', url.lower()):
                    # Se non ha estensione, proviamo a verificare il content-type
                    try:
                        response = requests.head(url, timeout=5, allow_redirects=True)
                        content_type = response.headers.get('content-type', '')
                        if not content_type.startswith('image/'):
                            raise serializers.ValidationError(
                                "L'URL deve puntare a un'immagine valida."
                            )
                    except:
                        # Se non riusciamo a verificare, accettiamo l'URL
                        pass
            except ValidationError:
                raise serializers.ValidationError("URL non valido.")
        
        return data


class FotoAlloggioListSerializer(serializers.ModelSerializer):
    """Serializer semplificato per le liste di foto."""
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = FotoAlloggio
        fields = ['id', 'image_url', 'descrizione', 'tipo', 'ordine']
    
    def get_image_url(self, obj):
        """Ritorna l'URL dell'immagine (locale o remoto)."""
        request = self.context.get('request')
        if obj.immagine and request:
            return request.build_absolute_uri(obj.immagine.url)
        return obj.url or ''


class AlloggioListSerializer(serializers.ModelSerializer):
    """
    Serializer per la lista degli alloggi.
    Include solo informazioni essenziali per performance.
    """
    immagine_principale = serializers.SerializerMethodField()
    numero_foto = serializers.IntegerField(source='foto.count', read_only=True)
    
    class Meta:
        model = Alloggio
        fields = [
            'id', 'nome', 'posizione', 'prezzo_notte', 
            'numero_ospiti_max', 'disponibile', 'immagine_principale',
            'numero_foto'
        ]
    
    def get_immagine_principale(self, obj):
        """Ritorna l'URL dell'immagine principale."""
        request = self.context.get('request')
        foto = obj.foto.filter(ordine=0).first() or obj.foto.first()
        if foto:
            if foto.immagine and request:
                return request.build_absolute_uri(foto.immagine.url)
            return foto.url
        return None


class AlloggioDetailSerializer(serializers.ModelSerializer):
    """
    Serializer dettagliato per singolo alloggio.
    Include tutte le informazioni e le foto associate.
    """
    foto = FotoAlloggioListSerializer(many=True, read_only=True)
    immagine_principale = serializers.SerializerMethodField()
    immagini = serializers.SerializerMethodField()  # Per compatibilità frontend
    
    class Meta:
        model = Alloggio
        fields = [
            'id', 'nome', 'descrizione', 'posizione', 'prezzo_notte',
            'numero_ospiti_max', 'numero_camere', 'numero_bagni',
            'servizi', 'disponibile', 'immagine_principale', 'foto',
            'immagini', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_immagine_principale(self, obj):
        """Ritorna l'URL dell'immagine principale."""
        request = self.context.get('request')
        foto = obj.foto.filter(ordine=0).first() or obj.foto.first()
        if foto:
            if foto.immagine and request:
                return request.build_absolute_uri(foto.immagine.url)
            return foto.url
        return None
    
    def get_immagini(self, obj):
        """Ritorna un array di URL delle immagini per compatibilità con il frontend."""
        request = self.context.get('request')
        urls = []
        for foto in obj.foto.all():
            if foto.immagine and request:
                urls.append(request.build_absolute_uri(foto.immagine.url))
            elif foto.url:
                urls.append(foto.url)
        return urls
    def validate_servizi(self, value):
        """Valida che servizi sia una lista di stringhe."""
        if not isinstance(value, list):
            raise serializers.ValidationError("I servizi devono essere una lista.")
        
        for servizio in value:
            if not isinstance(servizio, str):
                raise serializers.ValidationError("Ogni servizio deve essere una stringa.")
            if len(servizio) > 100:
                raise serializers.ValidationError("Ogni servizio non può superare i 100 caratteri.")
        
        return value
    
    def validate_prezzo_notte(self, value):
        """Validazione custom per il prezzo."""
        if value <= 0:
            raise serializers.ValidationError("Il prezzo deve essere maggiore di zero.")
        if value > 10000:
            raise serializers.ValidationError("Il prezzo non può superare €10.000 a notte.")
        return value


class AlloggioCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer per creazione e aggiornamento alloggi.
    Include validazioni extra per sicurezza.
    """
    class Meta:
        model = Alloggio
        fields = [
            'nome', 'descrizione', 'posizione', 'prezzo_notte',
            'numero_ospiti_max', 'numero_camere', 'numero_bagni',
            'servizi', 'disponibile'
        ]
    
    def validate_nome(self, value):
        """Validazione del nome con sanitizzazione."""
        # Rimuovi spazi multipli
        value = ' '.join(value.split())
        
        # Verifica lunghezza
        if len(value) < 3:
            raise serializers.ValidationError("Il nome deve contenere almeno 3 caratteri.")
        
        # Verifica caratteri speciali pericolosi
        if re.search(r'[<>\"\'&]', value):
            raise serializers.ValidationError("Il nome contiene caratteri non permessi.")
        
        return value
    
    def validate_descrizione(self, value):
        """Sanitizzazione base della descrizione."""
        # Rimuovi tag HTML potenzialmente pericolosi
        value = re.sub(r'<script.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
        value = re.sub(r'<iframe.*?</iframe>', '', value, flags=re.IGNORECASE | re.DOTALL)
        return value


class FotoAlloggioUploadSerializer(serializers.ModelSerializer):
    """
    Serializer specializzato per l'upload di foto.
    Gestisce sia file che URL con download automatico.
    """
    url_download = serializers.URLField(
        write_only=True, 
        required=False,
        help_text="URL da cui scaricare l'immagine"
    )
    
    class Meta:
        model = FotoAlloggio
        fields = [
            'alloggio', 'immagine', 'url', 'url_download',
            'descrizione', 'tipo', 'ordine'
        ]
    
    def validate_url_download(self, value):
        """Valida e scarica l'immagine dall'URL."""
        if value:
            try:
                # Scarica l'immagine con timeout
                response = requests.get(value, timeout=10, stream=True)
                response.raise_for_status()
                
                # Verifica il content-type
                content_type = response.headers.get('content-type', '')
                if not content_type.startswith('image/'):
                    raise serializers.ValidationError("L'URL non punta a un'immagine valida.")
                
                # Verifica la dimensione
                content_length = response.headers.get('content-length')
                if content_length and int(content_length) > 10 * 1024 * 1024:  # 10MB
                    raise serializers.ValidationError("L'immagine è troppo grande (max 10MB).")
                
                return value
            except requests.RequestException as e:
                raise serializers.ValidationError(f"Impossibile scaricare l'immagine: {str(e)}")
        return value
    
    def create(self, validated_data):
        """Crea la foto gestendo il download se necessario."""
        url_download = validated_data.pop('url_download', None)
        
        if url_download:
            # Scarica e salva l'immagine
            try:
                response = requests.get(url_download, timeout=10)
                response.raise_for_status()
                
                # Estrai il nome del file dall'URL
                filename = url_download.split('/')[-1].split('?')[0]
                if not filename:
                    filename = 'downloaded_image.jpg'
                
                # Crea il file Django
                validated_data['immagine'] = ContentFile(
                    response.content,
                    name=filename
                )
                # Rimuovi l'URL se stiamo salvando l'immagine localmente
                validated_data.pop('url', None)
            except Exception as e:
                raise serializers.ValidationError(f"Errore nel download: {str(e)}")
        
        return super().create(validated_data)


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

class PrenotazioneListSerializer(serializers.ModelSerializer):
    """
    Serializer per la lista delle prenotazioni.
    Include informazioni essenziali senza troppi dettagli.
    """
    alloggio_nome = serializers.CharField(source='alloggio.nome', read_only=True)
    stato_display = serializers.CharField(source='get_stato_display', read_only=True)
    
    class Meta:
        model = Prenotazione
        fields = [
            'id', 'alloggio', 'alloggio_nome', 'check_in', 'check_out',
            'numero_ospiti', 'numero_notti', 'prezzo_totale', 
            'ospite_nome', 'ospite_email', 'stato', 'stato_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'numero_notti', 'prezzo_totale', 'alloggio_nome', 
            'stato_display', 'created_at', 'updated_at'
        ]


class PrenotazioneDetailSerializer(serializers.ModelSerializer):
    """
    Serializer dettagliato per una singola prenotazione.
    Include tutte le informazioni e dettagli dell'alloggio.
    """
    alloggio_dettagli = AlloggioListSerializer(source='alloggio', read_only=True)
    stato_display = serializers.CharField(source='get_stato_display', read_only=True)
    is_modificabile = serializers.BooleanField(read_only=True)
    is_cancellabile = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Prenotazione
        fields = [
            'id', 'alloggio', 'alloggio_dettagli', 'check_in', 'check_out',
            'numero_ospiti', 'numero_notti', 'prezzo_totale',
            'ospite_nome', 'ospite_email', 'ospite_telefono',
            'stato', 'stato_display', 'note_cliente', 'note_interne',
            'is_modificabile', 'is_cancellabile',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'numero_notti', 'prezzo_totale', 'alloggio_dettagli',
            'stato_display', 'is_modificabile', 'is_cancellabile',
            'created_at', 'updated_at'
        ]


class PrenotazioneCreateSerializer(serializers.ModelSerializer):
    """
    Serializer per la creazione di nuove prenotazioni.
    Include validazioni specifiche per la creazione.
    """
    
    class Meta:
        model = Prenotazione
        fields = [
            'alloggio', 'check_in', 'check_out', 'numero_ospiti',
            'ospite_nome', 'ospite_email', 'ospite_telefono', 'note_cliente'
        ]
    
    def validate(self, data):
        """Validazioni custom per la creazione."""
        from django.utils import timezone
        from datetime import timedelta
        
        alloggio = data.get('alloggio')
        check_in = data.get('check_in')
        check_out = data.get('check_out')
        numero_ospiti = data.get('numero_ospiti')
        
        # Validazione base delle date
        if check_out <= check_in:
            raise serializers.ValidationError(
                "La data di check-out deve essere successiva al check-in."
            )
        
        # Validazione data nel passato
        if check_in < timezone.now().date():
            raise serializers.ValidationError(
                "La data di check-in non può essere nel passato."
            )
        
        # Validazione soggiorno minimo (almeno 1 notte)
        if (check_out - check_in).days < 1:
            raise serializers.ValidationError(
                "Il soggiorno deve essere di almeno 1 notte."
            )
        
        # Validazione soggiorno massimo (max 30 giorni)
        if (check_out - check_in).days > 30:
            raise serializers.ValidationError(
                "Il soggiorno non può superare i 30 giorni."
            )
        
        # Validazione numero ospiti
        if alloggio and numero_ospiti > alloggio.numero_ospiti_max:
            raise serializers.ValidationError(
                f"Il numero di ospiti ({numero_ospiti}) supera il massimo "
                f"consentito per questo alloggio ({alloggio.numero_ospiti_max})."
            )
        
        # Validazione disponibilità alloggio
        if not alloggio.is_available():
            raise serializers.ValidationError(
                "L'alloggio selezionato non è attualmente disponibile."
            )
        
        # Verifica conflitti con altre prenotazioni
        if not Prenotazione.check_disponibilita(alloggio, check_in, check_out):
            raise serializers.ValidationError(
                "L'alloggio non è disponibile per le date selezionate. "
                "Ci sono già prenotazioni confermate in conflitto."
            )
        
        return data
    
    def validate_ospite_email(self, value):
        """Validazione email ospite."""
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError as DjangoValidationError
        
        try:
            validate_email(value)
        except DjangoValidationError:
            raise serializers.ValidationError("Inserire un indirizzo email valido.")
        
        return value.lower()  # Normalizza in minuscolo
    
    def validate_ospite_nome(self, value):
        """Validazione nome ospite."""
        if len(value.strip()) < 2:
            raise serializers.ValidationError(
                "Il nome dell'ospite deve contenere almeno 2 caratteri."
            )
        
        # Rimuovi spazi extra e capitalizza
        return ' '.join(word.capitalize() for word in value.strip().split())
    
    def validate_ospite_telefono(self, value):
        """Validazione telefono ospite."""
        if value:
            # Rimuovi spazi e caratteri non numerici tranne + per prefisso
            cleaned = ''.join(c for c in value if c.isdigit() or c == '+')
            if len(cleaned) < 10:
                raise serializers.ValidationError(
                    "Il numero di telefono deve contenere almeno 10 cifre."
                )
            return cleaned
        return value


class PrenotazioneUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer per l'aggiornamento delle prenotazioni.
    Permette modifiche limitate in base allo stato.
    """
    
    class Meta:
        model = Prenotazione
        fields = [
            'check_in', 'check_out', 'numero_ospiti',
            'ospite_nome', 'ospite_email', 'ospite_telefono', 
            'note_cliente', 'stato'
        ]
    
    def validate(self, data):
        """Validazioni custom per l'aggiornamento."""
        instance = self.instance
        
        # Verifica se la prenotazione è modificabile
        if not instance.is_modificabile():
            raise serializers.ValidationError(
                f"Impossibile modificare una prenotazione con stato '{instance.get_stato_display()}'."
            )
        
        # Se si stanno modificando le date, verifica disponibilità
        check_in = data.get('check_in', instance.check_in)
        check_out = data.get('check_out', instance.check_out)
        
        if (check_in != instance.check_in or check_out != instance.check_out):
            if not Prenotazione.check_disponibilita(
                instance.alloggio, check_in, check_out, exclude_id=instance.id
            ):
                raise serializers.ValidationError(
                    "L'alloggio non è disponibile per le nuove date selezionate."
                )
        
        return super().validate(data)


class DisponibilitaSerializer(serializers.Serializer):
    """
    Serializer per verificare la disponibilità di un alloggio.
    Non è collegato a un modello specifico.
    """
    alloggio_id = serializers.IntegerField()
    check_in = serializers.DateField()
    check_out = serializers.DateField()
    
    def validate(self, data):
        """Validazioni per la verifica disponibilità."""
        from django.utils import timezone
        
        check_in = data['check_in']
        check_out = data['check_out']
        
        if check_out <= check_in:
            raise serializers.ValidationError(
                "La data di check-out deve essere successiva al check-in."
            )
        
        if check_in < timezone.now().date():
            raise serializers.ValidationError(
                "La data di check-in non può essere nel passato."
            )
        
        # Verifica che l'alloggio esista
        try:
            alloggio = Alloggio.objects.get(id=data['alloggio_id'])
            data['alloggio'] = alloggio
        except Alloggio.DoesNotExist:
            raise serializers.ValidationError(
                "L'alloggio specificato non esiste."
            )
        
        return data
    
    def get_disponibilita(self):
        """Ritorna True se l'alloggio è disponibile per le date."""
        validated_data = self.validated_data
        alloggio = validated_data['alloggio']
        check_in = validated_data['check_in']
        check_out = validated_data['check_out']
        
        return Prenotazione.check_disponibilita(alloggio, check_in, check_out)