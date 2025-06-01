package com.example.vocalyxapk.composables

import android.widget.Toast
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.vocalyxapk.repository.AuthRepository
import com.example.vocalyxapk.utils.BiometricAuthManager
import com.example.vocalyxapk.utils.BiometricAuthStatus

@Composable
fun BiometricSettingsCard(
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var isBiometricEnabled by remember { mutableStateOf(BiometricAuthManager.isBiometricEnabled(context)) }
    val biometricStatus = remember { BiometricAuthManager.isBiometricAvailable(context) }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Fingerprint,
                    contentDescription = "Biometric",
                    tint = Color(0xFF333D79),
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Biometric Login",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333D79)
                    )
                    Text(
                        text = when (biometricStatus) {
                            BiometricAuthStatus.AVAILABLE -> if (isBiometricEnabled) "Enabled" else "Available"
                            BiometricAuthStatus.NOT_AVAILABLE -> "Not available on this device"
                            BiometricAuthStatus.TEMPORARILY_NOT_AVAILABLE -> "Temporarily unavailable"
                            BiometricAuthStatus.AVAILABLE_BUT_NOT_ENROLLED -> "No fingerprints enrolled"
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.Gray
                    )
                }

                if (biometricStatus == BiometricAuthStatus.AVAILABLE) {
                    Switch(
                        checked = isBiometricEnabled,
                        onCheckedChange = { enabled ->
                            if (enabled) {
                                // Enable biometric
                                val authRepository = AuthRepository(context)
                                authRepository.enableBiometricForUser(context)
                                isBiometricEnabled = true
                                Toast.makeText(context, "Biometric login enabled", Toast.LENGTH_SHORT).show()
                            } else {
                                // Disable biometric
                                BiometricAuthManager.disableBiometricLogin(context)
                                isBiometricEnabled = false
                                Toast.makeText(context, "Biometric login disabled", Toast.LENGTH_SHORT).show()
                            }
                        },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color(0xFF4CAF50),
                            checkedTrackColor = Color(0xFF4CAF50).copy(alpha = 0.5f)
                        )
                    )
                }
            }
        }
    }
}