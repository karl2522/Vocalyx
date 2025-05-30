from django.contrib import admin
from .models import Team, TeamMember, TeamCourse, TeamInvitation

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'owner', 'created_at')
    search_fields = ('name', 'code', 'owner__email')
    list_filter = ('created_at',)
    readonly_fields = ('code',)

@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'role', 'permissions', 'is_active')
    search_fields = ('user__email', 'team__name')
    list_filter = ('role', 'permissions', 'is_active')

@admin.register(TeamCourse)
class TeamCourseAdmin(admin.ModelAdmin):
    list_display = ('team', 'course', 'added_by', 'added_at')
    search_fields = ('team__name', 'course__name', 'added_by__email')
    list_filter = ('added_at',)

@admin.register(TeamInvitation)
class TeamInvitationAdmin(admin.ModelAdmin):
    list_display = ('email', 'team', 'inviter', 'created_at', 'accepted')
    search_fields = ('email', 'team__name', 'inviter__email')
    list_filter = ('accepted', 'created_at')
    readonly_fields = ('token',)