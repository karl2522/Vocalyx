from django.utils import timezone
from django.db import transaction, models
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from users.models import CustomUser
from classes.models import Course
from .models import Team, TeamMember, TeamCourse, TeamInvitation
from .serializers import (
    TeamSerializer, TeamMemberSerializer, TeamCourseSerializer,
    TeamInvitationSerializer, UserSerializer, CourseSerializer
)


class IsTeamMemberOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return TeamMember.objects.filter(
            team=obj,
            user=request.user,
            is_active=True
        ).exists()


class HasTeamPermission(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        try:
            member = TeamMember.objects.get(
                team=obj,
                user=request.user,
                is_active=True
            )

            if view.action in ['update', 'partial_update']:
                return member.permissions in ['edit', 'full'] or member.role in ['owner', 'admin']
            elif view.action in ['destroy']:
                return member.role in ['owner']
            elif view.action in ['add_member', 'remove_member', 'update_member_permissions']:
                return member.permissions == 'full' or member.role in ['owner', 'admin']
            elif view.action in ['add_course', 'remove_course']:
                return member.permissions in ['edit', 'full'] or member.role in ['owner', 'admin']

            return True
        except TeamMember.DoesNotExist:
            return False


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeamMemberOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        member_teams = Team.objects.filter(
            members__user=user,
            members__is_active=True
        )
        return member_teams

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        members_data = request.data.get('members', [])
        courses_data = request.data.get('courses', [])

        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data['owner'] = request.user.id

        serializer = self.get_serializer(
            data=data,
            context={
                'members': members_data,
                'courses': courses_data
            }
        )

        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'])
    def my_teams(self, request):
        teams = self.get_queryset()
        serializer = self.get_serializer(teams, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_team(self, request):
        try:
            teams = self.get_queryset()
            if teams.exists():
                team = teams.first()
                serializer = self.get_serializer(team)
                return Response(serializer.data)

            return Response({"detail": "No team found", "exists": False}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error in my_team: {str(e)}")
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        team = self.get_object()

        if not HasTeamPermission().has_object_permission(request, self, team):
            raise PermissionDenied("You don't have permission to add members")

        email = request.data.get('email')
        if not email:
            return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email=email)

            if TeamMember.objects.filter(team=team, user=user).exists():
                return Response({"detail": "User is already a member of this team"}, status=status.HTTP_400_BAD_REQUEST)

            member = TeamMember.objects.create(
                team=team,
                user=user,
                role='member',
                permissions=request.data.get('permissions', 'view')
            )
            serializer = TeamMemberSerializer(member)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except CustomUser.DoesNotExist:
            with transaction.atomic():
                member = TeamMember.objects.create(
                    team=team,
                    invitation_email=email,
                    role='invited',
                    permissions=request.data.get('permissions', 'view')
                )

                invitation = TeamInvitation.objects.create(
                    team=team,
                    email=email,
                    inviter=request.user
                )


            serializer = TeamMemberSerializer(member)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'])
    def remove_member(self, request, pk=None):
        team = self.get_object()

        if not HasTeamPermission().has_object_permission(request, self, team):
            raise PermissionDenied("You don't have permission to remove members")

        member_id = request.data.get('member_id')
        if not member_id:
            return Response({"detail": "Member ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = TeamMember.objects.get(id=member_id, team=team)

            if member.role == 'owner':
                return Response({"detail": "Cannot remove the team owner"}, status=status.HTTP_400_BAD_REQUEST)

            member.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        except TeamMember.DoesNotExist:
            return Response({"detail": "Member not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['patch'])
    def update_member_permissions(self, request, pk=None):
        team = self.get_object()

        if not HasTeamPermission().has_object_permission(request, self, team):
            raise PermissionDenied("You don't have permission to update member permissions")

        member_id = request.data.get('member_id')
        permissions = request.data.get('permissions')

        if not member_id or not permissions:
            return Response({"detail": "Member ID and permissions are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = TeamMember.objects.get(id=member_id, team=team)

            if member.role == 'owner' and request.user != member.user:
                return Response({"detail": "Cannot change the owner's permissions"}, status=status.HTTP_400_BAD_REQUEST)

            member.permissions = permissions
            member.save()

            serializer = TeamMemberSerializer(member)
            return Response(serializer.data)

        except TeamMember.DoesNotExist:
            return Response({"detail": "Member not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def add_course(self, request, pk=None):
        team = self.get_object()

        if not HasTeamPermission().has_object_permission(request, self, team):
            raise PermissionDenied("You don't have permission to add courses")

        course_id = request.data.get('course_id')
        if not course_id:
            return Response({"detail": "Course ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            course = Course.objects.get(id=course_id)

            if TeamCourse.objects.filter(team=team, course=course).exists():
                return Response({"detail": "Course is already in this team"}, status=status.HTTP_400_BAD_REQUEST)

            if course.user != request.user and not TeamCourse.objects.filter(
                    course=course,
                    team__members__user=request.user,
                    team__members__is_active=True
            ).exists():
                return Response({"detail": "You don't have permission to add this course"},
                                status=status.HTTP_403_FORBIDDEN)

            team_course = TeamCourse.objects.create(
                team=team,
                course=course,
                added_by=request.user
            )

            serializer = TeamCourseSerializer(team_course)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Course.DoesNotExist:
            return Response({"detail": "Course not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['delete'])
    def remove_course(self, request, pk=None):
        team = self.get_object()

        if not HasTeamPermission().has_object_permission(request, self, team):
            raise PermissionDenied("You don't have permission to remove courses")

        course_id = request.data.get('course_id')
        if not course_id:
            return Response({"detail": "Course ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            team_course = TeamCourse.objects.get(team=team, course_id=course_id)
            team_course.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        except TeamCourse.DoesNotExist:
            return Response({"detail": "Course not found in team"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def search_users(self, request):
        query = request.query_params.get('q', '')
        debug = request.query_params.get('debug', 'false').lower() == 'true'

        if not query or len(query) < 2:
            if debug:
                print("Search query too short or empty")
            return Response([])

        users = CustomUser.objects.filter(
            models.Q(email__icontains=query) |
            models.Q(first_name__icontains=query) |
            models.Q(last_name__icontains=query)
        )[:10]

        for user in users:
            print(f"Found user: {user.email}, Name: {user.first_name} {user.last_name}")

        serializer = UserSerializer(users, many=True)
        serialized_data = serializer.data

        if debug:
            print(f"Serialized data: {serialized_data}")

        return Response(serialized_data)

    @action(detail=False, methods=['get'])
    def available_courses(self, request):
        own_courses = Course.objects.filter(user=request.user)

        team_course_ids = TeamCourse.objects.filter(
            team__members__user=request.user,
            team__members__is_active=True
        ).values_list('course_id', flat=True)
        team_courses = Course.objects.filter(id__in=team_course_ids)

        all_courses = own_courses | team_courses

        serializer = CourseSerializer(all_courses, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def join(self, request):
        code = request.data.get('code')
        if not code:
            return Response({"detail": "Team code is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            team = Team.objects.get(code=code)

            if TeamMember.objects.filter(team=team, user=request.user).exists():
                member = TeamMember.objects.get(team=team, user=request.user)
                if member.is_active:
                    return Response({"detail": "You are already a member of this team"},
                                    status=status.HTTP_400_BAD_REQUEST)
                else:
                    member.is_active = True
                    member.save()
            else:
                TeamMember.objects.create(
                    team=team,
                    user=request.user,
                    role='member',
                    permissions='view'
                )

            invitations = TeamInvitation.objects.filter(
                team=team,
                email=request.user.email,
                accepted=False
            )
            for invitation in invitations:
                invitation.accepted = True
                invitation.accepted_at = timezone.now()
                invitation.save()

            serializer = self.get_serializer(team)
            return Response(serializer.data)

        except Team.DoesNotExist:
            return Response({"detail": "Invalid team code"}, status=status.HTTP_404_NOT_FOUND)


class TeamInvitationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TeamInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return TeamInvitation.objects.filter(email=user.email)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        invitation = self.get_object()

        if invitation.email != request.user.email:
            return Response({"detail": "This invitation is not for you"}, status=status.HTTP_403_FORBIDDEN)

        if invitation.accepted:
            return Response({"detail": "Invitation already accepted"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            invitation.accepted = True
            invitation.accepted_at = timezone.now()
            invitation.save()

            if not TeamMember.objects.filter(team=invitation.team, user=request.user).exists():
                TeamMember.objects.create(
                    team=invitation.team,
                    user=request.user,
                    role='member',
                    permissions='view'
                )

        serializer = TeamSerializer(invitation.team)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_course_access(request, course_id):
    try:
        course = Course.objects.get(id=course_id)

        # Direct access - user is the owner
        if course.user == request.user:
            return Response({
                'hasAccess': True,
                'accessLevel': 'full',
                'accessType': 'owner'
            })

        # Check for team-based access
        team_course = TeamCourse.objects.filter(
            course_id=course_id,
            team__members__user=request.user,
            team__members__is_active=True
        ).first()

        if team_course:
            # Get the user's permission level in this team
            team_member = TeamMember.objects.get(
                team=team_course.team,
                user=request.user,
                is_active=True
            )

            return Response({
                'hasAccess': True,
                'accessLevel': team_member.permissions,
                'accessType': 'team_member',
                'teamId': team_course.team.id,
                'teamName': team_course.team.name
            })

        # No access found
        return Response({'hasAccess': False}, status=403)

    except Course.DoesNotExist:
        return Response({'hasAccess': False, 'message': 'Course not found'}, status=404)
    except Exception as e:
        return Response({'hasAccess': False, 'message': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_class_access(request, class_id):
    try:
        from classes.models import Class

        class_obj = Class.objects.get(id=class_id)

        if class_obj.user == request.user or (class_obj.course and class_obj.course.user == request.user):
            return Response({
                'hasAccess': True,
                'accessLevel': 'full',
                'accessType': 'owner'
            })

        if class_obj.course:
            course = class_obj.course

            team_course = TeamCourse.objects.filter(
                course_id=course.id,
                team__members__user=request.user,
                team__members__is_active=True
            ).first()

            if team_course:
                team_member = TeamMember.objects.get(
                    team=team_course.team,
                    user=request.user,
                    is_active=True
                )

                return Response({
                    'hasAccess': True,
                    'accessLevel': team_member.permissions,
                    'accessType': 'team_member',
                    'teamId': team_course.team.id,
                    'teamName': team_course.team.name,
                    'courseId': course.id,
                    'courseName': course.name
                })

        return Response({'hasAccess': False, 'message': 'You do not have access to this class'}, status=403)

    except Class.DoesNotExist:
        return Response({'hasAccess': False, 'message': 'Class not found'}, status=404)
    except Exception as e:
        return Response({'hasAccess': False, 'message': str(e)}, status=500)