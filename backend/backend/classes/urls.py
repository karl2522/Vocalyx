from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClassViewSet, CourseViewSet

router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'classes', ClassViewSet, basename='class')

urlpatterns = [
    path('', include(router.urls)),
]