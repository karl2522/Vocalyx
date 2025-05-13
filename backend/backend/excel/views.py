from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import pandas as pd
from django.http import HttpResponse
from io import BytesIO
from .models import ExcelFile
from .serializers import ExcelFileSerializer
from drf_spectacular.utils import extend_schema
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class ExcelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ExcelFileSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        queryset = ExcelFile.objects.filter(user=self.request.user)
        class_id = self.request.query_params.get('class_id', None)
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        return queryset

    @extend_schema(
        description='Upload Excel file',
        request={
            'multipart/form-data': {'type': 'object', 'properties': {'file': {'type': 'string', 'format': 'binary'}}}},
        responses={201: ExcelFileSerializer}
    )
    @action(detail=False, methods=['POST'])
    def upload(self, request):
        print("Upload request received")

        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        print(f"File received: {file.name}")

        if not file.name.endswith(('.xlsx', '.xls')):
            return Response({'error': 'File must be an Excel file'}, status=status.HTTP_400_BAD_REQUEST)

        class_id = request.data.get('class_id')
        if not class_id:
            return Response({'error': 'class_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from classes.models import Class
            class_obj = Class.objects.get(id=class_id, user=request.user)
        except Class.DoesNotExist:
            return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            df = pd.read_excel(file)
            print(f"DataFrame shape: {df.shape}")

            df = df.replace({pd.NA: None})
            df = df.fillna("")

            for column in df.select_dtypes(include=['float64', 'int64']).columns:
                df[column] = df[column].apply(
                    lambda x: None if pd.isna(x) else float(x) if isinstance(x, float) else int(x))

            records = []
            for record in df.to_dict('records'):
                cleaned_record = {}
                for key, value in record.items():
                    if pd.isna(value):
                        cleaned_record[key] = None
                    elif isinstance(value, (pd.Timestamp, pd.DatetimeTZDtype)):
                        cleaned_record[key] = value.isoformat()
                    else:
                        cleaned_record[key] = value
                records.append(cleaned_record)

            # Updated line to include class_ref
            excel_file = ExcelFile.objects.create(
                user=request.user,
                class_ref=class_obj,  # This now references the Class object
                file_name=file.name,
                sheet_data=records
            )
            print(f"ExcelFile created with ID: {excel_file.id}")

            serializer = self.get_serializer(excel_file)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"Error during upload: {str(e)}")
            if 'excel_file' in locals():
                excel_file.delete()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description='Download Excel file',
        responses={200: {'type': 'string', 'format': 'binary'}}
    )
    @action(detail=True, methods=['GET'])
    def download(self, request, pk=None):
        excel_file = self.get_object()

        try:
            df = pd.DataFrame(excel_file.sheet_data)

            buffer = BytesIO()
            df.to_excel(buffer, index=False)
            buffer.seek(0)

            response = HttpResponse(
                buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{excel_file.file_name}"'
            return response

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['PATCH'])
    def update_data(self, request, pk=None):
        try:
            excel_file = self.get_object()
            sheet_data = request.data.get('sheet_data')

            if not sheet_data:
                return Response(
                    {'error': 'sheet_data is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            formatted_data = []
            for row in sheet_data:
                formatted_row = {}
                for key, value in row.items():
                    if value == "":
                        formatted_row[key] = None
                    elif isinstance(value, str) and value.replace('.', '', 1).isdigit():
                        formatted_row[key] = float(value) if '.' in value else int(value)
                    else:
                        formatted_row[key] = value
                formatted_data.append(formatted_row)

            excel_file.sheet_data = formatted_data
            excel_file.save()

            return Response({
                'message': 'Data updated successfully',
                'sheet_data': excel_file.sheet_data
            })

        except Exception as e:
            import traceback
            print("Error updating data:", str(e))
            print("Traceback:", traceback.format_exc())
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )