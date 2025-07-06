from django.db import models
from django.utils import timezone
from django.conf import settings
import json


class ClassRecord(models.Model):
    SEMESTER_CHOICES = [
        ('1st Semester', '1st Semester'),
        ('2nd Semester', '2nd Semester'),
        ('Summer', 'Summer'),
    ]

    name = models.CharField(max_length=200)
    semester = models.CharField(max_length=20, choices=SEMESTER_CHOICES)
    teacher_name = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)  # Added description field
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Google Sheets Integration
    google_sheet_id = models.CharField(max_length=255, blank=True, null=True)
    google_sheet_url = models.URLField(blank=True, null=True)

    # EXISTING FIELDS for spreadsheet functionality
    spreadsheet_data = models.JSONField(default=list, blank=True)
    custom_columns = models.JSONField(default=dict, blank=True)
    last_modified = models.DateTimeField(auto_now=True)

    # NEW FIELDS for Excel import functionality
    imported_excel_data = models.JSONField(default=list, blank=True)
    imported_excel_headers = models.JSONField(default=list, blank=True)
    imported_file_name = models.CharField(max_length=255, blank=True)
    is_excel_imported = models.BooleanField(default=False)
    excel_last_modified = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.semester}"

    @property
    def student_count(self):
        # Count non-empty rows in spreadsheet_data or imported_excel_data
        if self.is_excel_imported and self.imported_excel_data:
            return len([row for row in self.imported_excel_data if
                        any(str(row.get(key, '')).strip() for key in row.keys())])
        elif self.spreadsheet_data:
            return len([row for row in self.spreadsheet_data if
                        any(row.get(key) for key in row.keys() if key not in ['No', 'Total', 'Grade'])])
        return 0

    def get_default_columns(self):
        """Returns the default column structure"""
        return {
            'student_info': ['No', 'Last Name', 'First Name', 'Student ID'],
            'quizzes': ['Quiz 1', 'Quiz 2', 'Quiz 3', 'Quiz 4', 'Quiz 5'],
            'labs': ['Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5'],
            'exams': ['Midterm', 'Final Exam'],
            'calculations': ['Total', 'Grade']
        }

    # 🔥 FIXED: Separate methods for template vs import mode
    def get_all_headers(self):
        """Returns template headers ONLY (for template mode)"""
        columns = self.custom_columns if self.custom_columns else self.get_default_columns()
        headers = []
        headers.extend(columns.get('student_info', []))
        headers.extend(columns.get('quizzes', []))
        headers.extend(columns.get('labs', []))
        headers.extend(columns.get('exams', []))
        headers.extend(columns.get('calculations', []))
        return headers

    def get_excel_headers(self):
        """Returns Excel import headers ONLY (for import mode)"""
        return self.imported_excel_headers if self.is_excel_imported else []

    def get_current_data(self):
        """Returns the current data (either imported Excel or spreadsheet data)"""
        if self.is_excel_imported:
            return self.imported_excel_data
        return self.spreadsheet_data

    def get_template_data(self):
        """Returns template data ONLY (for template mode)"""
        return self.spreadsheet_data


class Student(models.Model):
    class_record = models.ForeignKey(ClassRecord, on_delete=models.CASCADE, related_name='students')
    student_number = models.CharField(max_length=20)
    last_name = models.CharField(max_length=100)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['last_name', 'first_name']
        unique_together = ['class_record', 'student_number']

    def __str__(self):
        return f"{self.last_name}, {self.first_name}"

    @property
    def full_name(self):
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"


class GradeCategory(models.Model):
    CATEGORY_CHOICES = [
        ('quiz', 'Quiz'),
        ('laboratory', 'Laboratory Activities'),
        ('exam', 'Exam'),
        ('assignment', 'Assignment'),
        ('project', 'Project'),
    ]

    class_record = models.ForeignKey(ClassRecord, on_delete=models.CASCADE, related_name='grade_categories')
    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)  # Percentage weight
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['category_type', 'name']
        unique_together = ['class_record', 'name', 'category_type']

    def __str__(self):
        return f"{self.name} ({self.get_category_type_display()})"


class Grade(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='grades')
    grade_category = models.ForeignKey(GradeCategory, on_delete=models.CASCADE, related_name='grades')
    score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    max_score = models.DecimalField(max_digits=6, decimal_places=2, default=100.00)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['student', 'grade_category']

    def __str__(self):
        return f"{self.student} - {self.grade_category}: {self.score}"

    @property
    def percentage(self):
        if self.score is not None and self.max_score > 0:
            return (self.score / self.max_score) * 100
        return None


class ColumnImportHistory(models.Model):
    """Track which Excel columns have been imported to prevent duplicates"""

    # Link to the class record and Google Sheet
    class_record = models.ForeignKey(ClassRecord, on_delete=models.CASCADE, related_name='import_history')
    google_sheet_id = models.CharField(max_length=255)  # ID of the Google Sheet
    sheet_name = models.CharField(max_length=255, blank=True, null=True)  # Specific sheet name

    # Import details
    excel_column_name = models.CharField(max_length=255)  # Original Excel column name
    target_column_name = models.CharField(max_length=255)  # Google Sheet column it was mapped to

    # Tracking info
    imported_at = models.DateTimeField(auto_now_add=True)
    import_session_id = models.CharField(max_length=100)  # UUID to group imports
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    # Metadata
    import_action = models.CharField(max_length=20, default='replace')  # replace, merge
    data_points_imported = models.IntegerField(default=0)  # Number of student scores imported

    class Meta:
        ordering = ['-imported_at']
        indexes = [
            models.Index(fields=['google_sheet_id', 'excel_column_name']),
            models.Index(fields=['class_record', 'imported_at']),
        ]

    def __str__(self):
        return f"{self.excel_column_name} → {self.target_column_name} ({self.imported_at.strftime('%Y-%m-%d')})"