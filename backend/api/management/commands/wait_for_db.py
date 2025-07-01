import time
from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    """Django command to pause execution until database is available"""
    
    help = 'Wait for database to be available'

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout',
            type=int,
            default=30,
            help='Timeout in seconds (default: 30)'
        )

    def handle(self, *args, **options):
        self.stdout.write('Waiting for database...')
        db_conn = None
        timeout = options['timeout']
        start_time = time.time()
        
        while not db_conn:
            try:
                db_conn = connections['default']
                db_conn.ensure_connection()
                self.stdout.write(self.style.SUCCESS('Database available!'))
            except OperationalError:
                elapsed = time.time() - start_time
                if elapsed > timeout:
                    self.stdout.write(
                        self.style.ERROR(
                            f'Database unavailable after {timeout} seconds!'
                        )
                    )
                    raise
                self.stdout.write(
                    f'Database unavailable ({int(elapsed)}s elapsed), waiting...'
                )
                time.sleep(1)