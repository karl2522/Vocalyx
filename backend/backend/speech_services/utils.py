import os
import tempfile
import io
import re
import numpy as np
from scipy import signal
from fuzzywuzzy import fuzz
from google.cloud import speech
from django.conf import settings
from django.utils import timezone
import json


# 🎯 NEW: Audio Preprocessing for Noisy Environments
def preprocess_audio(audio_bytes):
    """
    Enhance audio quality before sending to Speech-to-Text
    Especially useful for classroom environments with background noise
    """
    try:
        # Convert bytes to numpy array
        audio_data = np.frombuffer(audio_bytes, dtype=np.int16)

        # Convert to float for processing
        audio_data = audio_data.astype(np.float32) / 32768.0

        # Apply noise reduction (high-pass filter to remove low-frequency noise)
        # Removes things like air conditioning, fans, low rumbles
        sos = signal.butter(5, 300, btype='high', fs=16000, output='sos')
        audio_filtered = signal.sosfilt(sos, audio_data)

        # Apply a gentle low-pass filter to remove very high frequency noise
        sos_low = signal.butter(3, 8000, btype='low', fs=16000, output='sos')
        audio_filtered = signal.sosfilt(sos_low, audio_filtered)

        # Normalize volume (but avoid clipping)
        max_val = np.max(np.abs(audio_filtered))
        if max_val > 0:
            # Normalize to 90% to leave some headroom
            audio_normalized = audio_filtered * (0.9 / max_val)
        else:
            audio_normalized = audio_filtered

        # Convert back to int16
        audio_processed = (audio_normalized * 32767).astype(np.int16)

        print(
            f"Audio preprocessing: Original size: {len(audio_bytes)}, Processed size: {len(audio_processed.tobytes())}")

        return audio_processed.tobytes()

    except Exception as e:
        print(f"Audio preprocessing failed: {e}")
        return audio_bytes  # Return original if preprocessing fails


# 🎯 NEW: Enhanced Speech Contexts with Phonetic Variations
def build_adaptive_contexts(student_names=None):
    """
    Build intelligent speech contexts with phonetic variations
    Helps with names like "bikada" being misheard as "because of the"
    """
    contexts = []

    # Phonetic variations for common misheard names/words
    phonetic_variations = {
        # Common name mishearings
        "Owen": ["Omen", "Owin", "Open", "Ocean", "Owing"],
        "Ethan": ["Eathan", "Nathan", "Even", "Ivan", "Eden"],
        "Aaron": ["Erin", "Aren", "Iron", "Adam", "Arron"],
        "Ian": ["Eon", "Ion", "Ann", "Yan"],
        "Zaki": ["Zacky", "Saki", "Jackie", "Rocky"],
        "Jake": ["Jack", "Zach", "Take", "Shake"],

        # Add patterns for names ending in certain sounds
        "bikada": ["because of the", "because", "because da", "be cada", "picked up"],
        "mikael": ["Michael", "me call", "my call", "make all"],
        "rafael": ["refill", "ref fell", "raphael"],

        # Common classroom words that might interfere
        "attendance": ["a tendance", "at tendance"],
        "present": ["present", "president"],
        "absent": ["ab sent", "have sent"],
    }

    # Build primary context with student names and their variations
    primary_phrases = []

    # Base context with common names and numbers
    base_phrases = [
        # Common student names that might be misheard
        "Omen", "Owen", "Ethan", "Aaron", "Aiden", "Ian", "Adam",
        "Zaki", "Zach", "Jack", "Jake", "Zack", "bikada", "Bikada",
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

    primary_phrases.extend(base_phrases)

    # Add student names and their phonetic variations
    if student_names:
        for name in student_names:
            primary_phrases.append(name)
            primary_phrases.append(name.lower())
            primary_phrases.append(name.upper())
            primary_phrases.append(name.capitalize())

            # Add phonetic variations if we know them
            name_lower = name.lower()
            if name_lower in phonetic_variations:
                primary_phrases.extend(phonetic_variations[name_lower])

    # Create primary speech context with high boost
    contexts.append(
        speech.SpeechContext(
            phrases=primary_phrases,
            boost=25.0,  # Increased boost for better recognition
        )
    )

    # 🎯 NEW: Specific context for problematic name patterns
    problematic_patterns = [
        # Names that sound like common words
        "bikada", "Bikada", "BIKADA",
        "because of the", "because", "because da",  # Common mishearing of bikada

        # Other common problematic names (add yours here)
        "Omen", "Owen", "Ethan", "Aaron", "Aiden",
        "Amen", "Alvin", "Evan", "Ivan", "Adam",
    ]

    contexts.append(
        speech.SpeechContext(
            phrases=problematic_patterns,
            boost=30.0,  # Even higher boost for known problematic words
        )
    )

    return contexts


# 🎯 NEW: Post-processing with Fuzzy Matching
def post_process_transcript(transcript, student_names=None):
    """
    Apply NLP-based corrections after transcription
    Uses fuzzy matching to fix misheard names
    """
    if not transcript or not student_names:
        return transcript

    # Clean up the transcript
    transcript = transcript.strip()

    # Pattern: "Name Number" extraction
    pattern = r'^(.+?)\s+(\d+)$'
    match = re.match(pattern, transcript)

    if match:
        name_part = match.group(1).strip()
        score_part = match.group(2)

        # 🎯 FUZZY MATCHING: Find closest student name
        best_match = None
        best_score = 0

        for student_name in student_names:
            # Calculate similarity
            similarity = fuzz.ratio(name_part.lower(), student_name.lower())

            # Also try partial matching (handles cases like "because of the" -> "bikada")
            partial_similarity = fuzz.partial_ratio(name_part.lower(), student_name.lower())
            token_similarity = fuzz.token_sort_ratio(name_part.lower(), student_name.lower())

            # Take the best similarity score
            max_similarity = max(similarity, partial_similarity, token_similarity)

            print(f"Fuzzy matching '{name_part}' vs '{student_name}': {max_similarity}%")

            if max_similarity > best_score and max_similarity > 60:  # 60% threshold
                best_score = max_similarity
                best_match = student_name

        if best_match:
            corrected = f"{best_match} {score_part}"
            if corrected != transcript:
                print(f"🎯 CORRECTION: '{transcript}' -> '{corrected}' (confidence: {best_score}%)")
            return corrected

    # If no pattern match, try to find any student name in the transcript
    if student_names:
        words = transcript.lower().split()
        for i, word in enumerate(words):
            for student_name in student_names:
                similarity = fuzz.ratio(word, student_name.lower())
                if similarity > 70:  # High confidence threshold for word replacement
                    words[i] = student_name
                    corrected = ' '.join(words)
                    print(f"🎯 WORD CORRECTION: '{transcript}' -> '{corrected}'")
                    return corrected

    return transcript


# 🎯 NEW: Error Tracking and Learning System
class SpeechRecognitionTracker:
    """
    Track errors and learn from corrections to improve over time
    """

    def __init__(self, log_file_path=None):
        self.log_file_path = log_file_path or os.path.join(settings.BASE_DIR, 'speech_corrections.json')
        self.error_log = self.load_error_log()

    def load_error_log(self):
        """Load existing error log from file"""
        try:
            if os.path.exists(self.log_file_path):
                with open(self.log_file_path, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading speech correction log: {e}")
        return []

    def save_error_log(self):
        """Save error log to file"""
        try:
            with open(self.log_file_path, 'w') as f:
                json.dump(self.error_log, f, indent=2, default=str)
        except Exception as e:
            print(f"Error saving speech correction log: {e}")

    def log_correction(self, original_transcript, corrected_transcript, student_name=None, confidence=None):
        """
        Log when corrections are made (either automatic or manual)
        """
        correction_entry = {
            'timestamp': timezone.now().isoformat(),
            'original': original_transcript,
            'corrected': corrected_transcript,
            'student_name': student_name,
            'confidence': confidence,
            'correction_type': 'automatic' if original_transcript != corrected_transcript else 'manual'
        }

        self.error_log.append(correction_entry)
        self.save_error_log()

        print(f"📝 Logged correction: '{original_transcript}' -> '{corrected_transcript}'")

    def get_common_mistakes(self):
        """
        Analyze logged corrections to find common patterns
        """
        mistakes = {}
        for entry in self.error_log:
            original = entry['original'].lower()
            corrected = entry['corrected'].lower()

            if original != corrected:
                if original not in mistakes:
                    mistakes[original] = []
                mistakes[original].append(corrected)

        return mistakes

    def get_improved_speech_contexts(self):
        """
        Generate improved speech contexts based on learned mistakes
        """
        common_mistakes = self.get_common_mistakes()
        improved_phrases = []

        for mistake, corrections in common_mistakes.items():
            # Add both the mistake and corrections to help recognition
            improved_phrases.append(mistake)
            improved_phrases.extend(corrections)

        return improved_phrases


# 🎯 ENHANCED: Main transcription function with all improvements
def transcribe_audio(audio_bytes, language=None, student_names=None, enable_preprocessing=True):
    """
    Transcribe audio using Google Speech-to-Text API with enhanced accuracy
    Now includes: audio preprocessing, fuzzy matching, and error learning
    """
    try:
        # Initialize the Google Speech client
        client = speech.SpeechClient()

        # Initialize error tracker
        tracker = SpeechRecognitionTracker()

        # Log the audio size for debugging
        audio_size = len(audio_bytes)
        print(f"Received audio: {audio_size} bytes")

        # 🎯 NEW: Apply audio preprocessing for noisy environments
        if enable_preprocessing:
            print("🎯 Applying audio preprocessing...")
            audio_bytes = preprocess_audio(audio_bytes)

        # Create the audio content from bytes
        audio = speech.RecognitionAudio(content=audio_bytes)

        # 🎯 ENHANCED: Build adaptive speech contexts with phonetic variations
        speech_contexts = build_adaptive_contexts(student_names)

        # 🎯 NEW: Add learned corrections to speech contexts
        learned_phrases = tracker.get_improved_speech_contexts()
        if learned_phrases:
            speech_contexts.append(
                speech.SpeechContext(
                    phrases=learned_phrases,
                    boost=20.0,
                )
            )

        # 🎯 ENHANCED: More comprehensive recognition config
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=language or "en-US",

            # 🎯 ACCURACY IMPROVEMENTS
            enable_automatic_punctuation=True,
            enable_spoken_punctuation=False,
            enable_spoken_emojis=False,
            enable_word_time_offsets=True,
            enable_word_confidence=True,

            # 🎯 MODEL SELECTION
            model="latest_short",
            use_enhanced=True,

            # 🎯 AUDIO PROCESSING
            audio_channel_count=1,
            enable_separate_recognition_per_channel=False,

            # 🎯 SPEECH CONTEXTS: Apply our enhanced contexts
            speech_contexts=speech_contexts,

            # 🎯 ALTERNATIVES: Get multiple alternatives
            max_alternatives=5,  # Increased from 3 to 5 for better options

            # 🎯 PROFANITY FILTER
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

                # Word-level confidence analysis
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
        selected_transcript = smart_transcript_selection(alternatives_info, student_names)

        # 🎯 NEW: Apply post-processing with fuzzy matching
        if selected_transcript and student_names:
            original_transcript = selected_transcript
            selected_transcript = post_process_transcript(selected_transcript, student_names)

            # Log if correction was made
            if original_transcript != selected_transcript:
                tracker.log_correction(
                    original_transcript,
                    selected_transcript,
                    confidence=highest_confidence
                )

        if selected_transcript:
            return {
                "text": selected_transcript,
                "success": True,
                "confidence": highest_confidence,
                "alternatives": alternatives_info,
                "preprocessing_applied": enable_preprocessing,
                "corrections_made": len(tracker.error_log)
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


# 🎯 ENHANCED: Smart transcript selection with fuzzy matching
def smart_transcript_selection(alternatives_info, student_names=None):
    """
    Enhanced intelligent transcript selection with fuzzy matching consideration
    """
    if not alternatives_info:
        return ""

    if len(alternatives_info) == 1:
        return alternatives_info[0]["transcript"]

    scored_alternatives = []

    for alt in alternatives_info:
        transcript = alt["transcript"]
        confidence = alt["confidence"]

        # Base score from confidence
        score = confidence * 100

        # 🎯 NEW: Fuzzy matching bonus for student names
        if student_names:
            max_fuzzy_score = 0
            for name in student_names:
                # Check if transcript contains something similar to this name
                words = transcript.lower().split()
                for word in words:
                    fuzzy_score = fuzz.ratio(word, name.lower())
                    max_fuzzy_score = max(max_fuzzy_score, fuzzy_score)

            # Add bonus based on fuzzy matching
            if max_fuzzy_score > 70:
                score += 25  # High similarity bonus
            elif max_fuzzy_score > 50:
                score += 15  # Medium similarity bonus

        # Bonus for typical "Name Number" pattern
        name_number_pattern = r'^[A-Za-z\s]+ \d+$'
        if re.match(name_number_pattern, transcript.strip()):
            score += 15

        # Penalty for very short transcripts
        if len(transcript.strip()) < 3:
            score -= 10

        # Bonus for reasonable score ranges (0-100)
        numbers = re.findall(r'\d+', transcript)
        for num_str in numbers:
            try:
                num = int(num_str)
                if 0 <= num <= 100:
                    score += 10
                elif num > 100:
                    score -= 5
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


# 🎯 NEW: Manual correction function for building training data
def log_manual_correction(original_transcript, corrected_transcript, student_name=None):
    """
    Function to call when users manually correct transcriptions
    This builds valuable training data for future improvements
    """
    tracker = SpeechRecognitionTracker()
    tracker.log_correction(
        original_transcript,
        corrected_transcript,
        student_name=student_name,
        confidence=None  # Manual corrections don't have confidence scores
    )

    print(f"✅ Manual correction logged: '{original_transcript}' -> '{corrected_transcript}'")


# 🎯 NEW: Fallback transcription with multiple approaches
def transcribe_with_fallback(audio_bytes, language=None, student_names=None):
    """
    Try multiple approaches if primary transcription has low confidence
    """
    # Try primary configuration with preprocessing
    result = transcribe_audio(audio_bytes, language, student_names, enable_preprocessing=True)

    if result['success'] and result['confidence'] > 0.8:
        return result

    print("🎯 Primary transcription confidence low, trying fallback approaches...")

    # Fallback 1: Try without preprocessing (in case preprocessing is causing issues)
    result_no_preprocess = transcribe_audio(audio_bytes, language, student_names, enable_preprocessing=False)

    # Fallback 2: Try with different model configuration
    # (You could implement this with different models)

    # Return best result
    all_results = [r for r in [result, result_no_preprocess] if r['success']]
    if all_results:
        best_result = max(all_results, key=lambda x: x.get('confidence', 0))
        print(f"🎯 Selected best result with confidence: {best_result.get('confidence', 0):.3f}")
        return best_result

    return result  # Return original if all failed