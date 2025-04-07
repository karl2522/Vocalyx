from django.db import models
from users.models import CustomUser

class Class(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('archived', 'Archived'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    semester = models.CharField(max_length=100, null=True, blank=True)
    student_count = models.IntegerField(default=0)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='classes')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    recordings_count = models.IntegerField(default=0)

    class Meta:
        verbose_name_plural = 'classes'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.user.email}"