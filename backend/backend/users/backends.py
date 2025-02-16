from django.contrib.auth import get_user_model
from django.db.models import Q

class EmailOrUsernameBackend:
    def authenticate(self, request, username=None, password=None, email=None):
        User = get_user_model()
        try:
            # Check if we're using email or username
            lookup_value = email or username
            user = User.objects.get(
                Q(username=lookup_value) | Q(email=lookup_value)
            )
            if user.check_password(password):
                return user
            return None
        except User.DoesNotExist:
            return None

    def get_user(self, user_id):
        User = get_user_model()
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None