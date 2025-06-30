from django.contrib import admin
from .models import Alloggio, FotoAlloggio


class FotoAlloggioInline(admin.TabularInline):
    """Inline per gestire le foto direttamente dalla pagina dell'alloggio."""
    model = FotoAlloggio
    extra = 1
    fields = ['url', 'descrizione', 'ordine']
    ordering = ['ordine']


@admin.register(Alloggio)
class AlloggioAdmin(admin.ModelAdmin):
    """Configurazione admin per il modello Alloggio."""
    list_display = [
        'nome', 'posizione', 'prezzo_notte', 
        'numero_ospiti_max', 'disponibile', 'created_at'
    ]
    list_filter = ['disponibile', 'numero_camere', 'created_at']
    search_fields = ['nome', 'posizione', 'descrizione']
    list_editable = ['disponibile', 'prezzo_notte']
    
    fieldsets = (
        ('Informazioni Base', {
            'fields': ('nome', 'descrizione', 'posizione', 'disponibile')
        }),
        ('Dettagli Alloggio', {
            'fields': (
                'prezzo_notte', 'numero_ospiti_max', 
                'numero_camere', 'numero_bagni'
            )
        }),
        ('Servizi', {
            'fields': ('servizi',),
            'description': 'Inserire i servizi come lista JSON, es: ["Wi-Fi", "Piscina", "Parcheggio"]'
        }),
        ('Timestamp', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    readonly_fields = ['created_at', 'updated_at']
    inlines = [FotoAlloggioInline]
    
    def save_model(self, request, obj, form, change):
        """Override per aggiungere logica custom al salvataggio."""
        super().save_model(request, obj, form, change)
        # Qui si potrebbero aggiungere notifiche, log, etc.


@admin.register(FotoAlloggio)
class FotoAlloggioAdmin(admin.ModelAdmin):
    """Configurazione admin per il modello FotoAlloggio."""
    list_display = ['alloggio', 'descrizione', 'ordine', 'created_at']
    list_filter = ['alloggio', 'created_at']
    search_fields = ['alloggio__nome', 'descrizione']
    ordering = ['alloggio', 'ordine']