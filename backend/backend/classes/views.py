from rest_framework import viewsets, status, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from teams.models import TeamCourse
from .models import Class, Course
from .serializers import ClassSerializer, CourseSerializer


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from teams.models import TeamCourse, TeamMember
        from django.db.models import Q

        # Create a basic queryset
        queryset = Course.objects.all()

        # Add annotations to track access level
        results = []

        # Add user's own courses with full access
        own_courses = list(queryset.filter(user=self.request.user))
        for course in own_courses:
            course.accessLevel = 'full'
            results.append(course)

        # Get team memberships and their courses
        team_memberships = TeamMember.objects.filter(
            user=self.request.user,
            is_active=True
        )

        for membership in team_memberships:
            team_course_ids = TeamCourse.objects.filter(
                team=membership.team
            ).values_list('course_id', flat=True)

            # Get team courses excluding own courses
            team_courses = list(queryset.filter(
                id__in=team_course_ids
            ).exclude(user=self.request.user))

            # Apply the correct permissions
            for course in team_courses:
                course.accessLevel = membership.permissions

                # Only add if not already in results
                if not any(r.id == course.id for r in results):
                    results.append(course)

        return results

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        course_id = kwargs.get('pk')

        try:
            course = Course.objects.get(id=course_id, user=request.user)
            course.accessLevel = 'full'
            serializer = self.get_serializer(course)
            return Response(serializer.data)
        except Course.DoesNotExist:
            try:
                team_course = TeamCourse.objects.filter(
                    course_id=course_id,
                    team__members__user=request.user,
                    team__members__is_active=True
                ).select_related('team').first()

                if team_course:
                    from teams.models import TeamMember
                    member = TeamMember.objects.get(
                        team=team_course.team,
                        user=request.user,
                        is_active=True
                    )

                    course = Course.objects.get(id=course_id)
                    course.accessLevel = member.permissions
                    serializer = self.get_serializer(course)
                    return Response(serializer.data)
                else:
                    return Response({"detail": "You do not have permission to view this course."},
                                    status=status.HTTP_403_FORBIDDEN)
            except Course.DoesNotExist:
                return Response({"detail": "Course not found."},
                                status=status.HTTP_404_NOT_FOUND)


class ClassViewSet(viewsets.ModelViewSet):
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        course_id = self.request.query_params.get('course_id', None)

        own_classes = Class.objects.filter(user=self.request.user)

        if course_id:
            if Course.objects.filter(id=course_id, user=self.request.user).exists():
                return own_classes.filter(course_id=course_id)
            else:
                team_access = TeamCourse.objects.filter(
                    course_id=course_id,
                    team__members__user=self.request.user,
                    team__members__is_active=True
                ).exists()

                if team_access:
                    return Class.objects.filter(course_id=course_id)

        team_course_ids = TeamCourse.objects.filter(
            team__members__user=self.request.user,
            team__members__is_active=True
        ).values_list('course_id', flat=True)

        team_classes = Class.objects.filter(course_id__in=team_course_ids)

        return own_classes | team_classes

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)