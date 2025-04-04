from django.db import models
from users.models import CustomUser

class ExcelFile(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    file_name = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'excel_files'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.file_name} - {self.user.email}"


class ExcelData(models.Model):
    excel_file = models.ForeignKey(ExcelFile, on_delete=models.CASCADE, related_name='data')
    sheet_name = models.CharField(max_length=255)
    row_data = models.JSONField()
    row_index = models.IntegerField()

    class Meta:
        db_table = 'excel_data'
        ordering = ['row_index']
