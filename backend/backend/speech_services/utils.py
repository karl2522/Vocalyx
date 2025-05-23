import os
import tempfile
import io
from google.cloud import speech
from django.conf import settings


def transcribe_audio(audio_bytes, language=None):
    """
    Transcribe audio using Google Speech-to-Text API
    """
    try:
        # Initialize the Google Speech client
        client = speech.SpeechClient()

        # Log the audio size for debugging
        audio_size = len(audio_bytes)
        print(f"Received audio: {audio_size} bytes")

        # Create the audio content from bytes
        audio = speech.RecognitionAudio(content=audio_bytes)

        # Configure recognition settings with more options
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=language or "en-US",
            enable_automatic_punctuation=True,
            # Make it more sensitive to short utterances
            model="latest_short",
            # Improve detection of single words
            speech_contexts=[
                speech.SpeechContext(
                    phrases=["Zaki", "30", "Zach", "20", "test"],
                    boost=15.0,
                )
            ],
            # Increase sensitivity
            use_enhanced=True,
            audio_channel_count=1,
        )

        # Perform the transcription
        response = client.recognize(config=config, audio=audio)

        # Process results
        transcript = ""
        for result in response.results:
            transcript += result.alternatives[0].transcript
            print(f"Detected speech: '{transcript}' with confidence: {result.alternatives[0].confidence}")

        if transcript:
            return {
                "text": transcript,
                "success": True
            }
        else:
            print("No speech detected in the audio")
            return {
                "success": False,
                "error": "No speech detected"
            }

    except Exception as e:
        print(f"Google Speech-to-Text error: {str(e)}")
        return {
            "success": False,
            "error": f"Google Speech-to-Text error: {str(e)}"
        }