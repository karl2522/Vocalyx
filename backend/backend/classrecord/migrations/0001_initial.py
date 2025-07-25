# Generated by Django 3.2.8 on 2025-06-27 07:06

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ClassRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('semester', models.CharField(choices=[('1st Semester', '1st Semester'), ('2nd Semester', '2nd Semester'), ('Summer', 'Summer')], max_length=20)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('teacher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='class_records', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('name', 'semester', 'teacher')},
            },
        ),
        migrations.CreateModel(
            name='Student',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('student_number', models.CharField(max_length=20)),
                ('last_name', models.CharField(max_length=100)),
                ('first_name', models.CharField(max_length=100)),
                ('middle_name', models.CharField(blank=True, max_length=100, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('class_record', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='students', to='classrecord.classrecord')),
            ],
            options={
                'ordering': ['last_name', 'first_name'],
                'unique_together': {('class_record', 'student_number')},
            },
        ),
        migrations.CreateModel(
            name='GradeCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('category_type', models.CharField(choices=[('quiz', 'Quiz'), ('laboratory', 'Laboratory Activities'), ('exam', 'Exam'), ('assignment', 'Assignment'), ('project', 'Project')], max_length=20)),
                ('weight', models.DecimalField(decimal_places=2, default=0.0, max_digits=5)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('class_record', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='grade_categories', to='classrecord.classrecord')),
            ],
            options={
                'ordering': ['category_type', 'name'],
                'unique_together': {('class_record', 'name', 'category_type')},
            },
        ),
        migrations.CreateModel(
            name='Grade',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('score', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('max_score', models.DecimalField(decimal_places=2, default=100.0, max_digits=6)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('grade_category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='grades', to='classrecord.gradecategory')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='grades', to='classrecord.student')),
            ],
            options={
                'unique_together': {('student', 'grade_category')},
            },
        ),
    ]
