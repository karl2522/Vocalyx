# Generated by Django 3.2.8 on 2025-04-04 01:57

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ExcelFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_name', models.CharField(max_length=255)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'excel_files',
                'ordering': ['-uploaded_at'],
            },
        ),
        migrations.CreateModel(
            name='ExcelData',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sheet_name', models.CharField(max_length=255)),
                ('row_data', models.JSONField()),
                ('row_index', models.IntegerField()),
                ('excel_file', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='data', to='excel.excelfile')),
            ],
            options={
                'db_table': 'excel_data',
                'ordering': ['row_index'],
            },
        ),
    ]
