from django.contrib.auth.password_validation import validate_password
from drf_spectacular.utils import OpenApiExample, extend_schema_serializer
from rest_framework import serializers

from users.models import CustomUser


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
