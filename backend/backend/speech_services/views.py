from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from rest_framework.parsers import MultiPartParser, FormParser

from .serializers import TranscriptionRequestSerializer, TranscriptionResponseSerializer
from .utils import transcribe_audio
from .models import TranscriptionUsage


class SpeechServiceViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    @extend_schema(
        description='Transcribe audio to text using advanced speech recognition',
        request=TranscriptionRequestSerializer,
        responses={200: TranscriptionResponseSerializer}
    )
    @action(detail=False, methods=['POST'])
    def transcribe(self, request):
        serializer = TranscriptionRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get the audio file and language
            audio_file = request.FILES.get('audio_file')
            language = request.data.get('language')

            # 🎯 NEW: Get student names from request (for future use)
            student_names_str = request.data.get('student_names', '')
            student_names = [name.strip() for name in student_names_str.split(',') if
                             name.strip()] if student_names_str else None

            if not audio_file:
                return Response(
                    {"success": False, "error": "No audio file provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Read the audio file
            audio_bytes = audio_file.read()

            # 🎯 ENHANCED: Call improved transcribe function with student names
            result = transcribe_audio(audio_bytes, language, student_names)

            # Record usage for monitoring
            TranscriptionUsage.objects.create(
                user=request.user,
                audio_length_seconds=len(audio_bytes) / 32000  # Rough estimate based on 16kHz 16-bit audio
            )

            # Return the transcription result
            return Response(result)

        except Exception as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )