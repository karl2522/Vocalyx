from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClassRecordViewSet, StudentViewSet, GradeCategoryViewSet, GradeViewSet

router = DefaultRouter()
router.register(r'class-records', ClassRecordViewSet, basename='classrecord')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'grade-categories', GradeCategoryViewSet, basename='gradecategory')
router.register(r'grades', GradeViewSet, basename='grade')

urlpatterns = [
    path('', include(router.urls)),
]