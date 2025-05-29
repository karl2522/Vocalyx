from django.db import models
from users.models import CustomUser


class Course(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('archived', 'Archived'),
    ]

    # Updated semester choices
    SEMESTER_CHOICES = [
        ('1st Semester', '1st Semester'),
        ('2nd Semester', '2nd Semester'),
        ('Mid Year', 'Mid Year'),
    ]

    name = models.CharField(max_length=255)
    courseCode = models.CharField(max_length=50)
    description = models.TextField(null=True, blank=True)
    semester = models.CharField(max_length=100, choices=SEMESTER_CHOICES)
    academic_year = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='courses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    classes_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.courseCode} - {self.name} ({self.academic_year})"


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
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='classes', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    recordings_count = models.IntegerField(default=0)

    section = models.CharField(max_length=10, null=True, blank=True)
    schedule = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        verbose_name_plural = 'classes'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.user.email}"