import logging
import uuid
from datetime import timedelta
from django.shortcuts import render
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone
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
from .google_drive_service import GoogleDriveService
from firebase_admin import auth
import firebase_admin
from .google_sheets_service import GoogleSheetsService
from .google_token_service import google_token_service
from .token_utils import token_encryption
from django.core.cache import cache
import hashlib
from typing import List, Dict, Optional
import openpyxl
from openpyxl.styles import Border, Side, Font, Alignment
from openpyxl.utils import get_column_letter
from io import BytesIO


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

                # Use localhost for dev, production URL for production
                base_url = "http://127.0.0.1:8000" if settings.DEBUG else "https://vocalyx-backend-64846917574.asia-southeast1.run.app"
                verification_url = f"{base_url}/api/verify-email/{verification_token}/"

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resend_verification_email(request):
    """Resend email verification for the authenticated user"""
    try:
        user = request.user
        
        # Check if user is already verified
        if user.email_verified:
            return Response({
                'error': 'Email is already verified'
            }, status=400)
        
        # Generate new verification token
        verification_token = str(uuid.uuid4())
        user.email_verification_token = verification_token
        user.save()
        
        # Create verification URL - use localhost for dev, production URL for production
        base_url = "http://127.0.0.1:8000" if settings.DEBUG else "https://vocalyx-backend-64846917574.asia-southeast1.run.app"
        verification_url = f"{base_url}/api/verify-email/{verification_token}/"
        
        # Render email template
        html_message = render_to_string('email/verification_email.html', {
            'user': user,
            'verification_url': verification_url
        })
        plain_message = strip_tags(html_message)
        
        # Send verification email
        try:
            email_sent = send_verification_email(
                user.email,
                'Vocalyx - Verify Your Email Address',
                plain_message,
                html_message
            )
            
            if email_sent:
                return Response({
                    'success': True,
                    'message': 'Verification email sent successfully. Please check your inbox.'
                })
            else:
                return Response({
                    'error': 'Failed to send verification email. Please try again later.'
                }, status=500)
                
        except Exception as e:
            logger.error(f"Email sending failed for user {user.email}: {str(e)}")
            return Response({
                'error': 'Failed to send verification email. Please try again later.'
            }, status=500)
            
    except Exception as e:
        logger.error(f"Resend verification email error: {str(e)}")
        return Response({'error': str(e)}, status=500)


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
        # Accept both parameter names for backward compatibility
        id_token = request.data.get('id_token') or request.data.get('firebase_token')
        access_token = request.data.get('access_token')
        mode = request.data.get('mode', 'login')  # 'login' or 'signup'
        
        logger.info(f"Firebase auth request - Mode: {mode}, Email: {email if 'email' in locals() else 'Not extracted yet'}")
        
        if not id_token:
            return Response({'error': 'No ID token provided'}, status=400)

        # Check if Firebase Admin SDK is initialized
        if not firebase_admin._apps:
            return Response({'error': 'Firebase authentication is not available'}, status=503)

        try:
            decoded_token = auth.verify_id_token(id_token)
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

        # Get provider information from Firebase token
        provider_data = decoded_token.get('firebase', {}).get('sign_in_provider', '')
        is_google = 'google.com' in provider_data
        is_microsoft = 'microsoft.com' in provider_data

        # Extract additional user info from token
        name = decoded_token.get('name', '')
        picture = decoded_token.get('picture', '')
        names = name.split(' ', 1) if name else ['', '']
        first_name = names[0] if names[0] else decoded_token.get('given_name', '')
        last_name = names[1] if len(names) > 1 else decoded_token.get('family_name', '')

        try:
            user = CustomUser.objects.get(email=email)
            logger.info(f"User exists: {email}, Mode: {mode}")
            
            # For login mode, user must exist AND have the correct auth method
            if mode == 'login':
                # Check if user has the correct authentication method
                if is_google and not user.has_google:
                    return Response({
                        'error': 'This account was not created with Google. Please use the email/password login or create a new account with Google.'
                    }, status=400)
                elif is_microsoft and not user.has_microsoft:
                    return Response({
                        'error': 'This account was not created with Microsoft. Please use the email/password login or create a new account with Microsoft.'
                    }, status=400)
                
                # Update user information
                if is_google:
                    user.google_id = uid
                elif is_microsoft:
                    user.microsoft_id = uid
                
                # Update user profile information if available
                if first_name:
                    user.first_name = first_name
                if last_name:
                    user.last_name = last_name
                if picture:
                    user.profile_picture = picture
                    
                user.email_verified = True
                user.save()
                logger.info(f"User logged in via Firebase: {user.email}")
                
            # For signup mode, user should not exist, but if they do, log them in instead
            elif mode == 'signup':
                logger.info(f"User {email} already exists during signup, logging them in instead")
                # Update user information as if it were a login
                if is_google:
                    user.google_id = uid
                elif is_microsoft:
                    user.microsoft_id = uid
                
                # Update user profile information if available
                if first_name:
                    user.first_name = first_name
                if last_name:
                    user.last_name = last_name
                if picture:
                    user.profile_picture = picture
                    
                user.email_verified = True
                user.save()
                logger.info(f"User logged in via Firebase (signup->login): {user.email}")
                
        except CustomUser.DoesNotExist:
            logger.info(f"User does not exist: {email}, Mode: {mode}")
            # For login mode, user must exist
            if mode == 'login':
                return Response({
                    'error': 'No account found with this Google account. Please create an account first.'
                }, status=400)
            
            # For signup mode, create new user
            elif mode == 'signup':
                username = f"firebase_{uid}"

                user = CustomUser.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    profile_picture=picture,
                    email_verified=True
                )

                if is_google:
                    user.google_id = uid
                elif is_microsoft:
                    user.microsoft_id = uid

                user.save()
                logger.info(f"Created new user via Firebase: {user.email}")

        # Automatically establish Google Drive connection for Google users
        if is_google:
            try:
                # Mark Google Drive as connected (even without tokens)
                user.google_connected_at = timezone.now()
                
                # If we have access token, store it
                if access_token:
                    # Get refresh token from request (if available)
                    refresh_token = request.data.get('refresh_token')
                    expires_in = request.data.get('expires_in', 3600)  # Default 1 hour
                    
                    # For Firebase auth, we might not get a separate refresh token
                    # Use the access token as refresh token for now (Firebase handles refresh)
                    if not refresh_token:
                        refresh_token = access_token
                    
                    # Encrypt and store Google Drive tokens
                    encrypted_tokens = token_encryption.encrypt_tokens(access_token, refresh_token)
                    
                    # Calculate expiry time
                    expires_at = timezone.now() + timedelta(seconds=expires_in)
                    
                    # Update user with Google Drive tokens
                    user.google_access_token = encrypted_tokens['access_token']
                    user.google_refresh_token = encrypted_tokens['refresh_token']
                    user.google_token_expires_at = expires_at
                    
                    logger.info(f"Automatically connected Google Drive with tokens for user: {user.email}")
                else:
                    # No tokens available, but user is Google-authenticated
                    logger.info(f"Google user connected but no tokens available for user: {user.email}")
                
                # Save the user with Google Drive connection status
                user.save()
                
            except Exception as e:
                logger.error(f"Failed to establish Google Drive connection for {user.email}: {str(e)}")
                # Continue with login even if Drive connection fails

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
                'has_microsoft': user.has_microsoft,
                # Google Drive connection fields
                'has_google_drive': user.has_google_drive,
                'google_drive_connected': user.google_drive_connected,
                'google_connected_at': user.google_connected_at.isoformat() if user.google_connected_at else None,
                'google_token_expires_at': user.google_token_expires_at.isoformat() if user.google_token_expires_at else None
            }
        }
        
        # Include access token information if available
        if access_token and is_google:
            response_data['google_access_token'] = access_token

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
            'profile_picture': user.profile_picture,
            # Google Drive connection fields
            'has_google_drive': user.has_google_drive,
            'google_drive_connected': user.google_drive_connected,
            'google_connected_at': user.google_connected_at.isoformat() if user.google_connected_at else None,
            'google_token_expires_at': user.google_token_expires_at.isoformat() if user.google_token_expires_at else None
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
            'microsoft_id': user.microsoft_id,
            # Google Drive connection fields
            'has_google_drive': user.has_google_drive,
            'google_drive_connected': user.google_drive_connected,
            'google_connected_at': user.google_connected_at.isoformat() if user.google_connected_at else None,
            'google_token_expires_at': user.google_token_expires_at.isoformat() if user.google_token_expires_at else None
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


# Google Drive API endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def drive_test_connection(request):
    """Test Google Drive API connection with user's stored access token"""
    try:
        user = request.user
        
        # Try to get access token from request first (for backward compatibility)
        access_token = request.data.get('access_token')
        
        if not access_token:
            # Use stored token if no token provided
            if not user.has_google_drive:
                return Response({'error': 'Google Drive not connected. Please connect your Google account first.'}, status=400)
            
            access_token = google_token_service.get_valid_access_token(user)
            if not access_token:
                return Response({'error': 'Failed to get valid Google access token'}, status=400)
        
        drive_service = GoogleDriveService(access_token)
        result = drive_service.test_connection()
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Drive connection test error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def drive_list_files(request):
    """List files in user's Google Drive"""
    try:
        user = request.user
        
        # Try to get access token from header first (for backward compatibility)
        access_token = (
            request.headers.get('X-Access-Token') or
            request.headers.get('x-access-token') or
            request.META.get('HTTP_X_ACCESS_TOKEN') or
            request.headers.get('X-Google-Access-Token') or
            request.META.get('HTTP_X_GOOGLE_ACCESS_TOKEN')
        )
        access_token = (
            request.headers.get('X-Access-Token') or
            request.headers.get('x-access-token') or
            request.META.get('HTTP_X_ACCESS_TOKEN') or
            request.headers.get('X-Google-Access-Token') or
            request.META.get('HTTP_X_GOOGLE_ACCESS_TOKEN')
        )
        
        if not access_token:
            # Use stored token if no token provided
            if not user.has_google_drive:
                return Response({'error': 'Google Drive not connected. Please connect your Google account first.'}, status=400)
            
            access_token = google_token_service.get_valid_access_token(user)
            if not access_token:
                return Response({'error': 'Failed to get valid Google access token'}, status=400)
        
        # Get query parameters
        query = request.GET.get('query')
        page_size = int(request.GET.get('page_size', 10))
        folder_id = request.GET.get('folder_id')
        
        drive_service = GoogleDriveService(access_token)
        result = drive_service.list_files(
            query=query,
            page_size=page_size,
            folder_id=folder_id
        )
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Drive list files error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def drive_upload_file(request):
    """Upload a file to user's Google Drive"""
    try:
        access_token = (
            request.headers.get('X-Access-Token') or
            request.headers.get('x-access-token') or
            request.META.get('HTTP_X_ACCESS_TOKEN') or
            request.headers.get('X-Google-Access-Token') or
            request.META.get('HTTP_X_GOOGLE_ACCESS_TOKEN')
        )
        if not access_token:
            return Response({'error': 'Google access token required in X-Access-Token header'}, status=400)
        
        # Check if file is provided
        if 'file' not in request.FILES:
            return Response({'error': 'File required'}, status=400)
        
        uploaded_file = request.FILES['file']
        folder_id = request.data.get('folder_id')
        
        # Read file content
        file_content = uploaded_file.read()
        
        drive_service = GoogleDriveService(access_token)
        result = drive_service.upload_file(
            file_content=file_content,
            filename=uploaded_file.name,
            mime_type=uploaded_file.content_type or 'application/octet-stream',
            folder_id=folder_id
        )
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Drive upload file error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def drive_create_folder(request):
    """Create a folder in user's Google Drive"""
    try:
        access_token = (
            request.headers.get('X-Access-Token') or
            request.headers.get('x-access-token') or
            request.META.get('HTTP_X_ACCESS_TOKEN') or
            request.headers.get('X-Google-Access-Token') or
            request.META.get('HTTP_X_GOOGLE_ACCESS_TOKEN')
        )
        if not access_token:
            return Response({'error': 'Google access token required in X-Access-Token header'}, status=400)
        
        folder_name = request.data.get('folder_name')
        if not folder_name:
            return Response({'error': 'Folder name required'}, status=400)
        
        parent_folder_id = request.data.get('parent_folder_id')
        
        drive_service = GoogleDriveService(access_token)
        result = drive_service.create_folder(
            folder_name=folder_name,
            parent_folder_id=parent_folder_id
        )
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Drive create folder error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def drive_download_file(request, file_id):
    """Download a file from user's Google Drive"""
    try:
        access_token = (
            request.headers.get('X-Access-Token') or
            request.headers.get('x-access-token') or
            request.META.get('HTTP_X_ACCESS_TOKEN') or
            request.headers.get('X-Google-Access-Token') or
            request.META.get('HTTP_X_GOOGLE_ACCESS_TOKEN')
        )
        if not access_token:
            return Response({'error': 'Google access token required in X-Access-Token header'}, status=400)
        
        drive_service = GoogleDriveService(access_token)
        result = drive_service.get_file_content(file_id)
        
        if result.get('success'):
            from django.http import HttpResponse
            response = HttpResponse(
                result['content'],
                content_type=result.get('content_type', 'application/octet-stream')
            )
            response['Content-Disposition'] = f'attachment; filename="drive_file_{file_id}"'
            return response
        else:
            return Response(result, status=400)
        
    except Exception as e:
        logger.error(f"Drive download file error: {str(e)}")
        return Response({'error': str(e)}, status=500)


# Google Sheets API endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_copy_template(request):
    """Copy a template Google Sheet to user's Drive"""
    try:
        access_token = (
            request.headers.get('X-Access-Token') or
            request.headers.get('x-access-token') or
            request.META.get('HTTP_X_ACCESS_TOKEN') or
            request.headers.get('X-Google-Access-Token') or
            request.META.get('HTTP_X_GOOGLE_ACCESS_TOKEN')
        )
        if not access_token:
            return Response({'error': 'Google access token required in X-Access-Token header'}, status=400)
        
        template_id = request.data.get('template_id')
        sheet_name = request.data.get('name')
        
        if not template_id or not sheet_name:
            return Response({'error': 'template_id and name are required'}, status=400)
        
        sheets_service = GoogleSheetsService(access_token)
        result = sheets_service.copy_template_sheet(
            template_file_id=template_id, 
            new_name=sheet_name
        )
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Sheets copy template error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sheets_get_info(request, sheet_id):
    """Get information about a specific sheet"""
    try:
        access_token = (
            request.headers.get('X-Access-Token') or
            request.headers.get('x-access-token') or
            request.META.get('HTTP_X_ACCESS_TOKEN') or
            request.headers.get('X-Google-Access-Token') or
            request.META.get('HTTP_X_GOOGLE_ACCESS_TOKEN')
        )
        if not access_token:
            return Response({'error': 'Google access token required in X-Access-Token header'}, status=400)
        
        sheets_service = GoogleSheetsService(access_token)
        result = sheets_service.get_sheet_info(sheet_id)
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Get sheet info error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sheets_list_user_sheets(request):
    """List user's Google Sheets"""
    try:
        # Prefer 'x-access-token', fallback to legacy variants
        access_token = (
            request.headers.get('x-access-token') or
            request.META.get('HTTP_X_ACCESS_TOKEN') or
            request.headers.get('X-Google-Access-Token') or
            request.META.get('HTTP_X_GOOGLE_ACCESS_TOKEN')
        )
        if not access_token:
            return Response({'error': 'Google access token required in X-Access-Token header'}, status=400)
        
        sheets_service = GoogleSheetsService(access_token)
        result = sheets_service.get_user_sheets()
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"List user sheets error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_update_permissions(request, sheet_id):
    """Update sheet permissions"""
    try:
        access_token = (
            request.headers.get('x-access-token') or
            request.META.get('HTTP_X_ACCESS_TOKEN') or
            request.headers.get('X-Google-Access-Token') or
            request.META.get('HTTP_X_GOOGLE_ACCESS_TOKEN')
        )
        if not access_token:
            return Response({'error': 'Google access token required in X-Access-Token header'}, status=400)
        
        make_public = request.data.get('make_public_readable', False)
        make_editable = request.data.get('make_editable', False)
        grant_user_editor = request.data.get('grant_user_editor', False)
        
        sheets_service = GoogleSheetsService(access_token)
        # First, update public visibility as requested
        result = sheets_service.update_sheet_permissions(sheet_id, make_public, make_editable)

        # Optionally grant explicit editor to the current user (safer than 'anyone: writer')
        if grant_user_editor and request.user and getattr(request.user, 'email', None):
            try:
                grant_result = sheets_service.add_user_editor(sheet_id, request.user.email)
                result = { **result, 'grant_user_editor': grant_result }
            except Exception as e:
                result = { **result, 'grant_user_editor': {'success': False, 'error': str(e)} }
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Update sheet permissions error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sheets_get_data(request, sheet_id):
    """Get data from a Google Sheet"""
    try:
        access_token = (
            request.headers.get('x-access-token') or
            request.META.get('HTTP_X_ACCESS_TOKEN') or
            request.headers.get('X-Google-Access-Token') or
            request.META.get('HTTP_X_GOOGLE_ACCESS_TOKEN')
        )
        if not access_token:
            return Response({'error': 'Google access token required in X-Access-Token header'}, status=400)

        sheets_service = GoogleSheetsService(access_token)
        result = sheets_service.get_sheet_data(sheet_id)

        return Response(result)

    except Exception as e:
        logger.error(f"Get sheet data error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sheets_get_data_service_account(request, sheet_id):
    """Get data from a Google Sheet using service account (for app-created sheets)"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.get_sheet_data(sheet_id)

        return Response(result)

    except Exception as e:
        logger.error(f"Service account sheet data error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_update_cell_service_account(request, sheet_id):
    """Update a single cell in Google Sheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        row = request.data.get('row')  # 0-based index
        column = request.data.get('column')  # Column name like 'QUIZ 1'
        value = request.data.get('value')

        if row is None or not column or value is None:
            return Response({'error': 'row, column, and value are required'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.update_cell(sheet_id, row, column, value)

        return Response(result)

    except Exception as e:
        logger.error(f"Update cell error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_add_student_service_account(request, sheet_id):
    """Add a new student to Google Sheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        student_data = request.data.get('student_data')
        if not student_data:
            return Response({'error': 'student_data is required'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.add_student(sheet_id, student_data)

        return Response(result)

    except Exception as e:
        logger.error(f"Add student error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_add_student_with_auto_number_service_account(request, sheet_id):
    """Add a new student to Google Sheet with auto-numbering using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        student_data = request.data.get('student_data')
        if not student_data:
            return Response({'error': 'student_data is required'}, status=400)

        # CRITICAL FIX: Extract sheet_name from request.data
        sheet_name = request.data.get('sheet_name')
        print(f"🔍 API ENDPOINT: Received sheet_name: {sheet_name}")

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # CRITICAL FIX: Pass sheet_name to add_student_with_auto_number
        if sheet_name:
            print(f"🔍 API ENDPOINT: Calling add_student_with_auto_number with sheet_name: {sheet_name}")
            result = service.add_student_with_auto_number(sheet_id, student_data, sheet_name)
        else:
            print(f"🔍 API ENDPOINT: Calling add_student_with_auto_number without sheet_name")
            result = service.add_student_with_auto_number(sheet_id, student_data)

        return Response(result)

    except Exception as e:
        logger.error(f"Add student with auto-number error: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_auto_number_students_service_account(request, sheet_id):
    """Auto-number all existing students in Google Sheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.auto_number_all_students(sheet_id)

        return Response(result)

    except Exception as e:
        logger.error(f"Auto-number students error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_class_records_with_live_counts_cached(request):
    """Get class records with cached live student counts"""
    try:
        from classrecord.models import ClassRecord
        from classrecord.serializers import ClassRecordSerializer
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        # Get all class records for the user
        class_records = ClassRecord.objects.filter(user=request.user).order_by('-created_at')
        serializer = ClassRecordSerializer(class_records, many=True)
        records_data = serializer.data

        # Check if Google Service Account credentials are available
        if not settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS:
            logger.warning("Google Service Account credentials not available, skipping live counts")
            # Return records without live counts
            for record in records_data:
                record['student_count'] = 0  # Default value
            return Response(records_data)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        for record in records_data:
            if record.get('google_sheet_id'):
                # 🔥 Use cache with 2-minute expiry
                cache_key = f"student_count_{record['google_sheet_id']}"
                cached_count = cache.get(cache_key)

                if cached_count is not None:
                    # Use cached value
                    record['student_count'] = cached_count
                else:
                    try:
                        # Get fresh count and cache it
                        live_count = service.get_student_count(record['google_sheet_id'])
                        record['student_count'] = live_count

                        # Cache for 2 minutes
                        cache.set(cache_key, live_count, 120)
                    except Exception as e:
                        logger.warning(f"Could not get live count for record {record['id']}: {str(e)}")

        return Response(records_data)

    except Exception as e:
        logger.error(f"Get class records with cached counts error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sheets_get_all_sheets_data_service_account(request, sheet_id):
    """Get data from ALL sheets in a Google Spreadsheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.get_all_sheets_data(sheet_id)

        return Response(result)

    except Exception as e:
        logger.error(f"Get all sheets data error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sheets_get_specific_sheet_data_service_account(request, sheet_id, sheet_name):
    """Get data from a specific sheet by name using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets
        
        # Check if force refresh is requested (bypass cache)
        force_refresh = request.GET.get('force_refresh', 'false').lower() == 'true'
        
        # Cache headers-only payload for faster card computations
        cache_key = f"sa_sheet_data_hdr_{sheet_id}_{sheet_name}"
        
        # 🔥 FIX: Check cache for complete response, not just headers
        cache_key_complete = f"sa_sheet_data_complete_{sheet_id}_{sheet_name}"
        if not force_refresh:
            cached = cache.get(cache_key_complete)
            if cached:
                return Response(cached)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.get_specific_sheet_data(sheet_id, sheet_name)

        # 🔥 FIX: Return complete data including tableData for batch grading functionality
        complete_response = {
            'success': result.get('success', True),
            'headers': result.get('headers') or result.get('main_headers') or [],
            'main_headers': result.get('main_headers') or result.get('headers') or [],
            'sub_headers': result.get('sub_headers', []),
            'max_scores': result.get('max_scores', []),
            'tableData': result.get('tableData', []),  # 🔥 CRITICAL: Include tableData
            'sheet_name': sheet_name,
        }

        # Cache the complete response for better performance
        cache.set(cache_key_complete, complete_response, 30)   # 30 seconds
        
        # Also cache headers-only version for card computations if needed
        headers_only_cache = {
            'success': result.get('success', True),
            'headers': result.get('headers') or result.get('main_headers') or [],
            'main_headers': result.get('main_headers') or result.get('headers') or [],
            'sheet_name': sheet_name,
        }
        cache.set(cache_key, headers_only_cache, 30)
        return Response(complete_response)

    except Exception as e:
        logger.error(f"Get specific sheet data error: {str(e)}")
        return Response({'error': str(e)}, status=500)





@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sheets_list_all_sheets_service_account(request, sheet_id):
    """List all sheets in a Google Spreadsheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets
        cache_key = f"sa_sheets_list_{sheet_id}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.get_sheets_list(sheet_id)

        cache.set(cache_key, result, 600)  # 10 minutes
        return Response(result)

    except Exception as e:
        logger.error(f"List all sheets error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])  # 🔥 FIXED: was permission_calls
def sheets_update_cell_specific_sheet_service_account(request, sheet_id):
    """Update a cell in a specific sheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        row = request.data.get('row')  # 0-based index
        column = request.data.get('column')  # Column name like 'QUIZ 1'
        value = request.data.get('value')
        sheet_name = request.data.get('sheet_name')  # 🔥 NEW: Specific sheet name

        if row is None or not column or value is None:
            return Response({'error': 'row, column, and value are required'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.update_cell_in_sheet(sheet_id, row, column, value, sheet_name)

        return Response(result)

    except Exception as e:
        logger.error(f"Update cell in specific sheet error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_import_students_preview(request, sheet_id):
    """Preview import conflicts before actual import"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        import_students = request.data.get('students', [])
        sheet_name = request.data.get('sheet_name')  # Optional specific sheet

        if not import_students:
            return Response({'error': 'No students provided for import'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # Validate import data first
        validation_result = service.validate_import_data(import_students)
        if not validation_result['success']:
            return Response(validation_result, status=400)

        if validation_result['invalidCount'] > 0:
            return Response({
                'success': False,
                'error': 'Invalid student data found',
                'validation': validation_result
            }, status=400)

        # Compare with existing students
        comparison_result = service.compare_students_for_import(
            sheet_id,
            validation_result['validStudents'],
            sheet_name
        )

        if not comparison_result['success']:
            return Response(comparison_result, status=500)

        return Response({
            'success': True,
            'preview': comparison_result,
            'validation': validation_result
        })

    except Exception as e:
        logger.error(f"Import preview error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_import_students_execute(request, sheet_id):
    """Execute the student import with conflict resolutions"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        new_students = request.data.get('newStudents', [])
        resolved_conflicts = request.data.get('resolvedConflicts', [])
        sheet_name = request.data.get('sheet_name')  # Optional specific sheet

        if not new_students and not resolved_conflicts:
            return Response({'error': 'No students to import'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # Execute the import
        import_result = service.import_students_batch(
            sheet_id,
            new_students,
            resolved_conflicts,
            sheet_name
        )

        return Response(import_result)

    except Exception as e:
        logger.error(f"Import execute error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_preview_column_import(request, sheet_id):
    """Preview column import before execution"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        excel_data = request.data.get('excel_data', {})
        sheet_name = request.data.get('sheet_name')  # Optional specific sheet

        if not excel_data:
            return Response({'error': 'Excel data is required'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # Preview the column import
        preview_result = service.preview_column_import(sheet_id, excel_data, sheet_name)

        return Response(preview_result)

    except Exception as e:
        logger.error(f"Preview column import error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_analyze_columns_mapping(request, sheet_id):
    """Analyze existing columns to find mapping options for import columns"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        import_columns = request.data.get('import_columns', [])
        sheet_name = request.data.get('sheet_name')  # Optional specific sheet

        if not import_columns:
            return Response({'error': 'Import columns list is required'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # Analyze columns for mapping
        analysis_result = service.analyze_columns_for_mapping(sheet_id, import_columns, sheet_name)

        return Response(analysis_result)

    except Exception as e:
        logger.error(f"Analyze columns mapping error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_execute_column_import(request, sheet_id):
    """Execute column import with mappings - BULK VERSION"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        column_mappings = request.data.get('column_mappings', [])
        import_data = request.data.get('import_data', {})
        sheet_name = request.data.get('sheet_name')  # Optional specific sheet

        if not column_mappings:
            return Response({'error': 'Column mappings are required'}, status=400)

        if not import_data:
            return Response({'error': 'Import data is required'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # 🔥 CHANGED: Use the new bulk method for faster performance
        import_result = service.import_column_data_bulk(
            sheet_id,
            column_mappings,
            import_data,
            sheet_name
        )

        return Response(import_result)

    except Exception as e:
        logger.error(f"Execute column import error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_rename_column_header(request, sheet_id):
    """Rename a column header in Google Sheet"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        column_index = request.data.get('column_index')  # 0-based index
        new_name = request.data.get('new_name')
        sheet_name = request.data.get('sheet_name')

        if column_index is None or not new_name:
            return Response({'error': 'column_index and new_name are required'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # Get the target sheet name if not provided
        if not sheet_name:
            sheet_data = service.get_sheet_data(sheet_id)
            if not sheet_data['success']:
                return Response(sheet_data, status=500)
            sheet_name = sheet_data['sheet_name']

        # Rename the column header
        rename_result = service.rename_column_header(sheet_id, column_index, new_name, sheet_name)

        return Response(rename_result)

    except Exception as e:
        logger.error(f"Rename column header error: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_analyze_columns_mapping_enhanced(request, sheet_id):
    """Enhanced column analysis with import history filtering"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets
        from classrecord.models import ClassRecord

        import_columns = request.data.get('import_columns', [])
        sheet_name = request.data.get('sheet_name')
        force_reimport = request.data.get('force_reimport', [])  # 🔥 NEW: Allow force re-import
        class_record_id = request.data.get('class_record_id')  # 🔥 NEW: Need class record ID

        if not import_columns:
            return Response({'error': 'Import columns list is required'}, status=400)

        # Validate class record ownership
        if class_record_id:
            try:
                class_record = ClassRecord.objects.get(id=class_record_id, user=request.user)
            except ClassRecord.DoesNotExist:
                return Response({'error': 'Class record not found or access denied'}, status=404)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # 🔥 NEW: Enhanced analysis with history filtering
        analysis_result = service.analyze_columns_for_mapping(
            sheet_id,
            import_columns,
            sheet_name,
            user_id=request.user.id,
            force_reimport=force_reimport
        )

        return Response(analysis_result)

    except Exception as e:
        logger.error(f"Enhanced analyze columns mapping error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_execute_column_import_enhanced(request, sheet_id):
    """Enhanced column import with history tracking - BULK VERSION"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets
        from classrecord.models import ClassRecord

        column_mappings = request.data.get('column_mappings', [])
        import_data = request.data.get('import_data', {})
        sheet_name = request.data.get('sheet_name')
        class_record_id = request.data.get('class_record_id')  # 🔥 NEW: Need class record ID

        if not column_mappings:
            return Response({'error': 'Column mappings are required'}, status=400)

        if not import_data:
            return Response({'error': 'Import data is required'}, status=400)

        # Validate class record ownership
        if class_record_id:
            try:
                class_record = ClassRecord.objects.get(id=class_record_id, user=request.user)
            except ClassRecord.DoesNotExist:
                return Response({'error': 'Class record not found or access denied'}, status=404)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # 🔥 CHANGED: Use the new bulk method for faster performance
        import_result = service.import_column_data_bulk(
            sheet_id,
            column_mappings,
            import_data,
            sheet_name
        )

        # 🔥 NEW: Save import history after successful import
        if import_result['success'] and class_record_id:
            history_result = service.save_import_history(
                column_mappings,
                import_data,
                sheet_id,
                request.user.id,
                class_record_id,
                sheet_name
            )

            if history_result['success']:
                import_result['import_history'] = history_result

            # 🔥 NEW: Add performance info to response
            if 'performance' in import_result:
                import_result[
                    'performance_note'] = f"Used bulk import: {import_result['performance']['api_calls_saved']} API calls saved!"

        return Response(import_result)

    except Exception as e:
        logger.error(f"Enhanced execute column import error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_auto_map_columns(request, sheet_id):
    """Auto-map import columns with confidence scoring"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        import_columns = request.data.get('import_columns', [])
        sheet_name = request.data.get('sheet_name')
        class_record_id = request.data.get('class_record_id')
        
        if not import_columns:
            return Response({'error': 'import_columns is required'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        
        auto_map_result = service.auto_map_columns_with_confidence(
            sheet_id, import_columns, sheet_name, request.user.id
        )
        
        # If client provided import_data, compute exceeds-max preview for display
        try:
            import_data = request.data.get('import_data')
            if import_data and auto_map_result.get('success'):
                # Build column_mappings from decisions to preview
                decisions = auto_map_result.get('decisions', [])
                column_mappings = [
                    {
                        'importColumn': d.get('importColumn'),
                        'targetColumn': d.get('targetColumn')
                    }
                    for d in decisions if d.get('targetColumn')
                ]
                preview = service.preview_exceeds_max(sheet_id, column_mappings, import_data, sheet_name)
                if preview.get('success'):
                    auto_map_result['exceedsMaxPreview'] = preview['preview']
        except Exception as _:
            pass

        return Response(auto_map_result)
        
    except Exception as e:
        logger.error(f"Auto-map columns error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_execute_auto_mapping(request, sheet_id):
    """Execute import with auto-mapping decisions"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        decisions = request.data.get('decisions', [])
        import_data = request.data.get('import_data', {})
        sheet_name = request.data.get('sheet_name')
        class_record_id = request.data.get('class_record_id')
        
        if not decisions:
            return Response({'error': 'decisions are required'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        
        # Execute using new auto-mapping executor (handles inserts for non-exam)
        import_result = service.execute_auto_mapping(
            sheet_id,
            decisions,
            import_data,
            sheet_name
        )

        # Optionally save import history, mirroring enhanced flow
        if import_result.get('success') and class_record_id:
            try:
                history_result = service.save_import_history(
                    column_mappings,
                    import_data,
                    sheet_id,
                    request.user.id,
                    class_record_id,
                    sheet_name
                )
                if history_result.get('success'):
                    import_result['import_history'] = history_result
            except Exception as e:
                logger.warning(f"Auto-mapping history save failed: {str(e)}")

        return Response(import_result)
        
    except Exception as e:
        logger.error(f"Execute auto-mapping error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_import_history(request, sheet_id):
    """Get import history for a specific Google Sheet"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        history_result = service.get_import_history(sheet_id, request.user.id)

        return Response(history_result)

    except Exception as e:
        logger.error(f"Get import history error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_update_max_score_service_account(request, sheet_id):
    """Update max score for a single column using voice command"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        column_name = request.data.get('column_name')  # e.g., 'QUIZ 1'
        max_score = request.data.get('max_score')      # e.g., '30'
        sheet_name = request.data.get('sheet_name')    # Optional specific sheet

        if not column_name or max_score is None:
            return Response({'error': 'column_name and max_score are required'}, status=400)

        # Validate max score is a positive number
        try:
            max_score_float = float(max_score)
            if max_score_float < 0:
                return Response({'error': 'Max score must be a positive number'}, status=400)
        except ValueError:
            return Response({'error': 'Max score must be a valid number'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # Update the max score
        result = service.update_max_score_in_sheet(sheet_id, column_name, str(max_score), sheet_name)

        return Response(result)

    except Exception as e:
        logger.error(f"Update max score error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_update_batch_max_scores_service_account(request, sheet_id):
    """Update max scores for multiple columns using voice command (batch operation)"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        column_names = request.data.get('column_names', [])  # e.g., ['QUIZ 1', 'QUIZ 2']
        max_score = request.data.get('max_score')            # e.g., '20'
        sheet_name = request.data.get('sheet_name')          # Optional specific sheet

        if not column_names or max_score is None:
            return Response({'error': 'column_names (array) and max_score are required'}, status=400)

        # Validate max score is a positive number
        try:
            max_score_float = float(max_score)
            if max_score_float < 0:
                return Response({'error': 'Max score must be a positive number'}, status=400)
        except ValueError:
            return Response({'error': 'Max score must be a valid number'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # Update the batch max scores
        result = service.update_batch_max_scores_in_sheet(sheet_id, column_names, str(max_score), sheet_name)

        return Response(result)

    except Exception as e:
        logger.error(f"Update batch max scores error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_update_range_service_account(request, sheet_id):
    """Update a range of cells in Google Sheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        range_name = request.data.get('range')  # e.g., 'A2:Z100'
        values = request.data.get('values')  # 2D array of values
        sheet_name = request.data.get('sheet_name')  # Optional specific sheet

        if not range_name or not values:
            return Response({'error': 'range and values are required'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # Update the range of cells
        result = service.update_range(sheet_id, range_name, values, sheet_name)

        return Response(result)

    except Exception as e:
        logger.error(f"Update range error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])  # 🔥 FIXED: Added permission_classes like your other endpoints
def delete_student_from_sheet(request, sheet_id):
    """Delete a student from a specific Google Sheet"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets  # 🔥 FIXED: Correct import

        student_identifier = request.data.get('student_identifier')
        search_type = request.data.get('search_type', 'name')  # 'name' or 'id'
        sheet_name = request.data.get('sheet_name')

        if not student_identifier:
            return Response({
                'success': False,
                'error': 'Student identifier is required'
            }, status=400)

        print(f"🗑️ API: Delete student request - {search_type}: '{student_identifier}' from sheet: {sheet_name}")

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.delete_student_from_sheet(sheet_id, student_identifier, search_type, sheet_name)

        if result['success']:
            return Response(result, status=200)
        else:
            return Response(result, status=400)

    except Exception as e:
        logger.error(f"Delete student API error: {str(e)}")
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_multiple_cells_service_account(request, sheet_id):
    """Update multiple individual cells while preserving formulas"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        updates = request.data.get('updates', [])  # Array of {range, values}
        sheet_name = request.data.get('sheet_name')

        if not updates:
            return Response({'error': 'updates array is required'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # Execute batch update
        body = {
            'valueInputOption': 'USER_ENTERED',
            'data': updates
        }

        result = service.sheets_service.spreadsheets().values().batchUpdate(
            spreadsheetId=sheet_id,
            body=body
        ).execute()

        return Response({
            'success': True,
            'updated_cells': result.get('totalUpdatedCells', 0),
            'updated_ranges': len(updates)
        })

    except Exception as e:
        logger.error(f"Update multiple cells error: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_add_category_service_account(request, sheet_id):
    """Add a new category with multiple columns to Google Sheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        category_name = request.data.get('category_name')  # e.g., 'Lab Exercises'
        sub_categories = request.data.get('sub_categories', [])  # e.g., ['Lab 1', 'Lab 2', 'Lab 3']
        sub_category_count = request.data.get('sub_category_count', len(sub_categories))
        sheet_name = request.data.get('sheet_name')  # Optional specific sheet
        percentage = request.data.get('percentage', '10.00%')  # 🔥 NEW: Get percentage from request

        if not category_name:
            return Response({'error': 'category_name is required'}, status=400)

        if not sub_categories:
            return Response({'error': 'sub_categories array is required'}, status=400)

        if sub_category_count < 1 or sub_category_count > 20:
            return Response({'error': 'sub_category_count must be between 1 and 20'}, status=400)

        print(f"🔥 API: Adding category '{category_name}' with {sub_category_count} subcategories and {percentage} to sheet: {sheet_name}")
        print(f"🔥 API: Full request data: {request.data}")

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.add_category_to_sheet(sheet_id, category_name, sub_categories, sheet_name, percentage)  # 🔥 Pass percentage
        
        print(f"🔥 API: Service result: {result}")

        if result['success']:
            return Response(result, status=200)
        else:
            return Response(result, status=400)

    except Exception as e:
        logger.error(f"Add category API error: {str(e)}")
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_delete_category_service_account(request, sheet_id):
    """Delete a category and all its columns from Google Sheet using service account"""


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_delete_category_service_account(request, sheet_id):
    """Delete a category and all its columns from Google Sheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        category_name = request.data.get('category_name')  # e.g., 'Projects'
        sheet_name = request.data.get('sheet_name')  # Optional specific sheet

        if not category_name:
            return Response({'error': 'category_name is required'}, status=400)

        print(f"🗑️ API: Deleting category '{category_name}' from sheet: {sheet_name}")

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.delete_category_from_sheet(sheet_id, category_name, sheet_name)

        if result['success']:
            return Response(result, status=200)
        else:
            return Response(result, status=400)

    except Exception as e:
        logger.error(f"Delete category API error: {str(e)}")
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_add_column_to_category_service_account(request, sheet_id):
    """Add a new column to an existing category in Google Sheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        category_name = request.data.get('category_name')  # e.g., 'Quizzes'
        new_column_name = request.data.get('new_column_name')  # e.g., 'Quiz 6' (optional, auto-generated if not provided)
        sheet_name = request.data.get('sheet_name')  # Optional specific sheet

        if not category_name:
            return Response({'error': 'category_name is required'}, status=400)

        print(f"➕ API: Adding column to category '{category_name}' in sheet: {sheet_name}")
        print(f"➕ API: New column name: {new_column_name or 'auto-generated'}")

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.add_column_to_category(sheet_id, category_name, new_column_name, sheet_name)

        if result['success']:
            return Response(result, status=200)
        else:
            return Response(result, status=400)

    except Exception as e:
        logger.error(f"Add column to category API error: {str(e)}")
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sheets_edit_category_service_account(request, sheet_id):
    """Edit a category name and percentage in Google Sheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        old_category_name = request.data.get('old_category_name')  # e.g., 'Projects'
        new_category_name = request.data.get('new_category_name')  # e.g., 'Lab Activities'
        new_percentage = request.data.get('new_percentage')        # e.g., '15.00%'
        sheet_name = request.data.get('sheet_name')               # Optional specific sheet

        if not old_category_name or not new_category_name:
            return Response({'error': 'old_category_name and new_category_name are required'}, status=400)

        if not new_percentage:
            new_percentage = "10.00%"  # Default percentage if not provided

        print(f"✏️ API: Editing category '{old_category_name}' to '{new_category_name}' with {new_percentage} in sheet: {sheet_name}")

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.edit_category_in_sheet(sheet_id, old_category_name, new_category_name, new_percentage, sheet_name)

        if result['success']:
            return Response(result, status=200)
        else:
            return Response(result, status=400)

    except Exception as e:
        logger.error(f"Edit category API error: {str(e)}")
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sheets_get_categories_service_account(request, sheet_id):
    """Get all categories from a Google Sheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        sheet_name = request.GET.get('sheet_name')  # Optional specific sheet

        print(f"📋 API: Getting categories from sheet: {sheet_name}")

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.get_categories_from_sheet(sheet_id, sheet_name)

        if result['success']:
            return Response(result, status=200)
        else:
            return Response(result, status=400)

    except Exception as e:
        logger.error(f"Get categories API error: {str(e)}")
        return Response({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=500)


# Google Drive Connection Management Endpoints

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_google_drive_connection(request):
    """Check if user has Google Drive connected and tokens are valid"""
    try:
        user = request.user
        
        return Response({
            'connected': user.has_google_drive,
            'has_google_id': user.has_google,
            'connected_at': user.google_connected_at,
            'expires_at': user.google_token_expires_at,
            'needs_connection': not user.has_google_drive and not user.has_google
        })
        
    except Exception as e:
        logger.error(f"Check Google Drive connection error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def connect_google_account(request):
    """Connect Google account to existing user for Drive access"""
    try:
        user = request.user
        
        # Get tokens from request
        access_token = request.data.get('access_token')
        refresh_token = request.data.get('refresh_token')
        expires_in = request.data.get('expires_in', 3600)
        
        if not access_token or not refresh_token:
            return Response({'error': 'Access token and refresh token required'}, status=400)
        
        # Validate the access token with Google
        try:
            response = http_requests.get(
                "https://www.googleapis.com/oauth2/v1/userinfo",
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )
            
            if response.status_code != 200:
                return Response({'error': 'Invalid access token'}, status=400)
            
            google_user_info = response.json()
            google_email = google_user_info.get('email')
            
            # Verify the Google email matches the user's email
            if google_email != user.email:
                return Response({
                    'error': 'Google account email does not match your account email'
                }, status=400)
            
        except http_requests.exceptions.RequestException as e:
            logger.error(f"Google token validation failed: {str(e)}")
            return Response({'error': 'Failed to validate Google account'}, status=400)
        
        # Encrypt and store tokens
        encrypted_tokens = token_encryption.encrypt_tokens(access_token, refresh_token)
        
        # Calculate expiry time
        expires_at = timezone.now() + timedelta(seconds=expires_in)
        
        # Update user with Google connection info
        user.google_id = google_user_info.get('id')
        user.google_access_token = encrypted_tokens['access_token']
        user.google_refresh_token = encrypted_tokens['refresh_token']
        user.google_token_expires_at = expires_at
        user.google_connected_at = timezone.now()
        user.profile_picture = google_user_info.get('picture', user.profile_picture)
        user.save()
        
        logger.info(f"Successfully connected Google account for user: {user.email}")
        
        return Response({
            'success': True,
            'message': 'Google account connected successfully',
            'connected_at': user.google_connected_at
        })
        
    except Exception as e:
        logger.error(f"Connect Google account error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_google_tokens(request):
    """Refresh expired Google access tokens"""
    try:
        user = request.user
        
        if not user.google_refresh_token:
            return Response({'error': 'No Google account connected'}, status=400)
        
        # Get valid access token (will refresh if needed)
        valid_token = google_token_service.get_valid_access_token(user)
        
        if not valid_token:
            return Response({'error': 'Failed to refresh tokens'}, status=400)
        
        return Response({
            'success': True,
            'message': 'Tokens refreshed successfully',
            'expires_at': user.google_token_expires_at
        })
        
    except Exception as e:
        logger.error(f"Refresh Google tokens error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disconnect_google_account(request):
    """Disconnect Google account and clear tokens"""
    try:
        user = request.user
        
        # Clear Google connection data
        user.google_id = None
        user.google_access_token = None
        user.google_refresh_token = None
        user.google_token_expires_at = None
        user.google_connected_at = None
        user.save()
        
        logger.info(f"Successfully disconnected Google account for user: {user.email}")
        
        return Response({
            'success': True,
            'message': 'Google account disconnected successfully'
        })
        
    except Exception as e:
        logger.error(f"Disconnect Google account error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_google_drive_token(request):
    """Get a valid Google Drive access token for the user"""
    try:
        user = request.user
        
        if not user.has_google_drive:
            return Response({'error': 'Google Drive not connected'}, status=400)
        
        # Get valid access token
        valid_token = google_token_service.get_valid_access_token(user)
        
        if not valid_token:
            return Response({'error': 'Failed to get valid access token'}, status=400)
        
        return Response({
            'access_token': valid_token,
            'expires_at': user.google_token_expires_at
        })
        
    except Exception as e:
        logger.error(f"Get Google Drive token error: {str(e)}")
        return Response({'error': str(e)}, status=500)


def final_grade_preview_logic(sheet_id, class_record_id, sa_sheets_service, user=None):
    """Extracted preview logic for reuse in export"""
    try:
        # Define required columns per sheet
        midterm_required = [
            'QUIZ 1', 'QUIZ 2', 'QUIZ 3', 'QUIZ 4', 'QUIZ 5',
            'ASSIGN 1', 'ASSIGN 2', 'ASSIGN 3', 'ASSIGN 4', 'ASSIGN 5',
            'SEAT 1', 'SEAT 2', 'SEAT 3', 'SEAT 4', 'SEAT 5',
            'LAB 1', 'LAB 2', 'LAB 3', 'LAB 4', 'LAB 5',
            'PRELIM', 'MIDTERM'
        ]
        final_required = [
            'QUIZ 1', 'QUIZ 2', 'QUIZ 3', 'QUIZ 4', 'QUIZ 5',
            'ASSIGN 1', 'ASSIGN 2', 'ASSIGN 3', 'ASSIGN 4', 'ASSIGN 5',
            'SEAT 1', 'SEAT 2', 'SEAT 3', 'SEAT 4', 'SEAT 5',
            'LAB 1', 'LAB 2', 'LAB 3', 'LAB 4', 'LAB 5',
            'PREFINAL', 'FINALS'
        ]

        def analyze_sheet_for_grades(sheet_name: str, required_headers: List[str], extract_map: Dict[str, List[str]]) -> Dict:
            print(f"🔍 ANALYZING SHEET: {sheet_name}")
            data = sa_sheets_service.get_specific_sheet_data(sheet_id, sheet_name)
            if not data.get('success'):
                print(f"❌ SHEET ERROR: {data.get('error')}")
                return {'error': data.get('error'), 'students': [], 'missing_by_student': {}}

            headers = data.get('headers', [])
            main_headers = data.get('main_headers', [])  # Row 1 categories
            sub_headers = data.get('sub_headers', [])    # Row 2 column names
            rows = data.get('tableData', [])
            base_row_offset = 2
            
            print(f"📋 HEADERS FOUND: {headers}")
            print(f"📊 ROWS COUNT: {len(rows)}")

            # Robust header detection
            candidates = [headers] + rows[:4]
            import re
            def norm(s: str) -> str:
                return (s or '').strip().upper()
            def norm2(s: str) -> str:
                return re.sub(r'[^A-Z0-9]', '', (s or '').upper())
            
            identity_set = {norm('LASTNAME'), norm('FIRST NAME'), norm('MIDDLE NAME'), norm('STUDENT ID')}
            req_set = {norm(r) for r in required_headers}

            best_idx = 0
            best_score = -1
            for idx, row_vals in enumerate(candidates):
                row_norm = {norm(h) for h in row_vals}
                score = len(row_norm.intersection(identity_set)) + len(row_norm.intersection(req_set))
                if score > best_score:
                    best_score = score
                    best_idx = idx
            
            if best_idx != 0:
                headers = candidates[best_idx]
                base_row_offset = best_idx + 2
                rows = rows[best_idx:]

            # Build header index
            header_index = {}
            header_display = {}
            for idx, h in enumerate(headers):
                n = norm2(h)
                if n and n not in header_index:
                    header_index[n] = idx
                    header_display[n] = h
                if n.endswith('S'):
                    ns = n[:-1]
                    if ns and ns not in header_index:
                        header_index[ns] = idx
                        header_display[ns] = h

            # Find identity columns
            lastname_idx = header_index.get(norm2('LASTNAME'))
            firstname_idx = header_index.get(norm2('FIRST NAME'))
            middlename_idx = header_index.get(norm2('MIDDLE NAME'))  # Optional - can be None
            studentid_idx = header_index.get(norm2('STUDENT ID'))

            # Only require lastname, firstname, and studentid - middle name is optional
            if None in [lastname_idx, firstname_idx, studentid_idx]:
                return {'error': 'Identity headers missing', 'students': [], 'missing_by_student': {}}

            # Find grade columns
            grade_columns = {}
            for req in required_headers:
                req_norm = norm2(req)
                if req_norm in header_index:
                    grade_columns[req] = header_index[req_norm]

            # Resolve extract columns once per sheet (map output_field -> column index)
            # First try exact normalized match; if not found, try fuzzy contains match
            extract_columns_index: Dict[str, Optional[int]] = {}
            headers_norm_list = [(idx, norm2(h), h) for idx, h in enumerate(headers)]
            main_headers_norm_list = [(idx, norm2(h), h) for idx, h in enumerate(main_headers)]
            sub_headers_norm_list = [(idx, norm2(h), h) for idx, h in enumerate(sub_headers)]
            for output_field, candidates in extract_map.items():
                chosen_idx: Optional[int] = None
                # exact match pass against MAIN headers first (these contain: Class Standing, PRELIM/PREFINAL, MIDTERM/FINALS, Term Grade)
                for cand in candidates:
                    cand_norm = norm2(cand)
                    for idx_h, h_norm, _h in main_headers_norm_list:
                        if cand_norm == h_norm and cand_norm:
                            chosen_idx = idx_h
                            print(f"✅ EXACT MATCH (MAIN): {output_field} -> {cand} (col {chosen_idx})")
                            break
                    if chosen_idx is not None:
                        break
                # exact match pass against combined headers
                for cand in candidates:
                    cand_norm = norm2(cand)
                    if cand_norm in header_index:
                        chosen_idx = header_index[cand_norm]
                        print(f"✅ EXACT MATCH (COMBINED): {output_field} -> {cand} (col {chosen_idx})")
                        break
                # fuzzy contains pass
                if chosen_idx is None:
                    # try MAIN headers contains
                    for cand in candidates:
                        cand_norm = norm2(cand)
                        if not cand_norm:
                            continue
                        for idx_h, h_norm, _h in main_headers_norm_list:
                            if cand_norm in h_norm or h_norm in cand_norm:
                                chosen_idx = idx_h
                                print(f"✅ FUZZY MATCH (MAIN): {output_field} -> {cand} matches {_h} (col {chosen_idx})")
                                break
                        if chosen_idx is not None:
                            break
                if chosen_idx is None:
                    for cand in candidates:
                        cand_norm = norm2(cand)
                        if not cand_norm:
                            continue
                        for idx_h, h_norm, _h in headers_norm_list:
                            if cand_norm in h_norm or h_norm in cand_norm:
                                chosen_idx = idx_h
                                print(f"✅ FUZZY MATCH (COMBINED): {output_field} -> {cand} matches {_h} (col {chosen_idx})")
                                break
                        if chosen_idx is not None:
                            break
                if chosen_idx is None:
                    print(f"❌ NO MATCH: {output_field} not found for candidates {candidates}")
                extract_columns_index[output_field] = chosen_idx
            
            print(f"🎯 EXTRACT MAPPING: {extract_columns_index}")

            students = []
            missing_by_student = {}

            for r_index, row in enumerate(rows, start=base_row_offset):
                # Get identity (cast to string before strip to handle numeric cells)
                last_name = (
                    str(row[lastname_idx]).strip() if lastname_idx < len(row) and row[lastname_idx] is not None else ''
                )
                first_name = (
                    str(row[firstname_idx]).strip() if firstname_idx < len(row) and row[firstname_idx] is not None else ''
                )
                # Middle name is optional - handle case where column doesn't exist or is empty
                middle_name = ''
                try:
                    if middlename_idx is not None and middlename_idx < len(row) and row[middlename_idx] is not None:
                        middle_name = str(row[middlename_idx]).strip()
                except (IndexError, TypeError, AttributeError):
                    # Middle name column doesn't exist or is inaccessible - use empty string
                    middle_name = ''
                student_id = (
                    str(row[studentid_idx]).strip() if studentid_idx < len(row) and row[studentid_idx] is not None else ''
                )
                
                # Only require last_name, first_name, and student_id - middle_name is optional
                if not (last_name and first_name and student_id):
                    continue

                student_key = f"{student_id}_{last_name}_{first_name}"
                # Construct fullName with optional middle name
                if middle_name:
                    full_name = f"{last_name}, {first_name} {middle_name}".strip()
                else:
                    full_name = f"{last_name}, {first_name}".strip()
                
                student_data = {
                    'studentId': student_id,
                    'lastName': last_name,
                    'firstName': first_name,
                    'middleName': middle_name,
                    'fullName': full_name
                }

                # Extract requested fields from this sheet
                for out_field, col_idx in extract_columns_index.items():
                    value = ''
                    if col_idx is not None and col_idx < len(row):
                        cell = row[col_idx]
                        value = str(cell).strip() if cell is not None else ''
                    student_data[out_field] = value

                missing_cells = []
                for col_name, col_idx in grade_columns.items():
                    val = row[col_idx] if col_idx < len(row) else ''
                    s = str(val).strip() if val is not None else ''
                    if s == '':
                        missing_cells.append({
                            'column': col_name,
                            'displayHeader': header_display.get(norm2(col_name), col_name),
                            'rowIndex': r_index,
                            'sheetName': sheet_name
                        })

                if missing_cells:
                    missing_by_student[student_key] = missing_cells

                students.append(student_data)

            return {'students': students, 'missing_by_student': missing_by_student}

        # Determine actual sheet names (handle case and naming variations)
        resolved_midterm = 'Midterm'
        resolved_final = 'Final'
        try:
            info = sa_sheets_service.get_all_sheets_data(sheet_id)
            if info.get('success'):
                titles = [s.get('sheet_name', '') for s in info.get('sheets', [])]
                # Prefer exact matches ignoring case
                for t in titles:
                    if t and t.lower() == 'midterm':
                        resolved_midterm = t
                    if t and t.lower() == 'final':
                        resolved_final = t
                # If not exact, look for contains but avoid 'prefinal' for final
                if resolved_midterm == 'Midterm':
                    for t in titles:
                        if t and 'midterm' in t.lower():
                            resolved_midterm = t
                            break
                if resolved_final == 'Final':
                    for t in titles:
                        tl = t.lower()
                        if t and ('final' in tl) and ('prefinal' not in tl):
                            resolved_final = t
                            break
        except Exception:
            # Fallback to defaults if resolution fails
            pass

        # Analyze both sheets
        # Explicit mappings based on your sheet definitions (with common variants)
        # MIDTERM TAB: CS1=Class Standing, PE=Prelim, ME=Midterm, midtermGrade=Term Grade
        midterm_extract_map = {
            'CS1': [
                'Class Standing', 'CLASS STANDING', 'CLASSSTANDING', 'CS1', 'C S 1'
            ],
            'PE': [
                'Prelim', 'PRELIM', 'PRELIM EXAM', 'PRELIMEXAM', 'PRE-LIM', 'PRE LIM'
            ],
            'ME': [
                'Midterm', 'MIDTERM', 'MIDTERM EXAM', 'MIDTERMEXAM', 'MID TERM', 'MID-TERM'
            ],
            'midtermGrade': [
                'Term Grade', 'TERM GRADE', 'TERMGRADE', 'MIDTERM GRADE', 'TERM GRADE (MIDTERM)', 'MIDTERM TERM GRADE'
            ]
        }
        # FINAL TAB: CS2=Class Standing, PFE=Prefinal, FE=Finals, finalTermGrade=Term Grade
        final_extract_map = {
            'CS2': [
                'Class Standing', 'CLASS STANDING', 'CLASSSTANDING', 'CS2', 'C S 2'
            ],
            'PFE': [
                'Prefinal', 'PREFINAL', 'PRE-FINAL', 'PRE FINAL', 'PREFINAL EXAM', 'PREFINALEXAM', 'PRE-FINAL EXAM'
            ],
            'FE': [
                'Finals', 'FINALS', 'FINAL', 'FINAL EXAM', 'FINALSEXAM', 'FINALS EXAM'
            ],
            'finalTermGrade': [
                'Term Grade', 'TERM GRADE', 'TERMGRADE', 'FINAL TERM GRADE', 'TERM GRADE (FINAL)', 'FINALS GRADE'
            ],
            'FGOverride': [
                'FG', 'Final Grade', 'FINAL GRADE'
            ]
        }

        midterm_result = analyze_sheet_for_grades(resolved_midterm, midterm_required, midterm_extract_map)
        final_result = analyze_sheet_for_grades(resolved_final, final_required, final_extract_map)

        if midterm_result.get('error') or final_result.get('error'):
            return {
                'success': False,
                'error': f"Midterm: {midterm_result.get('error', 'OK')}, Final: {final_result.get('error', 'OK')}"
            }

        # Combine results - only include students that exist in BOTH sheets
        # First, track which students exist in each sheet
        midterm_student_keys = set()
        final_student_keys = set()
        
        for student in midterm_result['students']:
            key = f"{student['studentId']}_{student['lastName']}_{student['firstName']}"
            midterm_student_keys.add(key)
        
        for student in final_result['students']:
            key = f"{student['studentId']}_{student['lastName']}_{student['firstName']}"
            final_student_keys.add(key)
        
        # Only include students that exist in BOTH sheets
        students_in_both = midterm_student_keys.intersection(final_student_keys)
        
        print(f"📊 Students in Midterm sheet: {len(midterm_student_keys)}")
        print(f"📊 Students in Final sheet: {len(final_student_keys)}")
        print(f"✅ Students in BOTH sheets (will be included): {len(students_in_both)}")
        
        # Build student lookup dictionaries for efficient merging
        midterm_students_dict = {}
        for student in midterm_result['students']:
            key = f"{student['studentId']}_{student['lastName']}_{student['firstName']}"
            midterm_students_dict[key] = student
        
        final_students_dict = {}
        for student in final_result['students']:
            key = f"{student['studentId']}_{student['lastName']}_{student['firstName']}"
            final_students_dict[key] = student
        
        # Merge data for students that exist in both sheets
        all_students = {}
        all_missing = {}
        
        for key in students_in_both:
            # Start with midterm student data
            student = midterm_students_dict[key].copy()
            
            # Merge final sheet extracted fields into student record
            if key in final_students_dict:
                final_student = final_students_dict[key]
                for field in ['CS2', 'PFE', 'FE', 'finalTermGrade', 'FGOverride']:
                    if field in final_student:
                        student[field] = final_student.get(field, '')
            
            all_students[key] = student
            # Combine missing data from both sheets
            midterm_missing = midterm_result['missing_by_student'].get(key, [])
            final_missing = final_result['missing_by_student'].get(key, [])
            all_missing[key] = midterm_missing + final_missing

        # Compute FG from midterm and final term grades when numeric
        def to_number(s: str):
            try:
                return float(s)
            except Exception:
                return None

        # Load overrides if available (don't depend on request context)
        try:
            from classrecord.models import ClassRecord
            if user is not None:
                cr = ClassRecord.objects.get(id=class_record_id, user=user)
            else:
                cr = ClassRecord.objects.get(id=class_record_id)
            overrides = dict(getattr(cr, 'final_grade_overrides', {}) or {})
        except Exception:
            overrides = {}

        for s in all_students.values():
            mid_raw = str(s.get('midtermGrade', '')).strip()
            fin_raw = str(s.get('finalTermGrade', '')).strip()
            mid = to_number(mid_raw)
            fin = to_number(fin_raw)
            if mid is not None and fin is not None:
                s['FG'] = round((mid + fin) / 2, 2)
            else:
                s['FG'] = ''

            # If term grades carry status strings, propagate to FG
            mid_status = mid_raw.upper()
            fin_status = fin_raw.upper()
            if mid_status in ['INC', 'N/A'] or fin_status in ['INC', 'N/A']:
                # Prefer INC over N/A if both appear
                if 'INC' in [mid_status, fin_status]:
                    s['FG'] = 'INC'
                else:
                    s['FG'] = 'N/A'

            # Override FG if explicit FGOverride present (INC/N/A)
            fg_override = str(s.get('FGOverride', '')).strip().upper()
            if fg_override in ['INC', 'N/A']:
                s['FG'] = fg_override

            # Apply DB override by composite preview key first, then by id
            sid = str(s.get('studentId', '')).strip()
            lname = str(s.get('lastName', '')).strip()
            fname = str(s.get('firstName', '')).strip()
            composite_key = f"{sid}_{lname}_{fname}" if sid and lname and fname else None
            if composite_key and overrides.get(composite_key, '').upper() in ['INC', 'N/A']:
                s['FG'] = overrides[composite_key].upper()
            elif sid and overrides.get(sid, '').upper() in ['INC', 'N/A']:
                s['FG'] = overrides[sid].upper()

        # Build response
        response_data = {
            'success': True,
            'students': list(all_students.values()),
            'missing_by_student': all_missing,
            'summary': {
                'total_students': len(all_students),
                'with_missing': len([k for k, v in all_missing.items() if v]),
                'complete': len([k for k, v in all_missing.items() if not v])
            },
            'usedCache': False,
            'checkedAt': timezone.now().isoformat(),
            'sheetVersion': {'modifiedTime': None}
        }

        return response_data

    except Exception as e:
        logger.error(f"Final grade preview logic error: {str(e)}")
        return {'success': False, 'error': str(e)}


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def final_grade_preview(request, sheet_id):
    """Generate final grade preview with missing score details"""
    try:
        class_record_id = request.data.get('class_record_id')
        force = bool(request.data.get('force', False))

        if not class_record_id:
            return Response({'error': 'class_record_id is required'}, status=400)

        # Get class record
        try:
            from classrecord.models import ClassRecord
            class_record = ClassRecord.objects.get(id=class_record_id, user=request.user)
        except ClassRecord.DoesNotExist:
            return Response({'error': 'Class record not found'}, status=404)

        # Delegate to shared logic that applies FG overrides and consistent parsing
        from utils.google_service_account_sheets import GoogleServiceAccountSheets
        sa_sheets_service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = final_grade_preview_logic(sheet_id, class_record_id, sa_sheets_service, user=request.user)
        return Response(result)

        # Initialize service-account based sheets service (avoid user-token 401s)
        from utils.google_service_account_sheets import GoogleServiceAccountSheets
        sa_sheets_service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)

        # Skip Drive modified time versioning when using SA (not needed for preview)
        modified_time = None

        # Check cache if not forcing (only if model has cache fields)
        has_cache_fields = all(
            hasattr(class_record, attr)
            for attr in ['grades_completeness', 'completeness_sheet_version', 'completeness_checked_at']
        )
        if not force and has_cache_fields:
            cached_result = getattr(class_record, 'grades_completeness', None)
            cached_version = getattr(class_record, 'completeness_sheet_version', None)
            if cached_result and cached_version and cached_version.get('modifiedTime') == modified_time:
                cached_result['usedCache'] = True
                return Response(cached_result)

        # Define required columns per sheet
        midterm_required = [
            'QUIZ 1', 'QUIZ 2', 'QUIZ 3', 'QUIZ 4', 'QUIZ 5',
            'ASSIGN 1', 'ASSIGN 2', 'ASSIGN 3', 'ASSIGN 4', 'ASSIGN 5',
            'SEAT 1', 'SEAT 2', 'SEAT 3', 'SEAT 4', 'SEAT 5',
            'LAB 1', 'LAB 2', 'LAB 3', 'LAB 4', 'LAB 5',
            'PRELIM', 'MIDTERM'
        ]
        final_required = [
            'QUIZ 1', 'QUIZ 2', 'QUIZ 3', 'QUIZ 4', 'QUIZ 5',
            'ASSIGN 1', 'ASSIGN 2', 'ASSIGN 3', 'ASSIGN 4', 'ASSIGN 5',
            'SEAT 1', 'SEAT 2', 'SEAT 3', 'SEAT 4', 'SEAT 5',
            'LAB 1', 'LAB 2', 'LAB 3', 'LAB 4', 'LAB 5',
            'PREFINAL', 'FINALS'
        ]

        def analyze_sheet_for_grades(sheet_name: str, required_headers: List[str], extract_map: Dict[str, List[str]]) -> Dict:
            print(f"🔍 ANALYZING SHEET: {sheet_name}")
            data = sa_sheets_service.get_specific_sheet_data(sheet_id, sheet_name)
            if not data.get('success'):
                print(f"❌ SHEET ERROR: {data.get('error')}")
                return {'error': data.get('error'), 'students': [], 'missing_by_student': {}}

            headers = data.get('headers', [])
            main_headers = data.get('main_headers', [])  # Row 1 categories
            sub_headers = data.get('sub_headers', [])    # Row 2 column names
            rows = data.get('tableData', [])
            base_row_offset = 2
            
            print(f"📋 HEADERS FOUND: {headers}")
            print(f"📊 ROWS COUNT: {len(rows)}")

            # Robust header detection
            candidates = [headers] + rows[:4]
            import re
            def norm(s: str) -> str:
                return (s or '').strip().upper()
            def norm2(s: str) -> str:
                return re.sub(r'[^A-Z0-9]', '', (s or '').upper())
            
            identity_set = {norm('LASTNAME'), norm('FIRST NAME'), norm('MIDDLE NAME'), norm('STUDENT ID')}
            req_set = {norm(r) for r in required_headers}

            best_idx = 0
            best_score = -1
            for idx, row_vals in enumerate(candidates):
                row_norm = {norm(h) for h in row_vals}
                score = len(row_norm.intersection(identity_set)) + len(row_norm.intersection(req_set))
                if score > best_score:
                    best_score = score
                    best_idx = idx
            
            if best_idx != 0:
                headers = candidates[best_idx]
                base_row_offset = best_idx + 2
                rows = rows[best_idx:]

            # Build header index
            header_index = {}
            header_display = {}
            for idx, h in enumerate(headers):
                n = norm2(h)
                if n and n not in header_index:
                    header_index[n] = idx
                    header_display[n] = h
                if n.endswith('S'):
                    ns = n[:-1]
                    if ns and ns not in header_index:
                        header_index[ns] = idx
                        header_display[ns] = h

            # Find identity columns
            lastname_idx = header_index.get(norm2('LASTNAME'))
            firstname_idx = header_index.get(norm2('FIRST NAME'))
            middlename_idx = header_index.get(norm2('MIDDLE NAME'))  # Optional - can be None
            studentid_idx = header_index.get(norm2('STUDENT ID'))

            # Only require lastname, firstname, and studentid - middle name is optional
            if None in [lastname_idx, firstname_idx, studentid_idx]:
                return {'error': 'Identity headers missing', 'students': [], 'missing_by_student': {}}

            # Find grade columns
            grade_columns = {}
            for req in required_headers:
                req_norm = norm2(req)
                if req_norm in header_index:
                    grade_columns[req] = header_index[req_norm]

            # Resolve extract columns once per sheet (map output_field -> column index)
            # First try exact normalized match; if not found, try fuzzy contains match
            extract_columns_index: Dict[str, Optional[int]] = {}
            headers_norm_list = [(idx, norm2(h), h) for idx, h in enumerate(headers)]
            main_headers_norm_list = [(idx, norm2(h), h) for idx, h in enumerate(main_headers)]
            sub_headers_norm_list = [(idx, norm2(h), h) for idx, h in enumerate(sub_headers)]
            for output_field, candidates in extract_map.items():
                chosen_idx: Optional[int] = None
                # exact match pass against MAIN headers first (these contain: Class Standing, PRELIM/PREFINAL, MIDTERM/FINALS, Term Grade)
                for cand in candidates:
                    cand_norm = norm2(cand)
                    for idx_h, h_norm, _h in main_headers_norm_list:
                        if cand_norm == h_norm and cand_norm:
                            chosen_idx = idx_h
                            print(f"✅ EXACT MATCH (MAIN): {output_field} -> {cand} (col {chosen_idx})")
                            break
                    if chosen_idx is not None:
                        break
                # exact match pass against combined headers
                for cand in candidates:
                    cand_norm = norm2(cand)
                    if cand_norm in header_index:
                        chosen_idx = header_index[cand_norm]
                        print(f"✅ EXACT MATCH (COMBINED): {output_field} -> {cand} (col {chosen_idx})")
                        break
                # fuzzy contains pass
                if chosen_idx is None:
                    # try MAIN headers contains
                    for cand in candidates:
                        cand_norm = norm2(cand)
                        if not cand_norm:
                            continue
                        for idx_h, h_norm, _h in main_headers_norm_list:
                            if cand_norm in h_norm or h_norm in cand_norm:
                                chosen_idx = idx_h
                                print(f"✅ FUZZY MATCH (MAIN): {output_field} -> {cand} matches {_h} (col {chosen_idx})")
                                break
                        if chosen_idx is not None:
                            break
                if chosen_idx is None:
                    for cand in candidates:
                        cand_norm = norm2(cand)
                        if not cand_norm:
                            continue
                        for idx_h, h_norm, _h in headers_norm_list:
                            if cand_norm in h_norm or h_norm in cand_norm:
                                chosen_idx = idx_h
                                print(f"✅ FUZZY MATCH (COMBINED): {output_field} -> {cand} matches {_h} (col {chosen_idx})")
                                break
                        if chosen_idx is not None:
                            break
                if chosen_idx is None:
                    print(f"❌ NO MATCH: {output_field} not found for candidates {candidates}")
                extract_columns_index[output_field] = chosen_idx
            
            print(f"🎯 EXTRACT MAPPING: {extract_columns_index}")

            students = []
            missing_by_student = {}

            for r_index, row in enumerate(rows, start=base_row_offset):
                # Get identity (cast to string before strip to handle numeric cells)
                last_name = (
                    str(row[lastname_idx]).strip() if lastname_idx < len(row) and row[lastname_idx] is not None else ''
                )
                first_name = (
                    str(row[firstname_idx]).strip() if firstname_idx < len(row) and row[firstname_idx] is not None else ''
                )
                # Middle name is optional - handle case where column doesn't exist or is empty
                middle_name = ''
                try:
                    if middlename_idx is not None and middlename_idx < len(row) and row[middlename_idx] is not None:
                        middle_name = str(row[middlename_idx]).strip()
                except (IndexError, TypeError, AttributeError):
                    # Middle name column doesn't exist or is inaccessible - use empty string
                    middle_name = ''
                student_id = (
                    str(row[studentid_idx]).strip() if studentid_idx < len(row) and row[studentid_idx] is not None else ''
                )
                
                # Only require last_name, first_name, and student_id - middle_name is optional
                if not (last_name and first_name and student_id):
                    continue

                student_key = f"{student_id}_{last_name}_{first_name}"
                # Construct fullName with optional middle name
                if middle_name:
                    full_name = f"{last_name}, {first_name} {middle_name}".strip()
                else:
                    full_name = f"{last_name}, {first_name}".strip()
                
                student_data = {
                    'studentId': student_id,
                    'lastName': last_name,
                    'firstName': first_name,
                    'middleName': middle_name,
                    'fullName': full_name
                }

                # Extract requested fields from this sheet
                for out_field, col_idx in extract_columns_index.items():
                    value = ''
                    if col_idx is not None and col_idx < len(row):
                        cell = row[col_idx]
                        value = str(cell).strip() if cell is not None else ''
                    student_data[out_field] = value

                missing_cells = []
                for col_name, col_idx in grade_columns.items():
                    val = row[col_idx] if col_idx < len(row) else ''
                    s = str(val).strip() if val is not None else ''
                    if s == '':
                        missing_cells.append({
                            'column': col_name,
                            'displayHeader': header_display.get(norm2(col_name), col_name),
                            'rowIndex': r_index,
                            'sheetName': sheet_name
                        })

                if missing_cells:
                    missing_by_student[student_key] = missing_cells

                students.append(student_data)

            return {'students': students, 'missing_by_student': missing_by_student}

        # Determine actual sheet names (handle case and naming variations)
        resolved_midterm = 'Midterm'
        resolved_final = 'Final'
        try:
            info = sa_sheets_service.get_all_sheets_data(sheet_id)
            if info.get('success'):
                titles = [s.get('sheet_name', '') for s in info.get('sheets', [])]
                # Prefer exact matches ignoring case
                for t in titles:
                    if t and t.lower() == 'midterm':
                        resolved_midterm = t
                    if t and t.lower() == 'final':
                        resolved_final = t
                # If not exact, look for contains but avoid 'prefinal' for final
                if resolved_midterm == 'Midterm':
                    for t in titles:
                        if t and 'midterm' in t.lower():
                            resolved_midterm = t
                            break
                if resolved_final == 'Final':
                    for t in titles:
                        tl = t.lower()
                        if t and ('final' in tl) and ('prefinal' not in tl):
                            resolved_final = t
                            break
        except Exception:
            # Fallback to defaults if resolution fails
            pass

        # Analyze both sheets
        # Explicit mappings based on your sheet definitions (with common variants)
        # MIDTERM TAB: CS1=Class Standing, PE=Prelim, ME=Midterm, midtermGrade=Term Grade
        midterm_extract_map = {
            'CS1': [
                'Class Standing', 'CLASS STANDING', 'CLASSSTANDING', 'CS1', 'C S 1'
            ],
            'PE': [
                'Prelim', 'PRELIM', 'PRELIM EXAM', 'PRELIMEXAM', 'PRE-LIM', 'PRE LIM'
            ],
            'ME': [
                'Midterm', 'MIDTERM', 'MIDTERM EXAM', 'MIDTERMEXAM', 'MID TERM', 'MID-TERM'
            ],
            'midtermGrade': [
                'Term Grade', 'TERM GRADE', 'TERMGRADE', 'MIDTERM GRADE', 'TERM GRADE (MIDTERM)', 'MIDTERM TERM GRADE'
            ]
        }
        # FINAL TAB: CS2=Class Standing, PFE=Prefinal, FE=Finals, finalTermGrade=Term Grade
        final_extract_map = {
            'CS2': [
                'Class Standing', 'CLASS STANDING', 'CLASSSTANDING', 'CS2', 'C S 2'
            ],
            'PFE': [
                'Prefinal', 'PREFINAL', 'PRE-FINAL', 'PRE FINAL', 'PREFINAL EXAM', 'PREFINALEXAM', 'PRE-FINAL EXAM'
            ],
            'FE': [
                'Finals', 'FINALS', 'FINAL', 'FINAL EXAM', 'FINALSEXAM', 'FINALS EXAM'
            ],
            'finalTermGrade': [
                'Term Grade', 'TERM GRADE', 'TERMGRADE', 'FINAL TERM GRADE', 'TERM GRADE (FINAL)', 'FINALS GRADE'
            ]
        }

        midterm_result = analyze_sheet_for_grades(resolved_midterm, midterm_required, midterm_extract_map)
        final_result = analyze_sheet_for_grades(resolved_final, final_required, final_extract_map)

        if midterm_result.get('error') or final_result.get('error'):
            return Response({
                'error': f"Midterm: {midterm_result.get('error', 'OK')}, Final: {final_result.get('error', 'OK')}"
            }, status=400)

        # Combine results - only include students that exist in BOTH sheets
        # First, track which students exist in each sheet
        midterm_student_keys = set()
        final_student_keys = set()
        
        for student in midterm_result['students']:
            key = f"{student['studentId']}_{student['lastName']}_{student['firstName']}"
            midterm_student_keys.add(key)
        
        for student in final_result['students']:
            key = f"{student['studentId']}_{student['lastName']}_{student['firstName']}"
            final_student_keys.add(key)
        
        # Only include students that exist in BOTH sheets
        students_in_both = midterm_student_keys.intersection(final_student_keys)
        
        print(f"📊 Students in Midterm sheet: {len(midterm_student_keys)}")
        print(f"📊 Students in Final sheet: {len(final_student_keys)}")
        print(f"✅ Students in BOTH sheets (will be included): {len(students_in_both)}")
        
        # Build student lookup dictionaries for efficient merging
        midterm_students_dict = {}
        for student in midterm_result['students']:
            key = f"{student['studentId']}_{student['lastName']}_{student['firstName']}"
            midterm_students_dict[key] = student
        
        final_students_dict = {}
        for student in final_result['students']:
            key = f"{student['studentId']}_{student['lastName']}_{student['firstName']}"
            final_students_dict[key] = student
        
        # Merge data for students that exist in both sheets
        all_students = {}
        all_missing = {}
        
        for key in students_in_both:
            # Start with midterm student data
            student = midterm_students_dict[key].copy()
            
            # Merge final sheet extracted fields into student record
            if key in final_students_dict:
                final_student = final_students_dict[key]
                for field in ['CS2', 'PFE', 'FE', 'finalTermGrade', 'FGOverride']:
                    if field in final_student:
                        student[field] = final_student.get(field, '')
            
            all_students[key] = student
            # Combine missing data from both sheets
            midterm_missing = midterm_result['missing_by_student'].get(key, [])
            final_missing = final_result['missing_by_student'].get(key, [])
            all_missing[key] = midterm_missing + final_missing

        # Compute FG from midterm and final term grades when numeric
        def to_number(s: str):
            try:
                return float(s)
            except Exception:
                return None

        for s in all_students.values():
            mid = to_number(s.get('midtermGrade', ''))
            fin = to_number(s.get('finalTermGrade', ''))
            if mid is not None and fin is not None:
                computed_fg = (mid + fin) / 2
                print(f"🔍 FG EXPORT COMPUTATION: {s.get('lastName')}, {s.get('firstName')} - mid: {mid}, fin: {fin}, FG: {computed_fg}")
                s['FG'] = computed_fg
            else:
                s['FG'] = ''

        # Build response
        response_data = {
            'success': True,
            'students': list(all_students.values()),
            'missing_by_student': all_missing,
            'summary': {
                'total_students': len(all_students),
                'with_missing': len([k for k, v in all_missing.items() if v]),
                'complete': len([k for k, v in all_missing.items() if not v])
            },
            'usedCache': False,
            'checkedAt': timezone.now().isoformat(),
            'sheetVersion': {'modifiedTime': modified_time}
        }

        # Cache result if model supports these fields
        if has_cache_fields:
            class_record.grades_completeness = response_data
            class_record.completeness_checked_at = timezone.now()
            class_record.completeness_sheet_version = {'modifiedTime': modified_time}
            class_record.save(update_fields=['grades_completeness', 'completeness_checked_at', 'completeness_sheet_version'])

        return Response(response_data)

    except Exception as e:
        logger.error(f"Final grade preview error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_missing_scores(request, sheet_id):
    """Mark missing scores as N/A or INC"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        sheet_name = request.data.get('sheet_name')  # 'Midterm' or 'Final'
        student_id = request.data.get('student_id')
        column = request.data.get('column')
        value = request.data.get('value')  # 'N/A' or 'INC'

        if not all([sheet_name, student_id, column, value]):
            return Response({'error': 'sheet_name, student_id, column, and value are required'}, status=400)

        if value not in ['N/A', 'INC']:
            return Response({'error': 'value must be N/A or INC'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        
        # Find student row and update cell
        result = service.update_cell_by_student_and_column(sheet_id, sheet_name, student_id, column, value)
        
        return Response(result)

    except Exception as e:
        logger.error(f"Mark missing scores error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_missing_scores_batch(request, sheet_id):
    """Mark multiple missing scores as N/A or INC"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        updates = request.data.get('updates', [])
        if not updates:
            return Response({'error': 'updates array is required'}, status=400)

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        
        results = []
        for update in updates:
            sheet_name = update.get('sheet_name')
            student_id = update.get('student_id')
            column = update.get('column')
            value = update.get('value')
            
            if not all([sheet_name, student_id, column, value]):
                results.append({'error': 'Missing required fields', 'update': update})
                continue
                
            if value not in ['N/A', 'INC']:
                results.append({'error': 'Invalid value', 'update': update})
                continue

            result = service.update_cell_by_student_and_column(sheet_id, sheet_name, student_id, column, value)
            results.append(result)
        
        return Response({
            'success': True,
            'results': results,
            'total': len(updates),
            'successful': len([r for r in results if r.get('success', False)])
        })

    except Exception as e:
        logger.error(f"Mark missing scores batch error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def final_grade_export(request, sheet_id):
    """Export final grades to Excel using template"""
    try:
        access_token = (
            request.headers.get('X-Access-Token') or
            request.headers.get('x-access-token') or
            request.META.get('HTTP_X_ACCESS_TOKEN') or
            request.headers.get('X-Google-Access-Token') or
            request.META.get('HTTP_X_GOOGLE_ACCESS_TOKEN')
        )
        if not access_token:
            return Response({'error': 'Google access token required in X-Access-Token header'}, status=400)

        class_record_id = request.data.get('class_record_id')
        if not class_record_id:
            return Response({'error': 'class_record_id is required'}, status=400)

        # Get class record
        try:
            from classrecord.models import ClassRecord
            class_record = ClassRecord.objects.get(id=class_record_id, user=request.user)
        except ClassRecord.DoesNotExist:
            return Response({'error': 'Class record not found'}, status=404)

        # Get preview data using the same logic as the preview endpoint
        from utils.google_service_account_sheets import GoogleServiceAccountSheets
        sa_sheets_service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        
        # Call the preview logic directly (reuse the same function)
        preview_result = final_grade_preview_logic(sheet_id, class_record_id, sa_sheets_service)
        
        if not preview_result.get('success'):
            return Response({'error': 'Failed to get preview data'}, status=400)

        # Load template
        template_path = settings.BASE_DIR / 'templates' / 'FinalGradesTemplate.xlsx'
        if not template_path.exists():
            return Response({'error': 'Template file not found'}, status=404)

        workbook = openpyxl.load_workbook(template_path)
        worksheet = workbook['Final Grades']

        # 🔥 NEW: Populate dynamic header fields
        print("🔍 Populating dynamic header fields...")
        
        # Parse class record name to extract subject code and descriptive title
        class_record_name = class_record.name
        if ' - ' in class_record_name:
            subject_code, descriptive_title = class_record_name.split(' - ', 1)
        else:
            subject_code = class_record_name
            descriptive_title = ""
        
        print(f"🔍 Subject Code: {subject_code}")
        print(f"🔍 Descriptive Title: {descriptive_title}")
        print(f"🔍 Section: {class_record.section_name}")
        print(f"🔍 Instructor: {class_record.teacher_name}")
        print(f"🔍 Semester: {class_record.semester}")
        
        # Populate the specific cells with dynamic data and preserve Verdana font
        from openpyxl.styles import Font
        
        # Set Verdana font for all dynamic cells
        verdana_font = Font(name='Verdana')
        
        # Subject Code (D21)
        worksheet['D21'] = subject_code
        worksheet['D21'].font = verdana_font
        
        # Section (D22)
        worksheet['D22'] = class_record.section_name or ""
        worksheet['D22'].font = verdana_font
        
        # Descriptive Title (L21)
        worksheet['L21'] = descriptive_title
        worksheet['L21'].font = verdana_font
        
        # Instructor (L22)
        worksheet['L22'] = class_record.teacher_name or ""
        worksheet['L22'].font = verdana_font
        
        # Semester (F17-G17-H17-I17 merged - just populate F17 since it's merged)
        worksheet['F17'] = class_record.semester
        worksheet['F17'].font = verdana_font
        
        print("✅ Dynamic header fields populated successfully")

        # Ensure logo is present: place programmatically at desired anchor
        try:
            from openpyxl.drawing.image import Image as XLImage
            logo_path = settings.BASE_DIR / 'static' / 'cit-logo.png'
            print(f"🔍 Logo path: {logo_path}")
            print(f"🔍 Logo exists: {logo_path.exists()}")
            
            if logo_path.exists():
                print("✅ Logo file found, attempting to insert...")
                img = XLImage(str(logo_path))
                # Adjust size to desired dimensions
                img.width = 135
                img.height = 130
                print(f"🔍 Image size set: {img.width}x{img.height}")

                # Use simple cell positioning with pixel offsets
                # Position at G2 and apply small offsets
                worksheet.add_image(img, 'G2')
                print("✅ Logo added to worksheet at G2")

                # Apply pixel offsets after adding image
                try:
                    emu_per_px = 9525
                    if hasattr(img, 'anchor') and hasattr(img.anchor, '_from'):
                        img.anchor._from.colOff = int(-5 * emu_per_px)  # horizontal offset (move left 5px)
                        img.anchor._from.rowOff = int(0 * emu_per_px)  # vertical offset (no change)
                        print("✅ Pixel offsets applied")
                except Exception as e:
                    print(f"❌ Error applying offsets: {e}")
            else:
                print("❌ Logo file not found!")
        except Exception as e:
            print(f"❌ Logo insertion error: {e}")
            # If image insertion fails for any reason, continue with export without logo
            pass

        # Find the existing template table by looking for the header row
        # Look for "No." or "Last Name" in the template to find the data start row
        data_start_row = None
        for row in range(1, 50):  # Search first 50 rows
            for col in range(1, 20):  # Search first 20 columns
                cell_value = worksheet.cell(row=row, column=col).value
                if cell_value and str(cell_value).strip().lower() in ['no.', 'last name']:
                    data_start_row = row
                    break
            if data_start_row:
                break
        
        if not data_start_row:
            # Fallback: assume data starts at row 20 (common for templates)
            data_start_row = 20
        
        print(f"📊 Found template table starting at row: {data_start_row}")
        
        # Don't overwrite headers - just populate the data rows

        # Write student data to the existing template table
        students = preview_result.get('students', [])
        for idx, student in enumerate(students, 1):
            row = data_start_row + idx
            
            # Map data to template columns: No., Last Name, First Name, Middle Name, Student ID, CS1, PE, ME, MG, CS2, PFE, FE, FG
            # Find the correct column positions by checking the header row
            col_mapping = {}
            for col in range(1, 20):  # Check first 20 columns
                header_cell = worksheet.cell(row=data_start_row, column=col).value
                if header_cell:
                    header_text = str(header_cell).strip().lower()
                    if header_text == 'no.':
                        col_mapping['no'] = col
                    elif header_text == 'last name':
                        col_mapping['lastname'] = col
                    elif header_text == 'first name':
                        col_mapping['firstname'] = col
                    elif header_text == 'middle name':
                        col_mapping['middlename'] = col
                    elif header_text == 'student id':
                        col_mapping['studentid'] = col
                    elif header_text == 'cs1':
                        col_mapping['cs1'] = col
                    elif header_text == 'pe':
                        col_mapping['pe'] = col
                    elif header_text == 'me':
                        col_mapping['me'] = col
                    elif header_text == 'mg':
                        col_mapping['mg'] = col
                    elif header_text == 'cs2':
                        col_mapping['cs2'] = col
                    elif header_text == 'pfe':
                        col_mapping['pfe'] = col
                    elif header_text == 'fe':
                        col_mapping['fe'] = col
                    elif header_text == 'fg':
                        col_mapping['fg'] = col
            
            # Populate the cells based on the column mapping and apply borders
            thin_border = Side(border_style="thin", color="000000")
            full_border = Border(
                left=thin_border,
                right=thin_border,
                top=thin_border,
                bottom=thin_border
            )
            
            # Apply Verdana font to all student data cells
            verdana_font = Font(name='Verdana')
            
            if 'no' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['no'])
                cell.value = idx
                cell.border = full_border
                cell.font = verdana_font
            if 'lastname' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['lastname'])
                cell.value = student['lastName']
                cell.border = full_border
                cell.font = verdana_font
            if 'firstname' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['firstname'])
                cell.value = student['firstName']
                cell.border = full_border
                cell.font = verdana_font
            if 'middlename' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['middlename'])
                # Handle empty/missing middle name - use empty string instead of None
                cell.value = student.get('middleName', '') or ''
                cell.border = full_border
                cell.font = verdana_font
            if 'studentid' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['studentid'])
                cell.value = student['studentId']
                cell.border = full_border
                cell.font = verdana_font
            if 'cs1' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['cs1'])
                cell.value = student.get('CS1', '')
                cell.border = full_border
                cell.font = verdana_font
            if 'pe' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['pe'])
                cell.value = student.get('PE', '')
                cell.border = full_border
                cell.font = verdana_font
            if 'me' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['me'])
                cell.value = student.get('ME', '')
                cell.border = full_border
                cell.font = verdana_font
            if 'mg' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['mg'])
                cell.value = student.get('midtermGrade', '')
                cell.border = full_border
                cell.font = verdana_font
            if 'cs2' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['cs2'])
                cell.value = student.get('CS2', '')
                cell.border = full_border
                cell.font = verdana_font
            if 'pfe' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['pfe'])
                cell.value = student.get('PFE', '')
                cell.border = full_border
                cell.font = verdana_font
            if 'fe' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['fe'])
                cell.value = student.get('FE', '')
                cell.border = full_border
                cell.font = verdana_font
            if 'fg' in col_mapping:
                cell = worksheet.cell(row=row, column=col_mapping['fg'])
                fg_val = student.get('FG', '')
                cell.value = fg_val
                cell.border = full_border
                # Render INC/N/A in red and right-aligned, but keep Verdana font
                try:
                    from openpyxl.styles import Font, Alignment
                    if isinstance(fg_val, str) and fg_val.upper() in ['INC', 'N/A']:
                        cell.font = Font(name='Verdana', color='FF0000')
                        cell.alignment = Alignment(horizontal='right')
                    else:
                        cell.font = verdana_font
                except Exception:
                    cell.font = verdana_font
            
            print(f"📝 Populated row {row} for student: {student['lastName']}, {student['firstName']}")

        # Apply bottom borders to the last row to complete the table
        if students:
            last_row = data_start_row + len(students)
            print(f"🔲 Applying bottom borders to last row: {last_row}")
            
            # Get the column mapping from the first student (all students use the same mapping)
            col_mapping = {}
            for col in range(1, 20):  # Check first 20 columns
                header_cell = worksheet.cell(row=data_start_row, column=col).value
                if header_cell:
                    header_text = str(header_cell).strip().lower()
                    if header_text in ['no.', 'last name', 'first name', 'middle name', 'student id', 'cs1', 'pe', 'me', 'mg', 'cs2', 'pfe', 'fe', 'fg']:
                        col_mapping[header_text] = col
            
            # Apply bottom borders to all cells in the last row
            for col in range(1, 20):  # Check all columns that might have data
                cell = worksheet.cell(row=last_row, column=col)
                if cell.value is not None or col in col_mapping.values():  # Only apply to cells with data or in our mapping
                    # Get existing border and add bottom border
                    existing_border = cell.border
                    if existing_border:
                        # Preserve existing borders and add bottom
                        new_border = Border(
                            left=existing_border.left,
                            right=existing_border.right,
                            top=existing_border.top,
                            bottom=Side(border_style="thin", color="000000")  # Add bottom border
                        )
                    else:
                        # Create new border with bottom
                        new_border = Border(
                            left=Side(border_style="thin", color="000000"),
                            right=Side(border_style="thin", color="000000"),
                            top=Side(border_style="thin", color="000000"),
                            bottom=Side(border_style="thin", color="000000")
                        )
                    cell.border = new_border

        # Save to temporary file first to preserve images (openpyxl limitation with BytesIO)
        import tempfile
        import os
        import time
        import uuid
        
        # Create unique temporary file to avoid conflicts
        temp_filename = f"final_grades_{uuid.uuid4().hex}_{int(time.time())}.xlsx"
        temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
        
        try:
            # Save workbook to temporary file
            workbook.save(temp_path)
            
            # Read the file back to preserve images
            with open(temp_path, 'rb') as f:
                file_data = f.read()
            
        finally:
            # Clean up temporary file with error handling
            try:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
            except (OSError, PermissionError) as e:
                # Log the error but don't fail the request
                logger.warning(f"Could not delete temporary file {temp_path}: {e}")
                # Try to delete after a short delay
                import threading
                def delayed_delete():
                    time.sleep(1)
                    try:
                        if os.path.exists(temp_path):
                            os.unlink(temp_path)
                    except:
                        pass
                threading.Thread(target=delayed_delete, daemon=True).start()

        # Return file
        from django.http import HttpResponse
        response = HttpResponse(
            file_data,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        # Generate filename using the same format as Google Drive naming
        # Format: CourseCode (CourseName) Section - Semester
        print(f"🔍 [Filename] Class record name: {class_record.name}")
        print(f"🔍 [Filename] Section name: {class_record.section_name}")
        print(f"🔍 [Filename] Semester: {class_record.semester}")
        
        name_parts = class_record.name.split(' - ')
        course_code = name_parts[0] if name_parts else ''
        course_name = name_parts[1] if len(name_parts) > 1 else ''
        
        print(f"🔍 [Filename] Course code: {course_code}")
        print(f"🔍 [Filename] Course name: {course_name}")
        
        formatted_name = course_code
        if course_name:
            formatted_name += f" ({course_name})"
        if class_record.section_name:
            formatted_name += f" {class_record.section_name}"
        
        print(f"🔍 [Filename] Formatted name: {formatted_name}")
        
        filename = f"FinalGrades - {formatted_name} - {class_record.semester}.xlsx"
        print(f"🔍 Generated filename: {filename}")
        
        # URL encode the filename for proper browser handling
        import urllib.parse
        encoded_filename = urllib.parse.quote(filename)
        
        # Use both standard and RFC 5987 format for maximum browser compatibility
        content_disposition = f'attachment; filename="{filename}"; filename*=UTF-8\'\'{encoded_filename}'
        response['Content-Disposition'] = content_disposition
        print(f"🔍 [Backend] Content-Disposition header: {content_disposition}")
        print(f"🔍 [Backend] Response headers: {dict(response.items())}")
        return response

    except Exception as e:
        logger.error(f"Final grade export error: {str(e)}")
        return Response({'error': str(e)}, status=500)