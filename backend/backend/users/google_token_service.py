"""
Google token refresh service for managing Google Drive access tokens.
"""
import requests
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from .token_utils import token_encryption

logger = logging.getLogger(__name__)

class GoogleTokenService:
    """Service for managing Google OAuth tokens."""
    
    TOKEN_REFRESH_URL = "https://oauth2.googleapis.com/token"
    
    def __init__(self):
        self.client_id = settings.GOOGLE_OAUTH2_CLIENT_ID
        self.client_secret = getattr(settings, 'GOOGLE_OAUTH2_CLIENT_SECRET', None)
    
    def refresh_access_token(self, refresh_token):
        """
        Refresh an expired Google access token using refresh token.
        
        Args:
            refresh_token: The refresh token
            
        Returns:
            Dict containing new tokens and expiry info
        """
        try:
            # Decrypt refresh token if it's encrypted
            if refresh_token:
                try:
                    refresh_token = token_encryption.decrypt_token(refresh_token)
                except:
                    # If decryption fails, assume it's already decrypted
                    pass
            
            if not self.client_secret:
                raise ValueError("Google OAuth2 client secret not configured")
            
            payload = {
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'refresh_token': refresh_token,
                'grant_type': 'refresh_token'
            }
            
            response = requests.post(self.TOKEN_REFRESH_URL, data=payload, timeout=30)
            
            if response.status_code == 200:
                token_data = response.json()
                
                # Calculate expiry time
                expires_in = token_data.get('expires_in', 3600)  # Default 1 hour
                expires_at = timezone.now() + timedelta(seconds=expires_in)
                
                return {
                    'access_token': token_data.get('access_token'),
                    'refresh_token': token_data.get('refresh_token', refresh_token),  # Keep old if not provided
                    'expires_in': expires_in,
                    'expires_at': expires_at,
                    'token_type': token_data.get('token_type', 'Bearer')
                }
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                error_message = error_data.get('error_description', f'HTTP {response.status_code}')
                logger.error(f"Token refresh failed: {error_message}")
                raise Exception(f"Token refresh failed: {error_message}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error during token refresh: {str(e)}")
            raise Exception(f"Network error during token refresh: {str(e)}")
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            raise
    
    def validate_access_token(self, access_token):
        """
        Validate if an access token is still valid.
        
        Args:
            access_token: The access token to validate
            
        Returns:
            Bool indicating if token is valid
        """
        try:
            # Decrypt token if needed
            if access_token:
                try:
                    access_token = token_encryption.decrypt_token(access_token)
                except:
                    # If decryption fails, assume it's already decrypted
                    pass
            
            # Use Google's tokeninfo endpoint to validate
            response = requests.get(
                "https://www.googleapis.com/oauth2/v1/tokeninfo",
                params={'access_token': access_token},
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            return False
    
    def get_valid_access_token(self, user):
        """
        Get a valid access token for a user, refreshing if necessary.
        
        Args:
            user: CustomUser instance
            
        Returns:
            Valid access token string or None
        """
        try:
            # Check if user has tokens
            if not user.google_access_token or not user.google_refresh_token:
                return None
            
            # Check if current token is still valid
            if user.google_token_expires_at and user.google_token_expires_at > timezone.now():
                # Token is still valid, decrypt and return
                return token_encryption.decrypt_token(user.google_access_token)
            
            # Token expired, try to refresh
            logger.info(f"Refreshing expired token for user: {user.email}")
            
            new_tokens = self.refresh_access_token(user.google_refresh_token)
            
            # Encrypt and save new tokens
            encrypted_tokens = token_encryption.encrypt_tokens(
                new_tokens['access_token'],
                new_tokens['refresh_token']
            )
            
            user.google_access_token = encrypted_tokens['access_token']
            user.google_refresh_token = encrypted_tokens['refresh_token']
            user.google_token_expires_at = new_tokens['expires_at']
            user.save()
            
            logger.info(f"Successfully refreshed tokens for user: {user.email}")
            return new_tokens['access_token']
            
        except Exception as e:
            logger.error(f"Failed to get valid access token for user {user.email}: {str(e)}")
            return None


# Global instance
google_token_service = GoogleTokenService()
