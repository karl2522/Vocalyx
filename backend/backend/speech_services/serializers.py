from rest_framework import serializers

class TranscriptionRequestSerializer(serializers.Serializer):
    audio_file = serializers.FileField(required=True)
    language = serializers.CharField(required=False, allow_null=True, allow_blank=True)

class TranscriptionResponseSerializer(serializers.Serializer):
    text = serializers.CharField()
    success = serializers.BooleanField()
    error = serializers.CharField(required=False, allow_null=True)