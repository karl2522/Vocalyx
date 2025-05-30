package com.example.vocalyxapk.composables

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.ui.theme.DMSans
import com.example.vocalyxapk.utils.withDMSansBold
import com.example.vocalyxapk.utils.withDMSansMedium
import com.example.vocalyxapk.utils.withDMSansRegular
import com.example.vocalyxapk.viewmodel.ProfileTab
import com.example.vocalyxapk.viewmodel.ProfileViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    modifier: Modifier = Modifier,
    profileViewModel: ProfileViewModel = viewModel()
) {
    val uiState by profileViewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Initialize ViewModel
    LaunchedEffect(Unit) {
        profileViewModel.initialize(context)
    }

    // Animation states
    var headerVisible by remember { mutableStateOf(false) }
    val headerAlpha by animateFloatAsState(
        targetValue = if (headerVisible) 1f else 0f,
        animationSpec = tween(500), label = "headerAlpha"
    )

    LaunchedEffect(Unit) {
        headerVisible = true
    }

    if (uiState.isLoading && uiState.profile == null) {
        // Loading state
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CircularProgressIndicator(color = Color(0xFF333D79))
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Loading profile...",
                    style = MaterialTheme.typography.bodyMedium.withDMSansRegular(),
                    color = Color.Gray
                )
            }
        }
        return
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Profile Header
        item {
            ProfileHeader(
                profile = uiState.profile,
                formData = profileViewModel.formData,
                isEditing = uiState.isEditing,
                headerAlpha = headerAlpha,
                onEditClick = { profileViewModel.setEditing(!uiState.isEditing) }
            )
        }

        // 🎯 NEW: Horizontal Tab Cards
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Profile Information Tab Card
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { profileViewModel.setActiveTab(ProfileTab.PROFILE) },
                    colors = CardDefaults.cardColors(
                        containerColor = if (uiState.activeTab == ProfileTab.PROFILE)
                            Color(0xFFEEF0F8) else Color.White
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(
                        1.dp,
                        if (uiState.activeTab == ProfileTab.PROFILE)
                            Color(0xFF333D79) else Color(0xFFE0E0E0)
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Person,
                            contentDescription = null,
                            tint = if (uiState.activeTab == ProfileTab.PROFILE)
                                Color(0xFF333D79) else Color.Gray,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Profile Information",
                            style = MaterialTheme.typography.bodyMedium.withDMSansMedium(),
                            color = if (uiState.activeTab == ProfileTab.PROFILE)
                                Color(0xFF333D79) else Color.Gray,
                            textAlign = TextAlign.Center
                        )
                    }
                }

                // Account Settings Tab Card
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { profileViewModel.setActiveTab(ProfileTab.ACCOUNT) },
                    colors = CardDefaults.cardColors(
                        containerColor = if (uiState.activeTab == ProfileTab.ACCOUNT)
                            Color(0xFFEEF0F8) else Color.White
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(
                        1.dp,
                        if (uiState.activeTab == ProfileTab.ACCOUNT)
                            Color(0xFF333D79) else Color(0xFFE0E0E0)
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Filled.AlternateEmail,
                            contentDescription = null,
                            tint = if (uiState.activeTab == ProfileTab.ACCOUNT)
                                Color(0xFF333D79) else Color.Gray,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Account Settings",
                            style = MaterialTheme.typography.bodyMedium.withDMSansMedium(),
                            color = if (uiState.activeTab == ProfileTab.ACCOUNT)
                                Color(0xFF333D79) else Color.Gray,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }

        // 🎯 NEW: Main Content Card (Full Width)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column {
                    // Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = when (uiState.activeTab) {
                                ProfileTab.PROFILE -> "Profile Information"
                                ProfileTab.ACCOUNT -> "Account Settings"
                            },
                            style = MaterialTheme.typography.titleLarge.withDMSansBold(),
                            color = Color(0xFF333333)
                        )

                        if (uiState.isEditing && uiState.activeTab == ProfileTab.PROFILE) {
                            Surface(
                                color = Color(0xFFEEF0F8),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = "Editing Mode",
                                    style = MaterialTheme.typography.labelSmall.withDMSansMedium(),
                                    color = Color(0xFF333D79),
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }

                    Divider(color = Color(0xFFE0E0E0))

                    // Content
                    when (uiState.activeTab) {
                        ProfileTab.PROFILE -> {
                            ProfileInformationContent(
                                profile = uiState.profile,
                                formData = profileViewModel.formData,
                                isEditing = uiState.isEditing,
                                isSubmitting = uiState.isSubmitting,
                                onFormFieldChange = profileViewModel::updateFormField,
                                onSave = profileViewModel::submitProfile,
                                onCancel = { profileViewModel.setEditing(false) },
                                onEdit = { profileViewModel.setEditing(true) }
                            )
                        }
                        ProfileTab.ACCOUNT -> {
                            AccountSettingsContent(
                                profile = uiState.profile
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileHeader(
    profile: com.example.vocalyxapk.models.UserProfile?,
    formData: com.example.vocalyxapk.viewmodel.ProfileFormData,
    isEditing: Boolean,
    headerAlpha: Float,
    onEditClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color(0xFF333D79),
                            Color(0xFF4A5495)
                        )
                    )
                )
                .padding(20.dp)
        ) {
            // Background decorative elements
            Box(
                modifier = Modifier
                    .size(150.dp)
                    .offset(x = 200.dp, y = (-50).dp)
                    .background(
                        Color.White.copy(alpha = 0.05f),
                        CircleShape
                    )
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .alpha(headerAlpha),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Profile Picture
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    if (profile?.profile_picture != null) {
                        // Load image here when implemented
                        Icon(
                            imageVector = Icons.Filled.Person,
                            contentDescription = "Profile Picture",
                            tint = Color.White,
                            modifier = Modifier.size(40.dp)
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Filled.Person,
                            contentDescription = "Profile Picture",
                            tint = Color.White,
                            modifier = Modifier.size(40.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                // Profile Info
                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = profile?.fullName ?: "${formData.firstName} ${formData.lastName}".trim(),
                        style = MaterialTheme.typography.headlineSmall.withDMSansBold(),
                        color = Color.White
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Email,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.7f),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = profile?.email ?: formData.email,
                            style = MaterialTheme.typography.bodyMedium.withDMSansRegular(),
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Filled.School,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.7f),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = profile?.institution ?: formData.institution,
                            style = MaterialTheme.typography.bodySmall.withDMSansRegular(),
                            color = Color.White.copy(alpha = 0.8f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Edit Button
                OutlinedButton(
                    onClick = onEditClick,
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color.White
                    ),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(
                        imageVector = if (isEditing) Icons.Filled.Close else Icons.Filled.Edit,
                        contentDescription = if (isEditing) "Cancel" else "Edit",
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (isEditing) "Cancel" else "Edit",
                        style = MaterialTheme.typography.labelMedium.withDMSansMedium()
                    )
                }
            }
        }
    }
}

@Composable
fun ProfileInfoField(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium.withDMSansMedium(),
            color = Color.Gray,
            modifier = Modifier.padding(bottom = 4.dp)
        )
        Text(
            text = value.takeIf { it.isNotBlank() } ?: "-",
            style = MaterialTheme.typography.bodyMedium.withDMSansRegular(),
            color = Color(0xFF333333)
        )
    }
}

@Composable
fun ProfileTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isRequired: Boolean = false,
    placeholder: String = "",
    helperText: String = "",
    maxLines: Int = 1,
    singleLine: Boolean = true,
    keyboardType: KeyboardType = KeyboardType.Text
) {
    Column(modifier = modifier) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelMedium.withDMSansRegular()
                    )
                    if (isRequired) {
                        Text(
                            text = " *",
                            color = Color.Red,
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                }
            },
            placeholder = {
                if (placeholder.isNotEmpty()) {
                    Text(
                        text = placeholder,
                        style = MaterialTheme.typography.bodyMedium.withDMSansRegular(),
                        color = Color.Gray
                    )
                }
            },
            enabled = enabled,
            singleLine = singleLine,
            maxLines = maxLines,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF333D79),
                focusedLabelColor = Color(0xFF333D79),
                cursorColor = Color(0xFF333D79),
                disabledBorderColor = Color(0xFFE0E0E0),
                disabledTextColor = Color.Gray,
                disabledLabelColor = Color.Gray
            ),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth()
        )

        if (helperText.isNotEmpty()) {
            Text(
                text = helperText,
                style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                color = if (enabled) Color.Gray else Color.Gray.copy(alpha = 0.6f),
                modifier = Modifier.padding(start = 16.dp, top = 4.dp)
            )
        }
    }
}

@Composable
fun AccountSettingsContent(
    profile: com.example.vocalyxapk.models.UserProfile?
) {
    Column(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // Account Information Notice
        Card(
            colors = CardDefaults.cardColors(
                containerColor = Color(0xFFEEF0F8)
            ),
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, Color(0xFFDCE3F9))
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.Top
            ) {
                Icon(
                    imageVector = Icons.Filled.Info,
                    contentDescription = null,
                    tint = Color(0xFF333D79),
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "Account Information",
                        style = MaterialTheme.typography.titleSmall.withDMSansBold(),
                        color = Color(0xFF333D79)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "You signed up using ${
                            when {
                                profile?.has_google == true -> "Google"
                                profile?.has_microsoft == true -> "Microsoft"
                                else -> "Email"
                            }
                        } authentication. Some account settings may be managed through your authentication provider.",
                        style = MaterialTheme.typography.bodySmall.withDMSansRegular(),
                        color = Color(0xFF666666)
                    )
                }
            }
        }

        // Email Address Section
        Column {
            Text(
                text = "Email Address",
                style = MaterialTheme.typography.titleSmall.withDMSansMedium(),
                color = Color(0xFF666666),
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Color(0xFFE0E0E0)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFEEF0F8)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Email,
                                contentDescription = null,
                                tint = Color(0xFF333D79),
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = profile?.email ?: "",
                                style = MaterialTheme.typography.bodyMedium.withDMSansMedium(),
                                color = Color(0xFF333333)
                            )
                            Text(
                                text = "Primary email",
                                style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                                color = Color.Gray
                            )
                        }
                    }

                    Surface(
                        color = Color(0xFFE8F5E9),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = "Verified",
                            style = MaterialTheme.typography.labelSmall.withDMSansMedium(),
                            color = Color(0xFF4CAF50),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }

        // Connected Accounts Section
        Column {
            Text(
                text = "Connected Accounts",
                style = MaterialTheme.typography.titleSmall.withDMSansMedium(),
                color = Color(0xFF666666),
                modifier = Modifier.padding(bottom = 8.dp)
            )

            // Google Account
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Color(0xFFE0E0E0)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFEEF0F8)),
                            contentAlignment = Alignment.Center
                        ) {
                            // Google icon placeholder
                            Text(
                                text = "G",
                                style = MaterialTheme.typography.titleMedium.withDMSansBold(),
                                color = Color(0xFF333D79)
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = "Google",
                                style = MaterialTheme.typography.bodyMedium.withDMSansMedium(),
                                color = Color(0xFF333333)
                            )
                            Text(
                                text = if (profile?.has_google == true) "Connected" else "Not connected",
                                style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                                color = Color.Gray
                            )
                        }
                    }

                    OutlinedButton(
                        onClick = { /* TODO: Implement connect/disconnect */ },
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = if (profile?.has_google == true) Color(0xFFE53935) else Color(0xFF333D79)
                        ),
                        border = BorderStroke(
                            1.dp,
                            if (profile?.has_google == true) Color(0xFFFFCDD2) else Color(0xFFEEF0F8)
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = if (profile?.has_google == true) "Disconnect" else "Connect",
                            style = MaterialTheme.typography.labelSmall.withDMSansMedium()
                        )
                    }
                }
            }

            // Microsoft Account
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Color(0xFFE0E0E0)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFEEF0F8)),
                            contentAlignment = Alignment.Center
                        ) {
                            // Microsoft icon placeholder
                            Text(
                                text = "M",
                                style = MaterialTheme.typography.titleMedium.withDMSansBold(),
                                color = Color(0xFF333D79)
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = "Microsoft",
                                style = MaterialTheme.typography.bodyMedium.withDMSansMedium(),
                                color = Color(0xFF333333)
                            )
                            Text(
                                text = if (profile?.has_microsoft == true) "Connected" else "Not connected",
                                style = MaterialTheme.typography.labelSmall.withDMSansRegular(),
                                color = Color.Gray
                            )
                        }

                        OutlinedButton(
                            onClick = { /* TODO: Implement connect/disconnect */ },
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = if (profile?.has_microsoft == true) Color(0xFFE53935) else Color(0xFF333D79)
                            ),
                            border = BorderStroke(
                                1.dp,
                                if (profile?.has_microsoft == true) Color(0xFFFFCDD2) else Color(0xFFEEF0F8)
                            ),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = if (profile?.has_microsoft == true) "Disconnect" else "Connect",
                                style = MaterialTheme.typography.labelSmall.withDMSansMedium()
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileInformationContent(
    profile: com.example.vocalyxapk.models.UserProfile?,
    formData: com.example.vocalyxapk.viewmodel.ProfileFormData,
    isEditing: Boolean,
    isSubmitting: Boolean,
    onFormFieldChange: (String, String) -> Unit,
    onSave: () -> Unit,
    onCancel: () -> Unit,
    onEdit: () -> Unit
) {
    Column(
        modifier = Modifier.padding(16.dp)
    ) {
        if (isEditing) {
            // Edit Form
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // First Name & Last Name Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    ProfileTextField(
                        label = "First Name",
                        value = formData.firstName,
                        onValueChange = { onFormFieldChange("firstName", it) },
                        modifier = Modifier.weight(1f),
                        isRequired = true
                    )

                    ProfileTextField(
                        label = "Last Name",
                        value = formData.lastName,
                        onValueChange = { onFormFieldChange("lastName", it) },
                        modifier = Modifier.weight(1f),
                        isRequired = true
                    )
                }

                // Email (disabled)
                ProfileTextField(
                    label = "Email",
                    value = formData.email,
                    onValueChange = { },
                    enabled = false,
                    helperText = "Email cannot be changed"
                )

                // Institution & Position Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    ProfileTextField(
                        label = "Institution",
                        value = formData.institution,
                        onValueChange = { onFormFieldChange("institution", it) },
                        modifier = Modifier.weight(1f),
                        placeholder = "University or School"
                    )

                    ProfileTextField(
                        label = "Position",
                        value = formData.position,
                        onValueChange = { onFormFieldChange("position", it) },
                        modifier = Modifier.weight(1f),
                        placeholder = "Teacher, Professor, Student"
                    )
                }

                // Bio
                ProfileTextField(
                    label = "Bio",
                    value = formData.bio,
                    onValueChange = { onFormFieldChange("bio", it) },
                    placeholder = "Tell us about yourself",
                    maxLines = 4,
                    singleLine = false
                )

                // Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    OutlinedButton(
                        onClick = onCancel,
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color.Gray
                        ),
                        border = BorderStroke(1.dp, Color.Gray)
                    ) {
                        Text(
                            text = "Cancel",
                            style = MaterialTheme.typography.labelMedium.withDMSansMedium()
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Button(
                        onClick = onSave,
                        enabled = !isSubmitting && formData.firstName.isNotBlank() && formData.lastName.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF333D79),
                            disabledContainerColor = Color.Gray.copy(alpha = 0.3f)
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Saving...",
                                style = MaterialTheme.typography.labelMedium.withDMSansMedium()
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Filled.Save,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Save Changes",
                                style = MaterialTheme.typography.labelMedium.withDMSansMedium()
                            )
                        }
                    }
                }
            }
        } else {
            // View Mode
            Column(
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Personal Information
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    ProfileInfoField(
                        label = "First Name",
                        value = profile?.first_name ?: formData.firstName,
                        modifier = Modifier.weight(1f)
                    )

                    ProfileInfoField(
                        label = "Last Name",
                        value = profile?.last_name ?: formData.lastName,
                        modifier = Modifier.weight(1f)
                    )
                }

                ProfileInfoField(
                    label = "Email",
                    value = profile?.email ?: formData.email
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    ProfileInfoField(
                        label = "Institution",
                        value = profile?.institution ?: formData.institution,
                        modifier = Modifier.weight(1f)
                    )

                    ProfileInfoField(
                        label = "Position",
                        value = profile?.position ?: formData.position,
                        modifier = Modifier.weight(1f)
                    )
                }

                ProfileInfoField(
                    label = "Bio",
                    value = profile?.bio ?: formData.bio.takeIf { it.isNotBlank() } ?: "No bio provided yet."
                )

                // Edit Button
                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = onEdit,
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color(0xFF333D79)
                    ),
                    border = BorderStroke(1.dp, Color(0xFF333D79)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Edit,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Edit Profile",
                        style = MaterialTheme.typography.labelMedium.withDMSansMedium()
                    )
                }
            }
        }
    }
}


