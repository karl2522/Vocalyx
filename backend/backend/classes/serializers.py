import re
from django.db import models
from rest_framework import serializers
from .models import Class, Course

class CourseSerializer(serializers.ModelSerializer):
    classes_count = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    accessLevel = serializers.CharField(read_only=True, required=False)

    class Meta:
        model = Course
        fields = [
            'id', 'name', 'courseCode', 'description', 'semester',
            'academic_year', 'status', 'created_at', 'updated_at',
            'classes_count', 'student_count', 'accessLevel'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'classes_count', 'student_count']

    def get_classes_count(self, obj):
        return obj.classes.count()

    def get_student_count(self, obj):
        return obj.classes.aggregate(total_students=models.Sum('student_count'))['total_students'] or 0

    def validate_academic_year(self, value):
        if not re.match(r'^\d{4}-\d{4}$', value):
            raise serializers.ValidationError("Academic year must be in format YYYY-YYYY")
        return value

class ClassSerializer(serializers.ModelSerializer):
    last_updated = serializers.SerializerMethodField()
    course_id = serializers.PrimaryKeyRelatedField(
        source='course',
        queryset=Course.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Class
        fields = [
            'id', 'name', 'description', 'semester', 'student_count',
            'status', 'created_at', 'updated_at', 'recordings_count',
            'course_id', 'schedule', 'last_updated'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_last_updated(self, obj):
        # This method stays the same
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