from rest_framework import serializers
from .models import ExcelFile


class ExcelFileSerializer(serializers.ModelSerializer):
    sheet_names = serializers.SerializerMethodField()
    column_categories = serializers.SerializerMethodField()

    class Meta:
        model = ExcelFile
        fields = ['id', 'file_name', 'uploaded_at', 'all_sheets', 'active_sheet', 'sheet_names', 'column_categories', 'update_count']
        read_only_fields = ['id', 'uploaded_at', 'sheet_names']

    def get_sheet_names(self, obj):
        return list(obj.all_sheets.keys()) if obj.all_sheets else []

    def get_column_categories(self, obj):
        column_categories = {}

        if obj.all_sheets and 'category_mappings' in obj.all_sheets:
            for category in obj.all_sheets['category_mappings']:
                if 'id' in category and 'columns' in category:
                    category_id = category['id']
                    for column in category['columns']:
                        column_categories[column] = category_id

        return column_categories