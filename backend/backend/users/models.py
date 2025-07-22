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


class UserActivity(models.Model):
    ACTIVITY_TYPES = [
        ('login', 'User Login'),
        ('logout', 'User Logout'),
        ('record_created', 'Created Class Record'),
        ('record_updated', 'Updated Class Record'),
        ('record_deleted', 'Deleted Class Record'),
        ('record_viewed', 'Viewed Class Record'),
        ('voice_command', 'Used Voice Command'),
        ('batch_grading', 'Performed Batch Grading'),
        ('student_added', 'Added Student'),
        ('student_updated', 'Updated Student'),
        ('grade_updated', 'Updated Grade'),
        ('export_excel', 'Exported to Excel'),
        ('export_pdf', 'Exported to PDF'),
        ('sheet_switched', 'Switched Sheet'),
        ('bulk_import', 'Imported Bulk Data'),
        ('auto_number', 'Auto-numbered Students'),
        ('profile_updated', 'Updated Profile'),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    title = models.CharField(max_length=200)  # Short description
    description = models.TextField(blank=True, null=True)  # Detailed description

    # Metadata for storing extra information as JSON
    metadata = models.JSONField(default=dict, blank=True)

    # Optional reference to related objects
    class_record_id = models.IntegerField(null=True, blank=True)  # Reference to class record

    # IP Address and User Agent for security tracking
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_activities'
        ordering = ['-created_at']  # Most recent first
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['activity_type', '-created_at']),
            models.Index(fields=['class_record_id', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.title} - {self.created_at}"

    @property
    def icon(self):
        """Return appropriate icon for activity type"""
        icons = {
            'login': '🔑',
            'logout': '👋',
            'record_created': '📝',
            'record_updated': '✏️',
            'record_deleted': '🗑️',
            'record_viewed': '👁️',
            'voice_command': '🎤',
            'batch_grading': '📊',
            'student_added': '👤',
            'student_updated': '👥',
            'grade_updated': '📈',
            'export_excel': '📑',
            'export_pdf': '📄',
            'sheet_switched': '📋',
            'bulk_import': '📥',
            'auto_number': '🔢',
            'profile_updated': '⚙️',
        }
        return icons.get(self.activity_type, '📌')

    @property
    def color_class(self):
        """Return appropriate color class for activity type"""
        colors = {
            'login': 'green',
            'logout': 'gray',
            'record_created': 'blue',
            'record_updated': 'yellow',
            'record_deleted': 'red',
            'record_viewed': 'purple',
            'voice_command': 'indigo',
            'batch_grading': 'emerald',
            'student_added': 'cyan',
            'student_updated': 'teal',
            'grade_updated': 'orange',
            'export_excel': 'green',
            'export_pdf': 'red',
            'sheet_switched': 'blue',
            'bulk_import': 'purple',
            'auto_number': 'indigo',
            'profile_updated': 'gray',
        }
        return colors.get(self.activity_type, 'gray')