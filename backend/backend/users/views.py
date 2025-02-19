import logging
from django.shortcuts import render
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.mail import send_mail, BadHeaderError, EmailMessage
from django.conf import settings
import uuid
from .serializers import UserRegistrationSerializer, UserLoginSerializer
from .models import CustomUser
from .utils import send_verification_email

logger = logging.getLogger(__name__)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()

                # Generate verification token
                verification_token = str(uuid.uuid4())
                user.email_verification_token = verification_token
                user.save()

                # Create verification URL
                verification_url = f"http://127.0.0.1:8000/api/verify-email/{verification_token}/"

                # Render email template
                html_message = render_to_string('email/verification_email.html', {
                    'user': user,
                    'verification_url': verification_url
                })
                plain_message = strip_tags(html_message)

                try:
                    # Send email with HTML content
                    email_sent = send_verification_email(
                        user.email,
                        'Welcome to Vocalyx - Verify Your Email',
                        plain_message,
                        html_message
                    )

                    if email_sent:
                        return Response({
                            "message": "Registration successful. Please check your email to verify your account.",
                            "user": {
                                "email": user.email,
                                "firstName": user.first_name,
                                "lastName": user.last_name
                            }
                        }, status=status.HTTP_201_CREATED)
                    else:
                        return Response({
                            "message": "Registration successful but email sending failed.",
                            "verification_url": verification_url
                        }, status=status.HTTP_201_CREATED)

                except Exception as e:
                    logger.error(f"Email sending error: {str(e)}")
                    return Response({
                        "message": "Registration successful but email sending failed.",
                        "error": str(e),
                        "verification_url": verification_url
                    }, status=status.HTTP_201_CREATED)

            except Exception as e:
                logger.error(f"Registration error: {str(e)}")
                return Response({
                    "error": f"Registration failed: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            user = authenticate(
                request,
                email=email,
                password=password
            )

            if user is None:
                user = authenticate(
                    request,
                    email=email,
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
                        'first_name': user.first_name,
                        'last_name': user.last_name
                    }
                })

            return Response({
                "error": "Invalid credentials"
            }, status=status.HTTP_401_UNAUTHORIZED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, token=None):
        if not token:
            return render(request, 'email_verification.html', {
                'success': False,
                'error_message': 'Verification token is missing.'
            })

        try:
            user = CustomUser.objects.get(email_verification_token=token)
            user.email_verified = True
            user.email_verification_token = None
            user.save()
            return render(request, 'email_verification.html', {
                'success': True
            })
        except CustomUser.DoesNotExist:
            return render(request, 'email_verification.html', {
                'success': False,
                'error_message': 'Invalid verification token. Please try registering again.'
            })


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