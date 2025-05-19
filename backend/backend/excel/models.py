from django.db import models
from users.models import CustomUser

class ExcelFile(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    class_ref = models.ForeignKey('classes.Class', on_delete=models.CASCADE, related_name='excel_files', null=True,
                                  blank=True)
    file_name = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    all_sheets = models.JSONField(default=dict)
    active_sheet = models.CharField(max_length=255, default='Sheet1')

    class Meta:
        db_table = 'excel_files'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.file_name} - {self.user.email}"