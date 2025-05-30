package com.example.vocalyxapk.utils

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import androidx.core.content.ContextCompat
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

// Convert raw PCM audio to WAV format
fun audioToByteArray(pcmBytes: ByteArray, sampleRate: Int = 16000): ByteArray {
    val outputStream = ByteArrayOutputStream()

    // WAV header
    outputStream.write("RIFF".toByteArray())
    outputStream.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN)
        .putInt(36 + pcmBytes.size).array())
    outputStream.write("WAVE".toByteArray())
    outputStream.write("fmt ".toByteArray())
    outputStream.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN)
        .putInt(16).array())
    outputStream.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN)
        .putShort(1).array())
    outputStream.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN)
        .putShort(1).array())
    outputStream.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN)
        .putInt(sampleRate).array())
    outputStream.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN)
        .putInt(sampleRate * 1 * 16 / 8).array())
    outputStream.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN)
        .putShort((1 * 16 / 8).toShort()).array())
    outputStream.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN)
        .putShort(16).array())
    outputStream.write("data".toByteArray())
    outputStream.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN)
        .putInt(pcmBytes.size).array())
    outputStream.write(pcmBytes)

    return outputStream.toByteArray()
}

class AudioRecorder(private val context: Context) {
    private var recorder: AudioRecord? = null
    var isRecording = false
        private set
    private val sampleRate = 16000 // 16kHz
    private val bufferSize = AudioRecord.getMinBufferSize(
        sampleRate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT
    ) * 3 // Make buffer larger

    private val audioData = ByteArrayOutputStream()
    private var recordingThread: Thread? = null

    // For silence detection
    private var lastSoundTime = 0L
    private val silenceThreshold = 500 // Threshold for silence detection
    private val silenceTimeout = 1500L // Stop after 1.5 seconds of silence
    private var minimumRecordingTime = 700L // Minimum recording time in ms
    private var recordingStartTime = 0L

    // Check if we have recording permission
    fun hasRecordingPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun startRecording(): Boolean {
        if (isRecording) return true

        Log.d("AudioRecorder", "Starting recording...")

        // Check permission first
        if (!hasRecordingPermission()) {
            Log.e("AudioRecorder", "No recording permission")
            return false
        }

        try {
            // Clear previous recording data
            audioData.reset()
            lastSoundTime = System.currentTimeMillis()
            recordingStartTime = System.currentTimeMillis()

            recorder = AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize
            )

            Log.d("AudioRecorder", "Recorder state: ${recorder?.state}")

            if (recorder?.state != AudioRecord.STATE_INITIALIZED) {
                Log.e("AudioRecorder", "AudioRecord not initialized")
                return false
            }

            recorder?.startRecording()
            isRecording = true

            // Start recording thread
            recordingThread = Thread {
                val buffer = ByteArray(bufferSize)

                while (isRecording) {
                    val read = recorder?.read(buffer, 0, bufferSize) ?: -1
                    if (read > 0) {
                        audioData.write(buffer, 0, read)

                        // Check for audio activity (non-silence)
                        val isAudioActive = containsAudio(buffer, read)
                        val currentTime = System.currentTimeMillis()

                        if (isAudioActive) {
                            lastSoundTime = currentTime
                        } else {
                            // Auto-stop if silence is detected for too long
                            // but only after we've captured at least some sound
                            // and after minimum recording time
                            if (audioData.size() > 10000 && // At least 10KB of audio data
                                currentTime - recordingStartTime > minimumRecordingTime &&
                                currentTime - lastSoundTime > silenceTimeout) {
                                Log.d("AudioRecorder", "Silence detected, auto-stopping after ${currentTime - lastSoundTime}ms")
                                isRecording = false
                                break
                            }
                        }
                    }
                }
            }
            recordingThread?.start()

            Log.d("AudioRecorder", "Recording started successfully")
            return true
        } catch (e: SecurityException) {
            Log.e("AudioRecorder", "Security exception when starting recording", e)
            return false
        } catch (e: Exception) {
            Log.e("AudioRecorder", "Exception when starting recording", e)
            return false
        }
    }

    // Helper method to detect if audio buffer contains actual sound
    private fun containsAudio(buffer: ByteArray, size: Int): Boolean {
        var sum = 0.0
        var i = 0
        while (i < size - 1 && i < 1000) { // Sample the first 1000 bytes at most
            val sample = (buffer[i].toInt() and 0xFF) or (buffer[i + 1].toInt() shl 8)
            sum += Math.abs(sample.toDouble())
            i += 2
        }
        val average = sum / (size / 2.0)
        return average > silenceThreshold
    }

    fun stopRecording(): ByteArray? {
        if (!isRecording && audioData.size() == 0) {
            Log.d("AudioRecorder", "Not recording and no data, nothing to stop")
            return null
        }

        Log.d("AudioRecorder", "Stopping recording...")

        try {
            // Stop the recording thread first
            isRecording = false
            recordingThread?.join(500) // Wait for recording thread to finish

            recorder?.stop()
            recorder?.release()
            recorder = null

            // Get the recorded data
            val rawData = audioData.toByteArray()
            Log.d("AudioRecorder", "Raw audio size: ${rawData.size} bytes")

            if (rawData.isEmpty()) {
                Log.e("AudioRecorder", "No audio data captured")
                return null
            }

            // Convert to WAV format
            val wavData = audioToByteArray(rawData, sampleRate)
            Log.d("AudioRecorder", "WAV audio size: ${wavData.size} bytes")

            return wavData
        } catch (e: Exception) {
            Log.e("AudioRecorder", "Error stopping recording", e)
            return null
        }
    }

    // Force stop recording (call from another thread if needed)
    fun forceStop() {
        isRecording = false
    }
}