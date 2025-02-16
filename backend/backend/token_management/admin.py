from django.contrib import admin
from .models import BlacklistedToken

@admin.register(BlacklistedToken)
class BlacklistedTokenAdmin(admin.ModelAdmin):
    list_display = ('token', 'blacklisted_at', 'expires_at')
    search_fields = ('token',)
    list_filter = ('blacklisted_at', 'expires_at')