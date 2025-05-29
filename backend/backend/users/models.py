from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=100, blank=True, null=True)
    google_id = models.CharField(max_length=255, null=True, blank=True)
    profile_picture = models.URLField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    microsoft_id = models.CharField(max_length=255, null=True, blank=True)
    institution = models.CharField(max_length=255, default="Cebu Institute of Technology - University")
    position = models.CharField(max_length=255, default="Teacher/Instructor")
    bio = models.TextField(blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        db_table = 'custom_users'

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'

    @property
    def has_google(self):
        return self.google_id is not None and self.google_id != ''

    @property
    def has_microsoft(self):
        return self.microsoft_id is not None and self.microsoft_id != ''