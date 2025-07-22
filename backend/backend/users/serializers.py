from django.contrib.auth.password_validation import validate_password
from drf_spectacular.utils import OpenApiExample, extend_schema_serializer
from rest_framework import serializers

from users.models import CustomUser, UserActivity


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Valid Registration Example',
            value={
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john.doe@example.com',
                'password': 'securepassword123',
                'password2': 'securepassword123'
            }
        )
    ]
)
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = CustomUser
        fields = ('first_name', 'last_name', 'email', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')

        username = validated_data['email'].split('@')[0]

        user = CustomUser.objects.create_user(
            username=username,
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password']
        )
        return user



@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Valid Login Example',
            value={
                'email': 'john.doe@example.com',
                'password': 'securepassword123'
            }
        )
    ]
)
class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError('Both email and password are required.')

        return attrs


class UserActivitySerializer(serializers.ModelSerializer):
    icon = serializers.ReadOnlyField()
    color_class = serializers.ReadOnlyField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = UserActivity
        fields = [
            'id', 'activity_type', 'title', 'description', 'metadata',
            'class_record_id', 'created_at', 'icon', 'color_class', 'time_ago'
        ]
        read_only_fields = ['id', 'created_at', 'icon', 'color_class', 'time_ago']

    def get_time_ago(self, obj):
        """Get human-readable time ago"""
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        diff = now - obj.created_at

        if diff < timedelta(minutes=1):
            return "Just now"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days} day{'s' if days != 1 else ''} ago"
        else:
            return obj.created_at.strftime("%b %d, %Y")
