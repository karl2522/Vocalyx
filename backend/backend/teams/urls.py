# In backend/backend/teams/urls.py
from django import views
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeamViewSet, TeamInvitationViewSet, check_course_access, check_class_access  # Add the import

router = DefaultRouter()
router.register(r'teams', TeamViewSet, basename='team')
router.register(r'invitations', TeamInvitationViewSet, basename='invitation')

urlpatterns = [
    path('', include(router.urls)),
    path('teams/search_users/', TeamViewSet.as_view({'get': 'search_users'}), name='team-search-users'),
    path('teams/my_team/', TeamViewSet.as_view({'get': 'my_team'}), name='my_team'),
    path('teams/my_teams/', TeamViewSet.as_view({'get': 'my_teams'}), name='my_teams'),
    path('teams/search_users/', TeamViewSet.as_view({'get': 'search_users'}), name='search_users'),
    path('teams/available_courses/', TeamViewSet.as_view({'get': 'available_courses'}), name='available_courses'),
    path('teams/join/', TeamViewSet.as_view({'post': 'join'}), name='join_team'),

    path('teams/check-course-access/<int:course_id>/', check_course_access, name='check-course-access'),
    path('teams/check-class-access/<int:class_id>/', check_class_access, name='check-class-access'),
]