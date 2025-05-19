from rest_framework import serializers
from .models import ExcelFile

class ExcelFileSerializer(serializers.ModelSerializer):
    sheet_names = serializers.SerializerMethodField()

    class Meta:
        model = ExcelFile
        fields = ['id', 'file_name', 'uploaded_at', 'all_sheets', 'active_sheet', 'sheet_names']
        read_only_fields = ['id', 'uploaded_at', 'sheet_names']

    def get_sheet_names(self, obj):
        return list(obj.all_sheets.keys()) if obj.all_sheets else []