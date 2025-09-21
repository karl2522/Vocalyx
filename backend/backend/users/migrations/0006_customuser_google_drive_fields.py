# Generated manually for Google Drive integration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_auto_20250703_1535'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='google_access_token',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='google_refresh_token',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='google_token_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='google_connected_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
