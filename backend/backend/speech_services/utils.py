import os
import tempfile
import io
import re
from google.cloud import speech
from django.conf import settings


def transcribe_audio(audio_bytes, language=None, student_names=None):
    """
    Transcribe audio using Google Speech-to-Text API with enhanced accuracy
    """
    try:
        # Initialize the Google Speech client
        client = speech.SpeechClient()

        # Log the audio size for debugging
        audio_size = len(audio_bytes)
        print(f"Received audio: {audio_size} bytes")

        # Create the audio content from bytes
        audio = speech.RecognitionAudio(content=audio_bytes)

        # 🎯 ENHANCED: Build dynamic speech contexts
        speech_contexts = []

        # Base context with common names and numbers
        base_phrases = [
            # Common student names that might be misheard
            "Omen", "Owen", "Ethan", "Aaron", "Aiden", "Ian", "Adam",
            "Zaki", "Zach", "Jack", "Jake", "Zack",
            "John", "Jane", "James", "Jenny", "Jerry",
            "Alex", "Alice", "Anna", "Amy", "Andy",
            "Ben", "Beth", "Bill", "Bob", "Bella",
            "Chris", "Claire", "Carl", "Cathy", "Cole",
            "David", "Diana", "Dan", "Donna", "Drew",
            # Numbers 0-100 (common score ranges)
            *[str(i) for i in range(0, 101)],
            # Score phrases
            "fifty", "sixty", "seventy", "eighty", "ninety",
            "zero", "ten", "twenty", "thirty", "forty",
        ]

        # 🎯 ADD: Dynamic student names if provided
        if student_names:
            base_phrases.extend(student_names)

        # Create primary speech context with high boost
        speech_contexts.append(
            speech.SpeechContext(
                phrases=base_phrases,
                boost=20.0,  # Higher boost for better recognition
            )
        )

        # 🎯 ADD: Specific problematic words context
        problematic_words = [
            "Omen", "Owen", "Ethan", "Aaron", "Aiden",  # Names that sound similar
            "Amen", "Alvin", "Evan", "Ivan", "Adam",  # Common misheard alternatives
        ]

        speech_contexts.append(
            speech.SpeechContext(
                phrases=problematic_words,
                boost=25.0,  # Even higher boost for known problematic words
            )
        )

        # 🎯 ENHANCED: More comprehensive recognition config
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=language or "en-US",

            # 🎯 ACCURACY IMPROVEMENTS
            enable_automatic_punctuation=True,
            enable_spoken_punctuation=False,  # Disable spoken punctuation to avoid confusion
            enable_spoken_emojis=False,  # Disable emojis
            enable_word_time_offsets=True,  # Get timing info for better analysis
            enable_word_confidence=True,  # Get confidence scores per word

            # 🎯 MODEL SELECTION: Use best model for short utterances
            model="latest_short",  # Optimized for short phrases like "Name Score"

            # 🎯 ENHANCED MODEL: Use premium features
            use_enhanced=True,  # Use enhanced model (costs more but better accuracy)

            # 🎯 AUDIO PROCESSING
            audio_channel_count=1,
            enable_separate_recognition_per_channel=False,

            # 🎯 SPEECH CONTEXTS: Apply our custom contexts
            speech_contexts=speech_contexts,

            # 🎯 ALTERNATIVES: Get multiple alternatives to choose from
            max_alternatives=3,  # Get top 3 transcription alternatives

            # 🎯 PROFANITY FILTER: Disable to avoid censoring names
            profanity_filter=False,
        )

        # Perform the transcription
        response = client.recognize(config=config, audio=audio)

        # 🎯 ENHANCED: Process results with confidence analysis
        best_transcript = ""
        highest_confidence = 0.0
        alternatives_info = []

        for result in response.results:
            for i, alternative in enumerate(result.alternatives):
                transcript = alternative.transcript.strip()
                confidence = alternative.confidence

                print(f"Alternative {i + 1}: '{transcript}' (confidence: {confidence:.3f})")

                # Store alternative info
                alternatives_info.append({
                    "transcript": transcript,
                    "confidence": confidence,
                    "words": []
                })

                # 🎯 ENHANCED: Word-level confidence analysis
                if hasattr(alternative, 'words'):
                    for word_info in alternative.words:
                        word = word_info.word
                        word_confidence = word_info.confidence if hasattr(word_info, 'confidence') else confidence
                        alternatives_info[-1]["words"].append({
                            "word": word,
                            "confidence": word_confidence
                        })
                        print(f"  Word: '{word}' (confidence: {word_confidence:.3f})")

                # Select best alternative
                if confidence > highest_confidence:
                    highest_confidence = confidence
                    best_transcript = transcript

        # 🎯 ENHANCED: Smart transcript selection
        final_transcript = smart_transcript_selection(alternatives_info, student_names)

        if final_transcript:
            return {
                "text": final_transcript,
                "success": True,
                "confidence": highest_confidence,
                "alternatives": alternatives_info
            }
        else:
            print("No speech detected in the audio")
            return {
                "success": False,
                "error": "No speech detected",
                "alternatives": alternatives_info
            }

    except Exception as e:
        print(f"Google Speech-to-Text error: {str(e)}")
        return {
            "success": False,
            "error": f"Google Speech-to-Text error: {str(e)}"
        }


def smart_transcript_selection(alternatives_info, student_names=None):
    """
    🎯 NEW: Intelligent transcript selection based on context and confidence
    """
    if not alternatives_info:
        return ""

    # If we only have one alternative, return it
    if len(alternatives_info) == 1:
        return alternatives_info[0]["transcript"]

    # 🎯 SMART SELECTION: Score alternatives based on multiple factors
    scored_alternatives = []

    for alt in alternatives_info:
        transcript = alt["transcript"]
        confidence = alt["confidence"]

        # Base score from confidence
        score = confidence * 100

        # 🎯 BONUS: If transcript contains known student names
        if student_names:
            for name in student_names:
                if name.lower() in transcript.lower():
                    score += 20  # Boost score for known names

        # 🎯 BONUS: If transcript has typical "Name Number" pattern
        name_number_pattern = r'^[A-Za-z\s]+ \d+$'
        if re.match(name_number_pattern, transcript.strip()):
            score += 15  # Boost for expected pattern

        # 🎯 PENALTY: For very short transcripts (might be incomplete)
        if len(transcript.strip()) < 3:
            score -= 10

        # 🎯 BONUS: For reasonable score ranges (0-100)
        numbers = re.findall(r'\d+', transcript)
        for num_str in numbers:
            try:
                num = int(num_str)
                if 0 <= num <= 100:
                    score += 10  # Reasonable score range
                elif num > 100:
                    score -= 5  # Unlikely score
            except ValueError:
                pass

        scored_alternatives.append({
            "transcript": transcript,
            "score": score,
            "confidence": confidence
        })

    # Sort by score and return the best one
    scored_alternatives.sort(key=lambda x: x["score"], reverse=True)

    print(f"Smart selection scores:")
    for alt in scored_alternatives:
        print(f"  '{alt['transcript']}' -> Score: {alt['score']:.1f} (Confidence: {alt['confidence']:.3f})")

    return scored_alternatives[0]["transcript"]