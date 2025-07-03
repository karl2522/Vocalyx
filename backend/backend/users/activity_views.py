# user/activity_views.py
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import UserActivity
from .serializers import UserActivitySerializer


class UserActivityListView(generics.ListAPIView):
    """Get user's activities with pagination"""
    serializer_class = UserActivitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        days = int(self.request.query_params.get('days', 30))  # Default last 30 days
        limit = int(self.request.query_params.get('limit', 50))  # Default 50 activities

        since_date = timezone.now() - timedelta(days=days)

        return UserActivity.objects.filter(
            user=user,
            created_at__gte=since_date
        ).select_related('user')[:limit]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_activity(request):
    """Create a new user activity"""
    try:
        # 🔥 FIXED: Properly handle the request data
        data = request.data.copy()

        # Don't include user in the data, we'll set it directly
        if 'user' in data:
            del data['user']

        # Add IP address and user agent
        data['ip_address'] = get_client_ip(request)
        data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')

        # 🔥 FIXED: Create the serializer and set the user
        serializer = UserActivitySerializer(data=data)
        if serializer.is_valid():
            # Set the user when saving
            activity = serializer.save(user=request.user)

            # Return the created activity
            return_serializer = UserActivitySerializer(activity)
            return Response(return_serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        # 🔥 ENHANCED: Better error logging
        import traceback
        print(f"❌ Activity creation error: {str(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        print(f"❌ Request data: {request.data}")

        return Response(
            {'error': f'Failed to create activity: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_activity_stats(request):
    """Get activity statistics for dashboard"""
    try:
        user = request.user
        days = int(request.query_params.get('days', 7))  # Default last 7 days

        since_date = timezone.now() - timedelta(days=days)

        activities = UserActivity.objects.filter(
            user=user,
            created_at__gte=since_date
        )

        # Count activities by type
        activity_counts = {}
        for activity in activities:
            activity_type = activity.activity_type
            activity_counts[activity_type] = activity_counts.get(activity_type, 0) + 1

        # Get today's activities
        today = timezone.now().date()
        today_activities = activities.filter(created_at__date=today).count()

        return Response({
            'total_activities': activities.count(),
            'today_activities': today_activities,
            'activity_breakdown': activity_counts,
            'period_days': days
        })

    except Exception as e:
        print(f"❌ Activity stats error: {str(e)}")
        return Response(
            {'error': f'Failed to get activity stats: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip