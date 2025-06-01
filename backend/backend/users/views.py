import logging
import uuid
from django.shortcuts import render
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from drf_spectacular.utils import OpenApiExample, extend_schema, OpenApiParameter
from google.oauth2 import id_token
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.conf import settings
import requests as http_requests
from .serializers import UserRegistrationSerializer, UserLoginSerializer
from .models import CustomUser
from .utils import send_verification_email, get_current_utc_time, get_user_login
from firebase_admin import auth


logger = logging.getLogger(__name__)

class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        request=UserRegistrationSerializer,
        responses={201: dict},
        description='Register a new user and send verification email',
        summary="Register new user",
        tags=['Authentication'],
        examples=[
            OpenApiExample(
                'Successful Registration',
                value={
                    "message": "Registration successful. Please check your email to verify your account.",
                    "user": {
                        "email": "user@example.com",
                        "firstName": "John",
                        "lastName": "Doe"
                    }
                }
            )
        ]
    )
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()

                verification_token = str(uuid.uuid4())
                user.email_verification_token = verification_token
                user.save()

                verification_url = f"http://127.0.0.1:8000/api/verify-email/{verification_token}/"

                html_message = render_to_string('email/verification_email.html', {
                    'user': user,
                    'verification_url': verification_url
                })
                plain_message = strip_tags(html_message)

                try:
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

    @extend_schema(
        request=UserLoginSerializer,
        responses={200: dict},
        description='Login with email and password',
        summary="User login",
        tags=['Authentication'],
        examples=[
            OpenApiExample(
                'Successful Login',
                value={
                    "tokens": {
                        "refresh": "your-refresh-token",
                        "access": "your-access-token"
                    },
                    "user": {
                        "id": "user-id",
                        "email": "user@example.com",
                        "first_name": "John",
                        "last_name": "Doe"
                    }
                }
            )
        ]
    )
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
                        'last_name': user.last_name,
                        'institution': user.institution,
                        'position': user.position,
                        'bio': user.bio,
                        'has_google': user.has_google,
                        'has_microsoft': user.has_microsoft,
                        'profile_picture': user.profile_picture
                    },
                    'meta': {
                        'login_time': get_current_utc_time(),
                        'user_login': get_user_login()
                    }
                })

            return Response({
                "error": "Invalid credentials"
            }, status=status.HTTP_401_UNAUTHORIZED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='token',
                description='Email verification token',
                required=True,
                type=str,
                location=OpenApiParameter.PATH
            )
        ],
        responses={200: dict},
        description='Verify user email with token',
        summary="Verify email",
        tags=['Authentication']
    )
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

    @extend_schema(
        request={'application/json': {'type': 'object', 'properties': {'refresh_token': {'type': 'string'}}}},
        responses={200: dict},
        description='Logout and blacklist the refresh token',
        summary="User logout",
        tags=['Authentication']
    )
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


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    try:
        token = request.data.get('id_token')
        if not token:
            return Response({'error': 'No token provided'}, status=400)

        try:
            # Fix the name conflict by importing the Request class separately
            from google.auth.transport import requests as google_requests

            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),  # Changed from requests.Request()
                settings.GOOGLE_OAUTH2_CLIENT_ID
            )

            email = idinfo['email']
            if not idinfo.get('email_verified'):
                return Response({'error': 'Email not verified'}, status=400)

            try:
                user = CustomUser.objects.get(email=email)
                logger.info(f"Found existing user: {user.email}")
                user.first_name = idinfo.get('given_name', '')
                user.last_name = idinfo.get('family_name', '')
                user.google_id = idinfo['sub']
                user.profile_picture = idinfo.get('picture', '')
                user.email_verified = True
                user.save()
            except CustomUser.DoesNotExist:
                username = f"google_{idinfo['sub']}"
                user = CustomUser.objects.create_user(
                    username=username,
                    email=email,
                    first_name=idinfo.get('given_name', ''),
                    last_name=idinfo.get('family_name', ''),
                    google_id=idinfo['sub'],
                    profile_picture=idinfo.get('picture', ''),
                    email_verified=True
                )
                logger.info(f"Created new user: {user.email}")

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            response_data = {
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'name': f"{user.first_name} {user.last_name}".strip(),
                    'profile_picture': user.profile_picture,
                    'institution': user.institution,
                    'position': user.position,
                    'bio': user.bio,
                    'has_google': user.has_google,
                    'has_microsoft': user.has_microsoft
                }
            }
            logger.info(f"Successfully authenticated user: {user.email}")
            return Response(response_data)

        except ValueError as e:
            logger.error(f"Token verification failed: {str(e)}")
            return Response({'error': f'Invalid token: {str(e)}'}, status=400)

    except Exception as e:
        logger.error(f"Error in google_auth: {str(e)}")
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def microsoft_auth(request):
    try:
        access_token = request.data.get('access_token')
        id_token = request.data.get('id_token')

        if not access_token and not id_token:
            return Response({'error': 'No tokens provided'}, status=400)

        try:
            # Get user info from Microsoft Graph API - use http_requests instead of requests
            graph_response = http_requests.get(
                'https://graph.microsoft.com/v1.0/me',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )

            if not graph_response.ok:
                return Response({'error': 'Failed to fetch user data from Microsoft'}, status=400)

            graph_data = graph_response.json()

            email = graph_data.get('userPrincipalName') or graph_data.get('mail')
            if not email:
                return Response({'error': 'Email not found in Microsoft response'}, status=400)

            try:
                user = CustomUser.objects.get(email=email)
                logger.info(f"Found existing user: {user.email}")
                # Update existing user
                user.first_name = graph_data.get('givenName', '')
                user.last_name = graph_data.get('surname', '')
                user.microsoft_id = graph_data.get('id')
                user.email_verified = True
                user.save()
            except CustomUser.DoesNotExist:
                # Create new user
                username = f"microsoft_{graph_data.get('id')}"
                user = CustomUser.objects.create_user(
                    username=username,
                    email=email,
                    first_name=graph_data.get('givenName', ''),
                    last_name=graph_data.get('surname', ''),
                    microsoft_id=graph_data.get('id'),
                    email_verified=True
                )
                logger.info(f"Created new user: {user.email}")

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            response_data = {
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'name': f"{user.first_name} {user.last_name}".strip(),
                    'profile_picture': user.profile_picture,
                    'institution': user.institution,
                    'position': user.position,
                    'bio': user.bio,
                    'has_google': user.has_google,
                    'has_microsoft': user.has_microsoft
                }
            }
            logger.info(f"Successfully authenticated Microsoft user: {user.email}")
            return Response(response_data)

        except http_requests.exceptions.RequestException as e:
            logger.error(f"Microsoft Graph API request failed: {str(e)}")
            return Response({'error': 'Failed to communicate with Microsoft'}, status=400)

    except Exception as e:
        logger.error(f"Error in microsoft_auth: {str(e)}")
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def firebase_auth_view(request):
    try:
        firebase_token = request.data.get('firebase_token')
        if not firebase_token:
            return Response({'error': 'No token provided'}, status=400)

        try:
            decoded_token = auth.verify_id_token(firebase_token)
        except Exception as e:
            logger.error(f"Firebase token verification failed: {str(e)}")
            return Response({'error': f'Invalid Firebase token: {str(e)}'}, status=400)

        uid = decoded_token.get('uid')
        email = decoded_token.get('email')
        if not email:
            try:
                user_record = auth.get_user(uid)
                email = user_record.email
            except Exception as e:
                logger.error(f"Failed to get Firebase user: {str(e)}")
                return Response({'error': 'No email found in token or user record'}, status=400)

        provider_data = decoded_token.get('firebase', {}).get('sign_in_provider', '')
        is_google = 'google.com' in provider_data
        is_microsoft = 'microsoft.com' in provider_data

        try:
            user = CustomUser.objects.get(email=email)
            if is_google:
                user.google_id = uid
            elif is_microsoft:
                user.microsoft_id = uid

            user.email_verified = True
            user.save()
            logger.info(f"Updated existing user via Firebase: {user.email}")
        except CustomUser.DoesNotExist:
            username = f"firebase_{uid}"

            name = decoded_token.get('name', '')
            names = name.split(' ', 1) if name else ['', '']
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else ''

            user = CustomUser.objects.create_user(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                email_verified=True
            )

            if is_google:
                user.google_id = uid
            elif is_microsoft:
                user.microsoft_id = uid

            user.save()
            logger.info(f"Created new user via Firebase: {user.email}")

        refresh = RefreshToken.for_user(user)

        response_data = {
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'name': f"{user.first_name} {user.last_name}".strip(),
            }
        }

        return Response(response_data)

    except Exception as e:
        logger.error(f"Error in firebase_auth: {str(e)}")
        return Response({'error': str(e)}, status=400)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user

    allowed_fields = ['first_name', 'last_name', 'institution', 'position', 'bio']

    for field in allowed_fields:
        if field in request.data:
            setattr(user, field, request.data[field])

    user.save()

    return Response({
        'user': {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'institution': user.institution,
            'position': user.position,
            'bio': user.bio,
            'has_google': user.has_google,
            'has_microsoft': user.has_microsoft,
            'profile_picture': user.profile_picture
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """Get current user's profile"""
    user = request.user

    return Response({
        'user': {
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'institution': user.institution,
            'position': user.position,
            'bio': user.bio,
            'has_google': user.has_google,
            'has_microsoft': user.has_microsoft,
            'profile_picture': user.profile_picture,
            'email_verified': user.email_verified,
            'created_at': user.created_at.isoformat(),
            'updated_at': user.updated_at.isoformat(),
            'google_id': user.google_id,
            'microsoft_id': user.microsoft_id
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def validate_token(request):
    """Validate the current JWT token"""
    try:
        # If we reach here, the token is valid (middleware already validated it)
        user = request.user
        return Response({
            'valid': True,
            'user': {
                'id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        return Response({
            'valid': False,
            'error': 'Invalid token'
        }, status=status.HTTP_401_UNAUTHORIZED)