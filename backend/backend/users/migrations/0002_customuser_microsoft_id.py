# Generated by Django 3.2.8 on 2025-02-28 15:31

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='microsoft_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
