from rest_framework import serializers
from .models import Notification
from django.contrib.auth import get_user_model

User = get_user_model()


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']


class NotificationSerializer(serializers.ModelSerializer):
    sender_details = UserMiniSerializer(source='sender', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'message', 'is_read', 'created_at', 'sender_details']