from rest_framework import serializers
from .models import ExcelFile, ExcelData

class ExcelDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExcelData
        fields = ['row_index', 'row_data', 'sheet_name']

class ExcelFileSerializer(serializers.ModelSerializer):
    data = ExcelDataSerializer(many=True, read_only=True)

    class Meta:
        model = ExcelFile
        fields = ['id', 'file_name', 'uploaded_at', 'data']
        read_only_fields = ['id', 'uploaded_at']