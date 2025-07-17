from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Alloggio, FotoAlloggio, Prenotazione


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
        'numero_ospiti_max', 'disponibile', 'prenotazioni_count', 'created_at'
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
    
    def prenotazioni_count(self, obj):
        """Mostra il numero di prenotazioni per questo alloggio."""
        count = obj.prenotazioni.count()
        if count > 0:
            url = reverse('admin:api_prenotazione_changelist') + f'?alloggio__id__exact={obj.id}'
            return format_html('<a href="{}">{} prenotazioni</a>', url, count)
        return '0 prenotazioni'
    prenotazioni_count.short_description = 'Prenotazioni'
    
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


@admin.register(Prenotazione)
class PrenotazioneAdmin(admin.ModelAdmin):
    """Configurazione admin per il modello Prenotazione."""
    
    # Display principale
    list_display = [
        'id', 'alloggio_nome', 'ospite_nome', 'check_in', 'check_out',
        'numero_ospiti', 'stato', 'stato_badge', 'prezzo_totale', 'created_at'
    ]
    
    # Filtri laterali
    list_filter = [
        'stato', 'alloggio', 'check_in', 'check_out', 'created_at',
        'numero_ospiti'
    ]
    
    # Campi di ricerca
    search_fields = [
        'ospite_nome', 'ospite_email', 'alloggio__nome', 'note_cliente'
    ]
    
    # Ordinamento
    ordering = ['-created_at']
    
    # Paginazione
    list_per_page = 25
    
    # Campi editabili direttamente dalla lista
    list_editable = ['stato']
    
    # Organizzazione dei campi nel form di dettaglio
    fieldsets = (
        ('Informazioni Prenotazione', {
            'fields': ('alloggio', 'stato')
        }),
        ('Date e Ospiti', {
            'fields': ('check_in', 'check_out', 'numero_ospiti')
        }),
        ('Dati Ospite', {
            'fields': ('ospite_nome', 'ospite_email', 'ospite_telefono')
        }),
        ('Calcoli Automatici', {
            'fields': ('numero_notti', 'prezzo_totale'),
            'classes': ('collapse',)
        }),
        ('Note', {
            'fields': ('note_cliente', 'note_interne'),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    # Campi read-only
    readonly_fields = ['numero_notti', 'prezzo_totale', 'created_at', 'updated_at']
    
    # Azioni personalizzate
    actions = ['conferma_prenotazioni', 'rifiuta_prenotazioni', 'invia_email_conferma']
    
    def alloggio_nome(self, obj):
        """Mostra il nome dell'alloggio con link."""
        url = reverse('admin:api_alloggio_change', args=[obj.alloggio.id])
        return format_html('<a href="{}">{}</a>', url, obj.alloggio.nome)
    alloggio_nome.short_description = 'Alloggio'
    alloggio_nome.admin_order_field = 'alloggio__nome'
    
    def stato_badge(self, obj):
        """Mostra lo stato con un badge colorato."""
        colors = {
            'PENDENTE': '#ffc107',      # Giallo
            'CONFERMATA': '#28a745',    # Verde
            'PAGATA': '#007bff',        # Blu
            'COMPLETATA': '#6c757d',    # Grigio
            'CANCELLATA': '#dc3545',    # Rosso
            'RIFIUTATA': '#dc3545',     # Rosso
        }
        color = colors.get(obj.stato, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color, obj.get_stato_display()
        )
    stato_badge.short_description = 'Stato'
    stato_badge.admin_order_field = 'stato'
    
    def get_queryset(self, request):
        """Ottimizza le query per evitare N+1 problems."""
        return super().get_queryset(request).select_related('alloggio')
    
    def save_model(self, request, obj, form, change):
        """Override per aggiungere logica custom al salvataggio."""
        old_stato = None
        if change:
            # Recupera lo stato precedente
            old_obj = Prenotazione.objects.get(pk=obj.pk)
            old_stato = old_obj.stato
        
        super().save_model(request, obj, form, change)
        
        # Invia email se lo stato è cambiato
        if old_stato and old_stato != obj.stato:
            self.invia_email_cambio_stato(obj, old_stato)
    
    def invia_email_cambio_stato(self, prenotazione, old_stato):
        """Invia email quando cambia lo stato della prenotazione."""
        try:
            from django.core.mail import send_mail
            from django.template.loader import render_to_string
            
            # Prepara il messaggio
            subject = f'Aggiornamento Prenotazione #{prenotazione.id}'
            message = f"""
            Ciao {prenotazione.ospite_nome},
            
            La tua prenotazione #{prenotazione.id} per {prenotazione.alloggio.nome} 
            è passata da "{old_stato}" a "{prenotazione.get_stato_display()}".
            
            Dettagli prenotazione:
            - Alloggio: {prenotazione.alloggio.nome}
            - Date: {prenotazione.check_in} - {prenotazione.check_out}
            - Ospiti: {prenotazione.numero_ospiti}
            - Totale: €{prenotazione.prezzo_totale}
            
            Grazie per aver scelto i nostri servizi!
            """
            
            # Invia email
            send_mail(
                subject,
                message,
                'noreply@portale.com',
                [prenotazione.ospite_email],
                fail_silently=True,
            )
            
        except Exception as e:
            # Log dell'errore ma non bloccare l'operazione
            print(f"Errore invio email: {e}")
    
    # Azioni personalizzate
    def conferma_prenotazioni(self, request, queryset):
        """Azione per confermare prenotazioni selezionate."""
        updated = queryset.filter(stato='PENDENTE').update(stato='CONFERMATA')
        if updated:
            self.message_user(request, f'{updated} prenotazioni confermate con successo.')
        else:
            self.message_user(request, 'Nessuna prenotazione pendente selezionata.')
    conferma_prenotazioni.short_description = 'Conferma prenotazioni selezionate'
    
    def rifiuta_prenotazioni(self, request, queryset):
        """Azione per rifiutare prenotazioni selezionate."""
        updated = queryset.filter(stato__in=['PENDENTE', 'CONFERMATA']).update(stato='RIFIUTATA')
        if updated:
            self.message_user(request, f'{updated} prenotazioni rifiutate.')
        else:
            self.message_user(request, 'Nessuna prenotazione modificabile selezionata.')
    rifiuta_prenotazioni.short_description = 'Rifiuta prenotazioni selezionate'
    
    def invia_email_conferma(self, request, queryset):
        """Azione per inviare email di conferma."""
        count = 0
        for prenotazione in queryset:
            try:
                self.invia_email_cambio_stato(prenotazione, prenotazione.stato)
                count += 1
            except:
                pass
        self.message_user(request, f'Email inviate per {count} prenotazioni.')
    invia_email_conferma.short_description = 'Invia email di conferma'


# Personalizzazione del titolo dell'admin
admin.site.site_header = 'Portale Prenotazioni - Amministrazione'
admin.site.site_title = 'Portale Admin'
admin.site.index_title = 'Gestione Portale Prenotazioni'