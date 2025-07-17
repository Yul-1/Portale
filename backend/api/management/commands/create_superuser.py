# /backend/api/management/commands/create_superuser.py

import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import time

class Command(BaseCommand):
    """
    Comando Django per creare un superutente in modo non interattivo,
    leggendo le credenziali dalle variabili d'ambiente.
    Ideale per l'automazione in ambienti come Docker.
    """
    help = 'Crea un superutente se non ne esiste già uno con lo stesso username.'

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

        if not all([username, email, password]):
            self.stdout.write(self.style.WARNING(
                "Le variabili d'ambiente per il superuser (USERNAME, EMAIL, PASSWORD) non sono completamente impostate. Creazione saltata."
            ))
            return

        if not User.objects.filter(username=username).exists():
            self.stdout.write(self.style.SUCCESS(f"Tentativo di creare il superutente '{username}'..."))
            try:
                User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password
                )
                self.stdout.write(self.style.SUCCESS(f"✅ Superutente '{username}' creato con successo."))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"❌ Errore durante la creazione del superutente: {e}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"ℹ️  Il superutente '{username}' esiste già. Creazione saltata."))