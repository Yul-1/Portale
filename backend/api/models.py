from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator

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
        db_table = 'alloggi'  # Mappa sulla tabella esistente
        db_table_comment = 'Tabella degli alloggi disponibili per prenotazione'
        ordering = ['nome']
        verbose_name = 'Alloggio'
        verbose_name_plural = 'Alloggi'
    
    def __str__(self):
        return f"{self.nome} - €{self.prezzo_notte}/notte"
    
    def is_available(self):
        """Verifica se l'alloggio è disponibile."""
        return self.disponibile


class FotoAlloggio(models.Model):
    """
    Modello per le foto associate agli alloggi.
    Mappato sulla tabella portale.foto_alloggi.
    """
    alloggio = models.ForeignKey(
        Alloggio, 
        on_delete=models.CASCADE, 
        related_name='foto'
    )
    url = models.URLField(max_length=500)
    descrizione = models.CharField(max_length=255, blank=True)
    ordine = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'foto_alloggi'
        ordering = ['ordine', 'id']
        verbose_name = 'Foto Alloggio'
        verbose_name_plural = 'Foto Alloggi'
    
    def __str__(self):
        return f"Foto {self.ordine} - {self.alloggio.nome}"