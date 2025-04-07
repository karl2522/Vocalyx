from rest_framework import serializers
from .models import ExcelFile

class ExcelFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExcelFile
        fields = ['id', 'file_name', 'uploaded_at', 'sheet_data']
        read_only_fields = ['id', 'uploaded_at']