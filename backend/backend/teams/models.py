from django.db import models
from django.utils.crypto import get_random_string
from classes.models import Course
from users.models import CustomUser


class Team(models.Model):
    PERMISSION_LEVELS = [
        ('view', 'View Only'),
        ('edit', 'Can Edit'),
        ('full', 'Full Access'),
    ]

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=6, unique=True, editable=False)
    description = models.TextField(null=True, blank=True)
    owner = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='owned_teams'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.code})"

    def save(self, *args, **kwargs):
        # Generate a unique code for the team if it doesn't exist
        if not self.code:
            self.code = self._generate_unique_code()
        super().save(*args, **kwargs)

    def _generate_unique_code(self):
        """Generate a random 6-character code for team joining"""
        characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        code = get_random_string(6, characters)

        # Ensure code is unique
        while Team.objects.filter(code=code).exists():
            code = get_random_string(6, characters)

        return code


class TeamMember(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('member', 'Member'),
        ('invited', 'Invited'),
    ]

    PERMISSION_CHOICES = [
        ('view', 'View Only'),
        ('edit', 'Can Edit'),
        ('full', 'Full Access'),
    ]

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='team_memberships'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    permissions = models.CharField(max_length=20, choices=PERMISSION_CHOICES, default='view')
    invitation_email = models.EmailField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['team', 'user']
        ordering = ['team', 'role']

    def __str__(self):
        return f"{self.user.email} in {self.team.name} ({self.role})"


class TeamCourse(models.Model):
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='courses'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='teams'
    )
    added_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        related_name='added_team_courses',
        null=True
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['team', 'course']
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.course.name} in {self.team.name}"


class TeamInvitation(models.Model):
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    email = models.EmailField()
    inviter = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='sent_invitations'
    )
    token = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['team', 'email']
        ordering = ['-created_at']

    def __str__(self):
        status = "Accepted" if self.accepted else "Pending"
        return f"Invitation to {self.email} for {self.team.name} ({status})"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = get_random_string(64)
        super().save(*args, **kwargs)