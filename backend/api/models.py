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