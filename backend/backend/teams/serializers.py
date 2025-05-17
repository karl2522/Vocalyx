from rest_framework import serializers
from classes.models import Course
from users.models import CustomUser
from .models import Team, TeamMember, TeamCourse, TeamInvitation

class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'name']

    def get_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.email.split('@')[0]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'first_name', 'last_name', 'profile_picture']


class CourseSerializer(serializers.ModelSerializer):
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'name', 'courseCode', 'description', 'semester',
                  'academic_year', 'status', 'is_owner']

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.user == request.user
        return False


class TeamMemberSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = TeamMember
        fields = ['id', 'user', 'team', 'role', 'permissions',
                  'is_active', 'joined_at', 'user_details', 'name',
                  'invitation_email']
        extra_kwargs = {
            'user': {'write_only': True},
            'team': {'write_only': True},
        }

    def get_name(self, obj):
        if obj.user:
            return obj.user.full_name
        elif obj.invitation_email:
            email_prefix = obj.invitation_email.split('@')[0]
            return email_prefix.replace('.', ' ').title()
        return ''


class TeamCourseSerializer(serializers.ModelSerializer):
    course_details = CourseSerializer(source='course', read_only=True)

    class Meta:
        model = TeamCourse
        fields = ['id', 'team', 'course', 'added_by', 'added_at', 'course_details']
        extra_kwargs = {
            'team': {'write_only': True},
            'course': {'write_only': True},
            'added_by': {'write_only': True},
        }


class TeamSerializer(serializers.ModelSerializer):
    members = TeamMemberSerializer(many=True, read_only=True)
    team_courses = TeamCourseSerializer(source='courses', many=True, read_only=True)
    owner_details = UserSerializer(source='owner', read_only=True)

    class Meta:
        model = Team
        fields = ['id', 'name', 'code', 'description', 'owner',
                  'created_at', 'updated_at', 'members', 'team_courses',
                  'owner_details']
        extra_kwargs = {
            'code': {'read_only': True},
            'owner': {'write_only': True},
        }

    def create(self, validated_data):
        members_data = self.context.get('members', [])
        courses_data = self.context.get('courses', [])

        team = Team.objects.create(**validated_data)

        TeamMember.objects.create(
            team=team,
            user=validated_data['owner'],
            role='owner',
            permissions='full'
        )

        for email in members_data:
            try:
                user = CustomUser.objects.get(email=email)
                TeamMember.objects.create(
                    team=team,
                    user=user,
                    role='member',
                    permissions='view'
                )
            except CustomUser.DoesNotExist:
                TeamMember.objects.create(
                    team=team,
                    invitation_email=email,
                    role='invited',
                    permissions='view'
                )
                TeamInvitation.objects.create(
                    team=team,
                    email=email,
                    inviter=validated_data['owner']
                )

        for course_id in courses_data:
            try:
                course = Course.objects.get(id=course_id)
                TeamCourse.objects.create(
                    team=team,
                    course=course,
                    added_by=validated_data['owner']
                )
            except Course.DoesNotExist:
                pass

        return team


class TeamInvitationSerializer(serializers.ModelSerializer):
    inviter_name = serializers.SerializerMethodField()
    team_name = serializers.SerializerMethodField()

    class Meta:
        model = TeamInvitation
        fields = ['id', 'team', 'email', 'inviter', 'created_at',
                  'accepted', 'accepted_at', 'inviter_name', 'team_name']
        extra_kwargs = {
            'token': {'write_only': True},
            'team': {'write_only': True},
            'inviter': {'write_only': True},
        }

    def get_inviter_name(self, obj):
        return obj.inviter.full_name if obj.inviter else ''

    def get_team_name(self, obj):
        return obj.team.name if obj.team else ''