from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
import uuid
from .serializers import UserRegistrationSerializer, UserLoginSerializer
from .models import CustomUser


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Generate verification token
            verification_token = str(uuid.uuid4())
            user.email_verification_token = verification_token
            user.save()

            # Send verification email with the API endpoint
            verification_url = f"http://127.0.0.1:8000/api/verify-email/{verification_token}/"
            email_body = f"""
            Hello {user.full_name},

            Thank you for registering! Please verify your email by clicking the link below:

            {verification_url}

            If you didn't register for an account, please ignore this email.

            Best regards,
            Your Team
            """

            try:
                send_mail(
                    'Verify your email',
                    email_body,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
                return Response({
                    "message": "Registration successful. Please check your email to verify your account.",
                    "user": serializer.data,
                    "verification_url": verification_url  # Including this for testing purposes
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                # If email sending fails, return the verification URL for testing
                return Response({
                    "message": "Registration successful but email sending failed.",
                    "user": serializer.data,
                    "verification_url": verification_url,
                    "error": str(e)
                }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # Add this line

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            email_or_username = serializer.validated_data['email_or_username']
            password = serializer.validated_data['password']

            # Try to authenticate
            user = authenticate(
                request,
                username=email_or_username,  # Backend will check both username and email
                password=password
            )

            if user is None:
                # If first attempt fails, try with email explicitly
                user = authenticate(
                    request,
                    email=email_or_username,
                    password=password
                )

            if user:
                if not user.email_verified:
                    return Response({
                        "error": "Please verify your email before logging in."
                    }, status=status.HTTP_401_UNAUTHORIZED)

                refresh = RefreshToken.for_user(user)
                return Response({
                    'tokens': {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    },
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'username': user.username,
                        'full_name': user.full_name
                    }
                })

            return Response({
                "error": "Invalid credentials"
            }, status=status.HTTP_401_UNAUTHORIZED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # Add this line to disable authentication

    def get(self, request, token=None):
        if not token:
            return Response({
                "error": "Token is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email_verification_token=token)
            user.email_verified = True
            user.email_verification_token = None
            user.save()
            return Response({
                "message": "Email verified successfully. You can now log in."
            }, status=status.HTTP_200_OK)
        except CustomUser.DoesNotExist:
            return Response({
                "error": "Invalid token"
            }, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({
                "error": "Token is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email_verification_token=token)
            user.email_verified = True
            user.email_verification_token = None
            user.save()
            return Response({
                "message": "Email verified successfully"
            }, status=status.HTTP_200_OK)
        except CustomUser.DoesNotExist:
            return Response({
                "error": "Invalid token"
            }, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh_token"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({
                "message": "Successfully logged out."
            }, status=status.HTTP_200_OK)
        except Exception:
            return Response({
                "error": "Invalid token"
            }, status=status.HTTP_400_BAD_REQUEST)