from django.db import models
from users.models import CustomUser

class ExcelFile(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    file_name = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    sheet_data = models.JSONField(default=list)

    class Meta:
        db_table = 'excel_files'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.file_name} - {self.user.email}"