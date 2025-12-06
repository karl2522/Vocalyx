# Generated manually to update semester choices from Summer to Midyear

from django.db import migrations, models


def update_semester_values(apps, schema_editor):
    """Update existing records from 'Summer' to 'Midyear'"""
    ClassRecord = apps.get_model('classrecord', 'ClassRecord')
    ClassRecord.objects.filter(semester='Summer').update(semester='Midyear')


def reverse_update_semester_values(apps, schema_editor):
    """Reverse: Update existing records from 'Midyear' back to 'Summer'"""
    ClassRecord = apps.get_model('classrecord', 'ClassRecord')
    ClassRecord.objects.filter(semester='Midyear').update(semester='Summer')


class Migration(migrations.Migration):

    dependencies = [
        ('classrecord', '0012_classrecord_academic_year'),
    ]

    operations = [
        # First, update existing data
        migrations.RunPython(update_semester_values, reverse_update_semester_values),
        # Then, update the field choices
        migrations.AlterField(
            model_name='classrecord',
            name='semester',
            field=models.CharField(
                choices=[
                    ('1st Semester', '1st Semester'),
                    ('2nd Semester', '2nd Semester'),
                    ('Midyear', 'Midyear'),
                ],
                max_length=20
            ),
        ),
    ]


