from django.db import models
from django.utils import timezone
import pytz  # Add this import


class BlacklistedToken(models.Model):
    token = models.CharField(max_length=500, unique=True)
    blacklisted_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['expires_at'])
        ]

    def save(self, *args, **kwargs):
        # Ensure expires_at is timezone-aware
        if self.expires_at and timezone.is_naive(self.expires_at):
            self.expires_at = timezone.make_aware(self.expires_at, pytz.UTC)
        super().save(*args, **kwargs)