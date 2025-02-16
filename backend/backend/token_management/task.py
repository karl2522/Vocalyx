from django.core.management import call_command
from django.utils import timezone
from .models import BlacklistedToken

def cleanup_expired_tokens():
    """
    Cleanup expired tokens daily
    """
    deleted_count = BlacklistedToken.objects.filter(
        expires_at__lt=timezone.now()
    ).delete()[0]
    return f"Deleted {deleted_count} expired tokens"