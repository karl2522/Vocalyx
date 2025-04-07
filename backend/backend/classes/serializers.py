from rest_framework import serializers
from .models import Class

class ClassSerializer(serializers.ModelSerializer):
    last_updated = serializers.SerializerMethodField()

    class Meta:
        model = Class
        fields = ['id', 'name', 'description', 'semester', 'student_count',
                 'status', 'created_at', 'updated_at', 'recordings_count', 'last_updated']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_last_updated(self, obj):
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        diff = now - obj.updated_at

        if diff < timedelta(minutes=1):
            return 'Just now'
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f'{minutes} minutes ago'
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f'{hours} hours ago'
        elif diff < timedelta(days=2):
            return 'Yesterday'
        elif diff < timedelta(days=7):
            days = int(diff.total_seconds() / 86400)
            return f'{days} days ago'
        elif diff < timedelta(days=30):
            weeks = int(diff.total_seconds() / 604800)
            return f'{weeks} weeks ago'
        else:
            return obj.updated_at.strftime('%B %d, %Y')