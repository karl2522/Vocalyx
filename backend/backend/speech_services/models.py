from django.db import models
from django.conf import settings


class TranscriptionUsage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    audio_length_seconds = models.FloatField(default=0)

    class Meta:
        verbose_name = "Transcription Usage"
        verbose_name_plural = "Transcription Usage"