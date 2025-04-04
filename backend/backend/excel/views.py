from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import pandas as pd
from django.http import HttpResponse
from io import BytesIO
from .models import ExcelFile, ExcelData
from .serializers import ExcelFileSerializer
from drf_spectacular.utils import extend_schema
from rest_framework.parsers import MultiPartParser, FormParser


class ExcelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ExcelFileSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        return ExcelFile.objects.filter(user=self.request.user)

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

        try:
            # Create ExcelFile instance
            excel_file = ExcelFile.objects.create(
                user=request.user,
                file_name=file.name
            )
            print(f"ExcelFile created with ID: {excel_file.id}")

            # Read Excel file
            df = pd.read_excel(file)
            print(f"DataFrame shape: {df.shape}")

            # Handle NaN values and convert numeric types
            df = df.replace({pd.NA: None})
            df = df.fillna("")  # Replace NaN with empty string

            # Convert numeric columns to Python native types
            for column in df.select_dtypes(include=['float64', 'int64']).columns:
                df[column] = df[column].apply(
                    lambda x: None if pd.isna(x) else float(x) if isinstance(x, float) else int(x))

            # Convert to records
            records = df.to_dict('records')
            print(f"Number of records: {len(records)}")

            # Create ExcelData objects
            excel_data_objects = []
            for idx, record in enumerate(records):
                # Convert any remaining numpy types to Python native types
                cleaned_record = {}
                for key, value in record.items():
                    if pd.isna(value):
                        cleaned_record[key] = None
                    elif isinstance(value, (pd.Timestamp, pd.DatetimeTZDtype)):
                        cleaned_record[key] = value.isoformat()
                    else:
                        cleaned_record[key] = value

                excel_data_objects.append(
                    ExcelData(
                        excel_file=excel_file,
                        sheet_name='Sheet1',
                        row_data=cleaned_record,
                        row_index=idx
                    )
                )

            # Bulk create ExcelData objects
            ExcelData.objects.bulk_create(excel_data_objects)
            print("ExcelData objects created successfully")

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
            excel_data = excel_file.data.all().order_by('row_index')

            data = [row.row_data for row in excel_data]
            df = pd.DataFrame(data)

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