from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import BlacklistedToken


class CustomJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        try:
            # Get the raw token
            header = self.get_header(request)
            if header is None:
                return None

            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None

            # Check if token is blacklisted
            if BlacklistedToken.objects.filter(token=raw_token.decode()).exists():
                return None

            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return user, validated_token
        except Exception as e:
            return None