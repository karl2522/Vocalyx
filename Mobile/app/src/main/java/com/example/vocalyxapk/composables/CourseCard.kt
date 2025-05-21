package com.example.vocalyxapk.composables

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.rounded.School
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.vocalyxapk.models.CourseItem

@Composable
fun CourseCard(
    courseData: CourseItem,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {},
    onStatusChange: (String) -> Unit = {},
    onDelete: () -> Unit = {},
    onEdit: () -> Unit = {}
) {
    var showMenu by remember { mutableStateOf(false) }
    var showDeleteConfirmation by remember { mutableStateOf(false) }
    val context = LocalContext.current

    if (showDeleteConfirmation) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirmation = false },
            title = { Text("Delete Course") },
            text = { Text("Are you sure you want to delete the course '${courseData.name}'? This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteConfirmation = false
                        onDelete()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showDeleteConfirmation = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .height(160.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        colors = CardDefaults.cardColors(
            containerColor = when(courseData.status) {
                "active" -> Color(0xFFE8F5E9)  // Light green for active
                "completed" -> Color(0xFFE3F2FD)  // Light blue for completed
                "archived" -> Color(0xFFF5F5F5)  // Light grey for archived
                else -> Color.White
            }
        )
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Top row with course code and status
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Course code and status
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = courseData.courseCode,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF333D79)
                        )

                        Spacer(modifier = Modifier.width(12.dp))

                        // Status badge
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .background(
                                    color = when(courseData.status) {
                                        "active" -> Color(0xFF4CAF50).copy(alpha = 0.2f)
                                        "completed" -> Color(0xFF2196F3).copy(alpha = 0.2f)
                                        "archived" -> Color(0xFF9E9E9E).copy(alpha = 0.2f)
                                        else -> Color(0xFF333D79).copy(alpha = 0.2f)
                                    },
                                    shape = RoundedCornerShape(50)
                                )
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(
                                        color = when(courseData.status) {
                                            "active" -> Color(0xFF4CAF50)
                                            "completed" -> Color(0xFF2196F3)
                                            "archived" -> Color(0xFF9E9E9E)
                                            else -> Color(0xFF333D79)
                                        },
                                        shape = CircleShape
                                    )
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = courseData.status?.replaceFirstChar { it.uppercase() } ?: "Active",
                                style = MaterialTheme.typography.labelSmall,
                                color = when(courseData.status) {
                                    "active" -> Color(0xFF1B5E20)
                                    "completed" -> Color(0xFF0D47A1)
                                    "archived" -> Color(0xFF616161)
                                    else -> Color(0xFF333D79)
                                }
                            )
                        }
                    }
                }

                // Course title and description
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
                    Text(
                        text = courseData.name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333D79),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    if (!courseData.description.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = courseData.description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF666666),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Bottom row with semester/academic year and class count
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Semester and Academic Year
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Event,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = Color(0xFF666666)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${courseData.semester}${if (!courseData.academic_year.isNullOrBlank()) " • ${courseData.academic_year}" else ""}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF666666)
                        )
                    }

                    // Class count
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Group,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = Color(0xFF666666)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${courseData.classes_count ?: 0} classes",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF666666)
                        )
                    }
                }
            }

            // Three dots menu
            IconButton(
                onClick = { showMenu = true },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
            ) {
                Icon(
                    Icons.Default.MoreVert,
                    contentDescription = "More options",
                    tint = Color(0xFF333D79)
                )

                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false }
                ) {
                    // Edit option
                    DropdownMenuItem(
                        text = { Text("Edit") },
                        leadingIcon = { Icon(Icons.Default.Edit, null) },
                        onClick = {
                            showMenu = false
                            onEdit()
                        }
                    )

                    // Change status options based on current status
                    if (courseData.status != "active") {
                        DropdownMenuItem(
                            text = { Text("Mark as Active") },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Color(0xFF4CAF50)
                                )
                            },
                            onClick = {
                                showMenu = false
                                onStatusChange("active")
                            }
                        )
                    }

                    if (courseData.status != "completed") {
                        DropdownMenuItem(
                            text = { Text("Mark as Completed") },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Done,
                                    contentDescription = null,
                                    tint = Color(0xFF2196F3)
                                )
                            },
                            onClick = {
                                showMenu = false
                                onStatusChange("completed")
                            }
                        )
                    }

                    if (courseData.status != "archived") {
                        DropdownMenuItem(
                            text = { Text("Archive") },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Archive,
                                    contentDescription = null,
                                    tint = Color(0xFF9E9E9E)
                                )
                            },
                            onClick = {
                                showMenu = false
                                onStatusChange("archived")
                            }
                        )
                    }

                    Divider()

                    // Delete option
                    DropdownMenuItem(
                        text = { Text("Delete", color = Color.Red) },
                        leadingIcon = {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = null,
                                tint = Color.Red
                            )
                        },
                        onClick = {
                            showMenu = false
                            showDeleteConfirmation = true
                        }
                    )
                }
            }
        }
    }
}
