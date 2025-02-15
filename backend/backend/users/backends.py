# users/backends.py
from django.contrib.auth import get_user_model
from django.db.models import Q


class EmailOrUsernameBackend:
    def authenticate(self, request, username=None, password=None):
        User = get_user_model()
        try:
            user = User.objects.get(
                Q(username=username) | Q(email=username)
            )
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            return None

    def get_user(self, user_id):
        User = get_user_model()
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None