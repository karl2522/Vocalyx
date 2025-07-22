package com.example.vocalyxapk.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontFamily
import androidx.core.view.WindowCompat
import com.example.vocalyxapk.utils.withDMSans

// Custom LocalFontFamily to provide DM Sans throughout the app
val LocalFontFamily = staticCompositionLocalOf<FontFamily> { DMSans }

private val CustomColorScheme = lightColorScheme(
    primary = Color(0xFF333D79),
    secondary = Color(0xFF333D79),
    tertiary = Color(0xFF333D79),
    background = Color.White,
    surface = Color.White,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFF1C1B1F),
    onSurface = Color(0xFF1C1B1F)
)

@Composable
fun VOCALYXAPKTheme(
    darkTheme: Boolean = false, // Force light theme
    content: @Composable () -> Unit
) {
    val colorScheme = CustomColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    // Apply DM Sans to all Typography
    val dmSansTypography = Typography.withDMSans()

    // Provide the DM Sans font family throughout the app
    CompositionLocalProvider(
        LocalFontFamily provides DMSans
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = dmSansTypography,
            content = content
        )
    }
}