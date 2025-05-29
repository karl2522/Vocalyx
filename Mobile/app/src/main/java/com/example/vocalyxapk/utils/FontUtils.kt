package com.example.vocalyxapk.utils

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import com.example.vocalyxapk.ui.theme.DMSans

/**
 * Utility extensions for working with DM Sans font throughout the app
 */

/**
 * Extension function to easily apply DM Sans font to a TextStyle with specified weight
 */
fun TextStyle.withDMSans(weight: FontWeight? = null): TextStyle {
    return this.copy(
        fontFamily = DMSans,
        fontWeight = weight ?: this.fontWeight
    )
}

/**
 * Extension function to apply DM Sans Regular
 */
fun TextStyle.withDMSansRegular(): TextStyle = this.withDMSans(FontWeight.Normal)

/**
 * Extension function to apply DM Sans Medium
 */
fun TextStyle.withDMSansMedium(): TextStyle = this.withDMSans(FontWeight.Medium)

/**
 * Extension function to apply DM Sans SemiBold
 */
fun TextStyle.withDMSansSemiBold(): TextStyle = this.withDMSans(FontWeight.SemiBold)

/**
 * Extension function to apply DM Sans Bold
 */
fun TextStyle.withDMSansBold(): TextStyle = this.withDMSans(FontWeight.Bold)

/**
 * Extension function to apply DM Sans to the entire Typography object
 */
fun Typography.withDMSans(): Typography {
    return this.copy(
        displayLarge = displayLarge.withDMSans(),
        displayMedium = displayMedium.withDMSans(),
        displaySmall = displaySmall.withDMSans(),
        headlineLarge = headlineLarge.withDMSans(),
        headlineMedium = headlineMedium.withDMSans(),
        headlineSmall = headlineSmall.withDMSans(),
        titleLarge = titleLarge.withDMSans(),
        titleMedium = titleMedium.withDMSansMedium(),
        titleSmall = titleSmall.withDMSansMedium(),
        bodyLarge = bodyLarge.withDMSansRegular(),
        bodyMedium = bodyMedium.withDMSansRegular(),
        bodySmall = bodySmall.withDMSansRegular(),
        labelLarge = labelLarge.withDMSansMedium(),
        labelMedium = labelMedium.withDMSansMedium(),
        labelSmall = labelSmall.withDMSansMedium()
    )
} 