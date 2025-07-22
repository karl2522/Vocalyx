from rest_framework import serializers
from .models import ClassRecord, Student, GradeCategory, Grade


class ClassRecordSerializer(serializers.ModelSerializer):
    student_count = serializers.ReadOnlyField()

    class Meta:
        model = ClassRecord
        fields = [
            'id',
            'name',
            'semester',
            'teacher_name',
            'description',
            'student_count',
            'created_at',
            'updated_at',
            'spreadsheet_data',
            'custom_columns',
            'last_modified',
            'google_sheet_id',
            'google_sheet_url'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_modified', 'student_count']

    def create(self, validated_data):
        # Ensure Google Sheets fields have default values if not provided
        validated_data.setdefault('google_sheet_id', None)
        validated_data.setdefault('google_sheet_url', None)
        
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class StudentSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = Student
        fields = ['id', 'student_number', 'last_name', 'first_name', 'middle_name', 'full_name', 'created_at']
        read_only_fields = ['created_at']


class GradeCategorySerializer(serializers.ModelSerializer):
    category_type_display = serializers.CharField(source='get_category_type_display', read_only=True)

    class Meta:
        model = GradeCategory
        fields = ['id', 'name', 'category_type', 'category_type_display', 'weight', 'created_at']
        read_only_fields = ['created_at']


class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    category_name = serializers.CharField(source='grade_category.name', read_only=True)
    percentage = serializers.ReadOnlyField()

    class Meta:
        model = Grade
        fields = ['id', 'student', 'student_name', 'grade_category', 'category_name', 'score', 'max_score',
                  'percentage', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ClassRecordDetailSerializer(serializers.ModelSerializer):
    student_count = serializers.ReadOnlyField()
    students = StudentSerializer(many=True, read_only=True)
    grade_categories = GradeCategorySerializer(many=True, read_only=True)

    class Meta:
        model = ClassRecord
        fields = [
            'id',
            'name',
            'semester',
            'teacher_name',
            'description',
            'students',
            'grade_categories',
            'student_count',
            'spreadsheet_data',
            'custom_columns',
            'created_at',
            'updated_at',
            'last_modified',
            'google_sheet_id',
            'google_sheet_url'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_modified', 'student_count', 'google_sheet_url']