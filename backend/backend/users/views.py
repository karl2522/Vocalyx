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
from .google_drive_service import GoogleDriveService
from firebase_admin import auth
from .google_sheets_service import GoogleSheetsService
from django.core.cache import cache
import hashlib


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
        # Accept both parameter names for backward compatibility
        id_token = request.data.get('id_token') or request.data.get('firebase_token')
        access_token = request.data.get('access_token')
        
        if not id_token:
            return Response({'error': 'No ID token provided'}, status=400)

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
            logger.info(f"Updated existing user via Firebase: {user.email}")
            
        except CustomUser.DoesNotExist:
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

        # Store Google access token in session/cache for Drive API access
        if access_token and is_google:
            # Store the access token in the response so frontend can store it
            logger.info(f"Google access token received for user: {user.email}")

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


# Google Drive API endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def drive_test_connection(request):
    """Test Google Drive API connection with user's access token"""
    try:
        access_token = request.data.get('access_token')
        if not access_token:
            return Response({'error': 'Google access token required'}, status=400)
        
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
        access_token = request.headers.get('X-Google-Access-Token')
        if not access_token:
            return Response({'error': 'Google access token required in X-Google-Access-Token header'}, status=400)
        
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
        access_token = request.headers.get('X-Google-Access-Token')
        if not access_token:
            return Response({'error': 'Google access token required in X-Google-Access-Token header'}, status=400)
        
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
        access_token = request.headers.get('X-Google-Access-Token')
        if not access_token:
            return Response({'error': 'Google access token required in X-Google-Access-Token header'}, status=400)
        
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
        access_token = request.headers.get('X-Google-Access-Token')
        if not access_token:
            return Response({'error': 'Google access token required in X-Google-Access-Token header'}, status=400)
        
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
        access_token = request.headers.get('X-Google-Access-Token')
        if not access_token:
            return Response({'error': 'Google access token required in X-Google-Access-Token header'}, status=400)
        
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
        access_token = request.headers.get('X-Google-Access-Token')
        if not access_token:
            return Response({'error': 'Google access token required in X-Google-Access-Token header'}, status=400)
        
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
        access_token = request.headers.get('X-Google-Access-Token')
        if not access_token:
            return Response({'error': 'Google access token required in X-Google-Access-Token header'}, status=400)
        
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
        access_token = request.headers.get('X-Google-Access-Token')
        if not access_token:
            return Response({'error': 'Google access token required in X-Google-Access-Token header'}, status=400)
        
        make_public = request.data.get('make_public_readable', False)
        make_editable = request.data.get('make_editable', False)
        
        sheets_service = GoogleSheetsService(access_token)
        result = sheets_service.update_sheet_permissions(sheet_id, make_public, make_editable)
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Update sheet permissions error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sheets_get_data(request, sheet_id):
    """Get data from a Google Sheet"""
    try:
        access_token = request.headers.get('X-Google-Access-Token')
        if not access_token:
            return Response({'error': 'Google access token required in X-Google-Access-Token header'}, status=400)

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

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.get_specific_sheet_data(sheet_id, sheet_name)

        return Response(result)

    except Exception as e:
        logger.error(f"Get specific sheet data error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sheets_list_all_sheets_service_account(request, sheet_id):
    """List all sheets in a Google Spreadsheet using service account"""
    try:
        from utils.google_service_account_sheets import GoogleServiceAccountSheets

        service = GoogleServiceAccountSheets(settings.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
        result = service.get_sheets_list(sheet_id)

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