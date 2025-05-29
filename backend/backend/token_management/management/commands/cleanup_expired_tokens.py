from django.core.management.base import BaseCommand
from django.utils import timezone
from token_management.models import BlacklistedToken


class Command(BaseCommand):
    help = 'Removes expired tokens from the blacklist'

    def handle(self, *args, **options):
        # Get current time in UTC
        now = timezone.now()

        # Delete expired tokens
        deleted_count, _ = BlacklistedToken.objects.filter(
            expires_at__lt=now
        ).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully deleted {deleted_count} expired tokens'
            )
        )