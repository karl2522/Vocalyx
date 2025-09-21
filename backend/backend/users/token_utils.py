"""
Token encryption/decryption utilities for Google Drive tokens.
"""
import base64
import json
from cryptography.fernet import Fernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
import logging

logger = logging.getLogger(__name__)

class TokenEncryption:
    """Handle encryption and decryption of Google tokens."""
    
    def __init__(self):
        self.key = self._get_encryption_key()
        self.cipher_suite = Fernet(self.key)
    
    def _get_encryption_key(self):
        """Get or generate encryption key."""
        key = getattr(settings, 'GOOGLE_TOKEN_ENCRYPTION_KEY', None)
        
        if not key:
            # Generate a new key for development (should be set in production)
            key = Fernet.generate_key()
            logger.warning(
                "GOOGLE_TOKEN_ENCRYPTION_KEY not set in settings. "
                "Generated temporary key. Set this in production!"
            )
        
        if isinstance(key, str):
            key = key.encode()
        
        return key
    
    def encrypt_token(self, token):
        """Encrypt a token string."""
        if not token:
            return None
        
        try:
            # Convert string to bytes if needed
            if isinstance(token, str):
                token = token.encode()
            
            encrypted_token = self.cipher_suite.encrypt(token)
            return base64.b64encode(encrypted_token).decode()
        except Exception as e:
            logger.error(f"Failed to encrypt token: {str(e)}")
            raise
    
    def decrypt_token(self, encrypted_token):
        """Decrypt an encrypted token."""
        if not encrypted_token:
            return None
        
        try:
            # Decode base64 and decrypt
            encrypted_bytes = base64.b64decode(encrypted_token.encode())
            decrypted_token = self.cipher_suite.decrypt(encrypted_bytes)
            return decrypted_token.decode()
        except Exception as e:
            logger.error(f"Failed to decrypt token: {str(e)}")
            raise
    
    def encrypt_tokens(self, access_token, refresh_token):
        """Encrypt both access and refresh tokens."""
        return {
            'access_token': self.encrypt_token(access_token),
            'refresh_token': self.encrypt_token(refresh_token)
        }
    
    def decrypt_tokens(self, encrypted_access_token, encrypted_refresh_token):
        """Decrypt both access and refresh tokens."""
        return {
            'access_token': self.decrypt_token(encrypted_access_token),
            'refresh_token': self.decrypt_token(encrypted_refresh_token)
        }


# Global instance
token_encryption = TokenEncryption()
