import os
import uuid
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from django.core.exceptions import ValidationError
from django.utils.text import slugify
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile


def validate_image_size(file):
    """Valida che l'immagine non superi i 10MB."""
    file_size = file.size
    limit_mb = 10
    if file_size > limit_mb * 1024 * 1024:
        raise ValidationError(f"La dimensione massima del file è {limit_mb}MB. Il file caricato è {file_size/(1024*1024):.2f}MB.")


def foto_alloggio_path(instance, filename):
    """
    Genera un percorso sicuro per il salvataggio delle immagini.
    Pattern: alloggi/<alloggio_id>/<uuid>.<ext>
    """
    # Estrai l'estensione del file
    ext = filename.split('.')[-1].lower()
    # Genera un nome file univoco
    filename = f"{uuid.uuid4()}.{ext}"
    # Crea il percorso: alloggi/<alloggio_id>/<filename>
    return os.path.join('alloggi', str(instance.alloggio.id), filename)


class Alloggio(models.Model):
    """
    Modello per rappresentare un alloggio disponibile per la prenotazione.
    Mappato sulla tabella portale.alloggi nel database PostgreSQL.
    """
    nome = models.CharField(max_length=255, unique=True)
    descrizione = models.TextField(blank=True)
    posizione = models.CharField(max_length=500)
    prezzo_notte = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    numero_ospiti_max = models.IntegerField(
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(20)]
    )
    numero_camere = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    numero_bagni = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    servizi = models.JSONField(default=list, blank=True)
    disponibile = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'alloggi'
        db_table_comment = 'Tabella degli alloggi disponibili per prenotazione'
        ordering = ['nome']
        verbose_name = 'Alloggio'
        verbose_name_plural = 'Alloggi'
    
    def __str__(self):
        return f"{self.nome} - €{self.prezzo_notte}/notte"
    
    def is_available(self):
        """Verifica se l'alloggio è disponibile."""
        return self.disponibile
    
    @property
    def immagine_principale(self):
        """Ritorna l'immagine principale (ordine=0) o la prima disponibile."""
        foto = self.foto.filter(models.Q(immagine__isnull=False) | models.Q(url__isnull=False)).first()
        if foto:
            return foto.get_image_url()
        return None


class FotoAlloggio(models.Model):
    """
    Modello per le foto associate agli alloggi.
    Supporta sia upload locali che URL esterni.
    """
    TIPO_IMMAGINE_CHOICES = [
        ('principale', 'Immagine Principale'),
        ('camera', 'Camera'),
        ('bagno', 'Bagno'),
        ('cucina', 'Cucina'),
        ('esterno', 'Esterno'),
        ('altro', 'Altro'),
    ]
    
    alloggio = models.ForeignKey(
        Alloggio, 
        on_delete=models.CASCADE, 
        related_name='foto'
    )
    
    # Campo per upload locale
    immagine = models.ImageField(
        upload_to=foto_alloggio_path,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp']),
            validate_image_size
        ],
        blank=True,
        null=True,
        help_text="Upload di un'immagine locale (max 10MB, formati: jpg, jpeg, png, webp)"
    )
    
    # Campo per URL esterno (per compatibilità)
    url = models.URLField(
        max_length=500,
        blank=True,
        help_text="URL esterno dell'immagine (alternativo all'upload)"
    )
    
    # Metadati immagine
    descrizione = models.CharField(max_length=255, blank=True)
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_IMMAGINE_CHOICES,
        default='altro'
    )
    ordine = models.IntegerField(
        default=0,
        help_text="Ordine di visualizzazione (0 = immagine principale)"
    )
    
    # Dimensioni originali (per reference)
    larghezza_originale = models.IntegerField(null=True, blank=True)
    altezza_originale = models.IntegerField(null=True, blank=True)
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'foto_alloggi'
        ordering = ['ordine', 'id']
        verbose_name = 'Foto Alloggio'
        verbose_name_plural = 'Foto Alloggi'
        constraints = [
            models.CheckConstraint(
                check=models.Q(immagine__isnull=False) | models.Q(url__isnull=False),
                name='foto_alloggio_immagine_or_url_required'
            ),
        ]
    
    def __str__(self):
        return f"Foto {self.ordine} - {self.alloggio.nome}"
    
    def clean(self):
        """Validazione custom del modello."""
        super().clean()
        if not self.immagine and not self.url:
            raise ValidationError("Devi fornire un'immagine o un URL.")
        if self.immagine and self.url:
            raise ValidationError("Puoi fornire solo un'immagine O un URL, non entrambi.")
    
    def save(self, *args, **kwargs):
        """Override del save per processare l'immagine."""
        # Se c'è un'immagine da processare
        if self.immagine and not self.pk:  # Solo per nuove immagini
            # Apri l'immagine con Pillow
            img = Image.open(self.immagine)
            
            # Salva dimensioni originali
            self.larghezza_originale = img.width
            self.altezza_originale = img.height
            
            # Converti RGBA in RGB se necessario
            if img.mode in ('RGBA', 'LA', 'P'):
                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = rgb_img
            
            # Ridimensiona se troppo grande
            max_size = (1920, 1080)
            if img.width > max_size[0] or img.height > max_size[1]:
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Comprimi e salva
            output = BytesIO()
            img.save(output, format='JPEG', quality=85, optimize=True)
            output.seek(0)
            
            # Sostituisci il file originale con quello ottimizzato
            self.immagine = ContentFile(
                output.read(), 
                name=self.immagine.name.replace('.png', '.jpg').replace('.webp', '.jpg')
            )
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Override del delete per rimuovere il file fisico."""
        # Salva il riferimento all'immagine prima di eliminare
        immagine = self.immagine
        # Chiama il delete del parent
        super().delete(*args, **kwargs)
        # Elimina il file fisico se esiste
        if immagine:
            if os.path.isfile(immagine.path):
                os.remove(immagine.path)
    
    def get_image_url(self):
        """Ritorna l'URL dell'immagine (locale o remoto)."""
        if self.immagine:
            return self.immagine.url
        return self.url or ''
    
    def get_thumbnail_url(self, width=300, height=200):
        """
        Placeholder per futura implementazione di thumbnails.
        Per ora ritorna l'immagine originale.
        """
        return self.get_image_url()

class Prenotazione(models.Model):
    """
    Modello per rappresentare una prenotazione di un alloggio.
    Mappato sulla tabella portale.prenotazioni nel database PostgreSQL.
    """
    
    STATO_CHOICES = [
        ('PENDENTE', 'Pendente'),
        ('CONFERMATA', 'Confermata'),
        ('PAGATA', 'Pagata'),
        ('COMPLETATA', 'Completata'),
        ('CANCELLATA', 'Cancellata'),
        ('RIFIUTATA', 'Rifiutata'),
    ]
    
    # Relazione con l'alloggio
    alloggio = models.ForeignKey(
        Alloggio, 
        on_delete=models.CASCADE, 
        related_name='prenotazioni'
    )
    
    # Date di soggiorno
    check_in = models.DateField()
    check_out = models.DateField()
    
    # Informazioni ospiti
    numero_ospiti = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(20)]
    )
    
    # Dati ospite principale
    ospite_nome = models.CharField(max_length=255)
    ospite_email = models.EmailField()
    ospite_telefono = models.CharField(max_length=20, blank=True)
    
    # Informazioni prenotazione
    stato = models.CharField(
        max_length=15, 
        choices=STATO_CHOICES, 
        default='PENDENTE'
    )
    
    # Calcoli automatici
    numero_notti = models.IntegerField(editable=False)
    prezzo_totale = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        editable=False
    )
    
    # Note e richieste speciali
    note_cliente = models.TextField(blank=True)
    note_interne = models.TextField(blank=True)
    
    # Metadati
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'prenotazioni'
        db_table_comment = 'Tabella delle prenotazioni degli alloggi'
        ordering = ['-created_at']
        verbose_name = 'Prenotazione'
        verbose_name_plural = 'Prenotazioni'
        # RIMOSSE tutte le constraints - la validazione avviene a livello applicazione
    
    def __str__(self):
        return f"{self.alloggio.nome} - {self.ospite_nome} ({self.check_in} to {self.check_out})"
    
    def clean(self):
        """Validazioni custom del modello."""
        from django.core.exceptions import ValidationError
        from django.utils import timezone
        
        # Valida che check_out sia dopo check_in
        if self.check_in and self.check_out and self.check_out <= self.check_in:
            raise ValidationError('La data di check-out deve essere successiva al check-in.')
        
        # Valida che il check_in non sia nel passato
        if self.check_in and self.check_in < timezone.now().date():
            raise ValidationError('La data di check-in non può essere nel passato.')
        
        # Valida numero ospiti
        if self.alloggio and self.numero_ospiti > self.alloggio.numero_ospiti_max:
            raise ValidationError(
                f'Il numero di ospiti ({self.numero_ospiti}) supera il massimo consentito '
                f'per questo alloggio ({self.alloggio.numero_ospiti_max}).'
            )
    
    def save(self, *args, **kwargs):
        """Override del save per calcoli automatici."""
        # Calcola numero notti
        if self.check_in and self.check_out:
            delta = self.check_out - self.check_in
            self.numero_notti = delta.days
        
        # Calcola prezzo totale
        if self.alloggio and self.numero_notti:
            self.prezzo_totale = self.alloggio.prezzo_notte * self.numero_notti
        
        # Esegui validazioni
        self.full_clean()
        
        super().save(*args, **kwargs)
    
    def is_confermata(self):
        """Verifica se la prenotazione è confermata."""
        return self.stato in ['CONFERMATA', 'PAGATA', 'COMPLETATA']
    
    def is_modificabile(self):
        """Verifica se la prenotazione può essere modificata."""
        return self.stato in ['PENDENTE', 'CONFERMATA']
    
    def is_cancellabile(self):
        """Verifica se la prenotazione può essere cancellata."""
        from django.utils import timezone
        # Può essere cancellata se è modificabile e il check-in è almeno domani
        return (self.is_modificabile() and 
                self.check_in > timezone.now().date())
    
    @classmethod
    def check_disponibilita(cls, alloggio, check_in, check_out, exclude_id=None):
        """
        Verifica se un alloggio è disponibile per le date specificate.
        
        Args:
            alloggio: Istanza di Alloggio
            check_in: Data di check-in
            check_out: Data di check-out
            exclude_id: ID prenotazione da escludere (per modifiche)
        
        Returns:
            bool: True se disponibile, False altrimenti
        """
        from django.db.models import Q
        
        # Query per prenotazioni sovrapposte
        overlapping = cls.objects.filter(
            alloggio=alloggio,
            stato__in=['PENDENTE', 'CONFERMATA', 'PAGATA']
        ).filter(
            Q(check_in__lt=check_out) & Q(check_out__gt=check_in)
        )
        
        # Escludi una prenotazione specifica (per modifiche)
        if exclude_id:
            overlapping = overlapping.exclude(id=exclude_id)
        
        return not overlapping.exists()
    
    def get_conflitti(self):
        """Ritorna le prenotazioni in conflitto con questa."""
        return Prenotazione.objects.filter(
            alloggio=self.alloggio,
            stato__in=['PENDENTE', 'CONFERMATA', 'PAGATA']
        ).filter(
            models.Q(check_in__lt=self.check_out) & 
            models.Q(check_out__gt=self.check_in)
        ).exclude(id=self.id)