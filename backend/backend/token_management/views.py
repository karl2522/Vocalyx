from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import BlacklistedToken
from rest_framework_simplejwt.tokens import AccessToken
from django.utils import timezone
from datetime import datetime
import pytz


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            auth_header = request.headers.get('Authorization', '')

            if not auth_header:
                return Response({
                    "detail": "Authorization header is required"
                }, status=status.HTTP_401_UNAUTHORIZED)

            try:
                _, token = auth_header.split(' ')
            except ValueError:
                return Response({
                    "detail": "Invalid authorization header format"
                }, status=status.HTTP_401_UNAUTHORIZED)

            try:
                access_token = AccessToken(token)

                if BlacklistedToken.objects.filter(token=token).exists():
                    return Response({
                        "detail": "Token is already blacklisted"
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Convert the expiration timestamp to a timezone-aware datetime
                exp_timestamp = access_token['exp']
                exp_datetime = datetime.fromtimestamp(exp_timestamp)
                aware_exp_datetime = timezone.make_aware(
                    exp_datetime,
                    timezone=pytz.UTC
                )

                # Create the blacklisted token
                BlacklistedToken.objects.create(
                    token=token,
                    expires_at=aware_exp_datetime
                )

                return Response({
                    "detail": "Successfully logged out."
                }, status=status.HTTP_200_OK)

            except Exception as e:
                return Response({
                    "detail": f"Invalid token: {str(e)}"
                }, status=status.HTTP_401_UNAUTHORIZED)

        except Exception as e:
            return Response({
                "detail": f"Logout failed: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)