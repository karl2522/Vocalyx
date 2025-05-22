package com.example.vocalyxapk.composables

import android.content.Intent
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.CalendarViewDay
import androidx.compose.material.icons.filled.CalendarViewWeek
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.vocalyxapk.MyClassesActivity
import com.example.vocalyxapk.models.ClassItem
import com.example.vocalyxapk.models.CourseItem
import com.example.vocalyxapk.viewmodel.ClassUIState
import com.example.vocalyxapk.viewmodel.ClassViewModel
import com.example.vocalyxapk.viewmodel.CourseUIState
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@Composable
fun ScheduleTab(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val classViewModel: ClassViewModel = viewModel()
    val courseUIState by classViewModel.courseUIState.collectAsState()
    val classUIState by classViewModel.classUIState.collectAsState()


    // State for the schedule view
    var viewType by remember { mutableStateOf("week") }
    var currentDate by remember { mutableStateOf(Calendar.getInstance()) }
    var selectedCourseId by remember { mutableStateOf<Int?>(null) }
    var selectedClassId by remember { mutableStateOf<Int?>(null) }
    var showCourseDropdown by remember { mutableStateOf(false) }
    var showClassDropdown by remember { mutableStateOf(false) }
    val statusBarHeight = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()

    // Time slots - 30-minute increments
    val timeSlots = remember {
        listOf(
            TimeSlot("07:30 AM", "07:30"),
            TimeSlot("08:00 AM", "08:00"),
            TimeSlot("08:30 AM", "08:30"),
            TimeSlot("09:00 AM", "09:00"),
            TimeSlot("09:30 AM", "09:30"),
            TimeSlot("10:00 AM", "10:00"),
            TimeSlot("10:30 AM", "10:30"),
            TimeSlot("11:00 AM", "11:00"),
            TimeSlot("11:30 AM", "11:30"),
            TimeSlot("12:00 PM", "12:00"),
            TimeSlot("12:30 PM", "12:30"),
            TimeSlot("01:00 PM", "13:00"),
            TimeSlot("01:30 PM", "13:30"),
            TimeSlot("02:00 PM", "14:00"),
            TimeSlot("02:30 PM", "14:30"),
            TimeSlot("03:00 PM", "15:00"),
            TimeSlot("03:30 PM", "15:30"),
            TimeSlot("04:00 PM", "16:00"),
            TimeSlot("04:30 PM", "16:30"),
            TimeSlot("05:00 PM", "17:00"),
            TimeSlot("05:30 PM", "17:30"),
            TimeSlot("06:00 PM", "18:00"),
            TimeSlot("06:30 PM", "18:30"),
            TimeSlot("07:00 PM", "19:00"),
            TimeSlot("07:30 PM", "19:30"),
            TimeSlot("08:00 PM", "20:00"),
            TimeSlot("08:30 PM", "20:30"),
            TimeSlot("09:00 PM", "21:00")
        )
    }

    // Day names
    val dayNames = remember { listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat") }

    // Scheduled times state
    val scheduledTimes = remember { mutableStateListOf<ScheduledTimeSlot>() }

    // Get courses from state
    val courses = when (courseUIState) {
        is CourseUIState.Success -> (courseUIState as CourseUIState.Success).courses
        else -> emptyList()
    }

    val classes = when (classUIState) {
        is ClassUIState.Success -> (classUIState as ClassUIState.Success).classes
        else -> emptyList()
    }

    // Selected course and class
    val selectedCourse = courses.find { it.id == selectedCourseId }
    val selectedClass = classes.find { it.id == selectedClassId }

    // Parse a class schedule (like "M,W,F 1:30 - 3:00 PM")
    fun parseSchedule(schedule: String?) {
        scheduledTimes.clear()

        if (schedule.isNullOrBlank()) return

        try {
            // Parse days (M,W,F)
            val parts = schedule.split(" ")
            if (parts.size < 3) return

            val daysStr = parts[0]
            val days = mutableListOf<Int>()

            if (daysStr.contains("M")) days.add(1) // Monday (1)
            if (daysStr.contains("T") && !daysStr.contains("Th")) days.add(2) // Tuesday (2)
            if (daysStr.contains("W")) days.add(3) // Wednesday (3)
            if (daysStr.contains("Th")) days.add(4) // Thursday (4)
            if (daysStr.contains("F")) days.add(5) // Friday (5)
            if (daysStr.contains("Sa")) days.add(6) // Saturday (6)
            if (daysStr.contains("Su")) days.add(0) // Sunday (0)

            // Parse times
            val startTimeStr = parts[1]
            val dashIndex = schedule.indexOf('-')
            val endTimeStr = if (dashIndex != -1) {
                schedule.substring(dashIndex + 1).trim().split(" ")[0].trim()
            } else {
                parts[2]
            }

            val isPM = schedule.uppercase().contains("PM")

            // Convert to minutes
            val startTime = convertToMinutes(startTimeStr, isPM)
            val endTime = convertToMinutes(endTimeStr, isPM)

            // Generate all slots
            days.forEach { day ->
                var minutes = startTime
                while (minutes < endTime) {
                    val hour = minutes / 60
                    val minute = minutes % 60
                    scheduledTimes.add(ScheduledTimeSlot(day, hour, minute))
                    minutes += 30
                }
            }

        } catch (e: Exception) {
            android.util.Log.e("ScheduleTab", "Error parsing schedule: ${e.message}")
        }
    }

    // Check if a time slot is scheduled
    fun isTimeSlotScheduled(dayIndex: Int, timeSlot: TimeSlot): Boolean {
        val (hours, minutes) = timeSlot.value.split(':').map { it.toInt() }
        return scheduledTimes.any {
            it.day == dayIndex && it.hour == hours && it.minute == minutes
        }
    }

    // Navigation functions
    fun goToPrevious() {
        val newDate = Calendar.getInstance().apply { time = currentDate.time }
        when (viewType) {
            "day" -> newDate.add(Calendar.DAY_OF_MONTH, -1)
            "week" -> newDate.add(Calendar.WEEK_OF_YEAR, -1)
            else -> newDate.add(Calendar.MONTH, -1)
        }
        currentDate = newDate
    }

    fun goToNext() {
        val newDate = Calendar.getInstance().apply { time = currentDate.time }
        when (viewType) {
            "day" -> newDate.add(Calendar.DAY_OF_MONTH, 1)
            "week" -> newDate.add(Calendar.WEEK_OF_YEAR, 1)
            else -> newDate.add(Calendar.MONTH, 1)
        }
        currentDate = newDate
    }

    fun goToToday() {
        currentDate = Calendar.getInstance()
    }

    // Format date range
    fun formatDateRange(): String {
        val dateFormat = SimpleDateFormat("MMMM d, yyyy", Locale.getDefault())
        val shortDateFormat = SimpleDateFormat("MMM d", Locale.getDefault())

        return when (viewType) {
            "day" -> dateFormat.format(currentDate.time)
            "week" -> {
                val startOfWeek = Calendar.getInstance().apply {
                    time = currentDate.time
                    set(Calendar.DAY_OF_WEEK, Calendar.SUNDAY)
                }
                val endOfWeek = Calendar.getInstance().apply {
                    time = startOfWeek.time
                    add(Calendar.DAY_OF_MONTH, 6)
                }

                val startMonth = SimpleDateFormat("MMMM", Locale.getDefault()).format(startOfWeek.time)
                val endMonth = SimpleDateFormat("MMMM", Locale.getDefault()).format(endOfWeek.time)

                if (startMonth == endMonth) {
                    "$startMonth ${startOfWeek.get(Calendar.DAY_OF_MONTH)} - ${endOfWeek.get(Calendar.DAY_OF_MONTH)}, ${endOfWeek.get(Calendar.YEAR)}"
                } else {
                    "${shortDateFormat.format(startOfWeek.time)} - ${dateFormat.format(endOfWeek.time)}"
                }
            }
            else -> SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(currentDate.time)
        }
    }

    LaunchedEffect(selectedClass) {
        selectedClass?.schedule?.let { schedule ->
            parseSchedule(schedule)
        } ?: run {
            scheduledTimes.clear()
        }
    }

    LaunchedEffect(selectedCourseId) {
        if (selectedCourseId != null) {
            classViewModel.fetchClassesForCourse(selectedCourseId!!)
        }
    }

    LaunchedEffect(Unit) {
        classViewModel.fetchCourses()
        parseSchedule("M,W,F 1:30 - 3:00 PM")
    }

    // UI
    Scaffold(
        modifier = modifier.fillMaxSize()
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(
                top = statusBarHeight + 8.dp,
                bottom = 24.dp
            )
        ) {
            item {
                // Header
                ScheduleHeader(
                    viewType = viewType,
                    onViewTypeChange = { viewType = it },
                    modifier = Modifier.padding(16.dp)
                )

                // Course Selection
                CourseSelectionPanel(
                    selectedCourse = selectedCourse,
                    selectedClass = selectedClass,
                    courses = courses,
                    classes = classes,
                    onCourseSelected = { course ->
                        selectedCourseId = course.id
                        selectedClassId = null
                        showCourseDropdown = false
                    },
                    onClassSelected = { classItem ->
                        selectedClassId = classItem.id
                        showClassDropdown = false
                    },
                    showCourseDropdown = showCourseDropdown,
                    onCourseDropdownToggle = { showCourseDropdown = it },
                    showClassDropdown = showClassDropdown,
                    onClassDropdownToggle = { showClassDropdown = it },
                    onClearSelection = {
                        selectedCourseId = null
                        selectedClassId = null
                    },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )

                // Date Navigation
                DateNavigationBar(
                    dateRange = formatDateRange(),
                    onPrevious = { goToPrevious() },
                    onNext = { goToNext() },
                    onToday = { goToToday() },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )

                // Schedule Grid or Empty State
                if (selectedClass != null) {
                    ScheduleGrid(
                        dayNames = dayNames,
                        timeSlots = timeSlots,
                        isTimeSlotScheduled = { day, timeSlot -> isTimeSlotScheduled(day, timeSlot) },
                        selectedClass = selectedClass,
                        modifier = Modifier.padding(16.dp)
                    )

                    // Class Details
                    ClassScheduleDetails(
                        selectedCourse = selectedCourse,
                        selectedClass = selectedClass,
                        modifier = Modifier.padding(16.dp)
                    )
                } else {
                    EmptyScheduleState(
                        selectedCourse = selectedCourse,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleHeader(
    viewType: String,
    onViewTypeChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF0F4FF)
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(
                            color = Color(0xFF333D79),
                            shape = RoundedCornerShape(12.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = "Schedule",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF333D79)
                    )
                    Text(
                        text = "Manage your classes and events",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666)
                    )
                }
            }

            // Improved SegmentedButtons with better spacing and widths
            SingleChoiceSegmentedButtonRow(
                modifier = Modifier
                    .align(Alignment.End)
                    .fillMaxWidth(0.8f) // Use 80% of available width
            ) {
                // Day Button
                SegmentedButton(
                    selected = viewType == "day",
                    onClick = { onViewTypeChange("day") },
                    shape = SegmentedButtonDefaults.itemShape(index = 0, count = 3),
                    colors = SegmentedButtonDefaults.colors(
                        activeContainerColor = Color(0xFF333D79),
                        activeBorderColor = Color(0xFF333D79),
                        inactiveContainerColor = Color.White
                    ),
                    modifier = Modifier.weight(1f) // Equal weight for all buttons
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(horizontal = 4.dp)
                    ) {
                        Icon(
                            Icons.Default.CalendarViewDay,
                            contentDescription = "Day View",
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp)) // More spacing
                        Text(
                            "Day",
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Visible
                        )
                    }
                }

                // Week Button
                SegmentedButton(
                    selected = viewType == "week",
                    onClick = { onViewTypeChange("week") },
                    shape = SegmentedButtonDefaults.itemShape(index = 1, count = 3),
                    colors = SegmentedButtonDefaults.colors(
                        activeContainerColor = Color(0xFF333D79),
                        activeBorderColor = Color(0xFF333D79),
                        inactiveContainerColor = Color.White
                    ),
                    modifier = Modifier.weight(1f) // Equal weight for all buttons
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(horizontal = 4.dp)
                    ) {
                        Icon(
                            Icons.Default.CalendarViewWeek,
                            contentDescription = "Week View",
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp)) // More spacing
                        Text(
                            "Week",
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Visible
                        )
                    }
                }

                // Month Button
                SegmentedButton(
                    selected = viewType == "month",
                    onClick = { onViewTypeChange("month") },
                    shape = SegmentedButtonDefaults.itemShape(index = 2, count = 3),
                    colors = SegmentedButtonDefaults.colors(
                        activeContainerColor = Color(0xFF333D79),
                        activeBorderColor = Color(0xFF333D79),
                        inactiveContainerColor = Color.White
                    ),
                    modifier = Modifier.weight(1f) // Equal weight for all buttons
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(horizontal = 4.dp)
                    ) {
                        Icon(
                            Icons.Default.CalendarMonth,
                            contentDescription = "Month View",
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp)) // More spacing
                        Text(
                            "Month",
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Visible
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CourseSelectionPanel(
    selectedCourse: CourseItem?,
    selectedClass: ClassItem?,
    courses: List<CourseItem>,
    classes: List<ClassItem>,
    onCourseSelected: (CourseItem) -> Unit,
    onClassSelected: (ClassItem) -> Unit,
    showCourseDropdown: Boolean,
    onCourseDropdownToggle: (Boolean) -> Unit,
    showClassDropdown: Boolean,
    onClassDropdownToggle: (Boolean) -> Unit,
    onClearSelection: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        ),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                "Select Course and Class",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF333D79)
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    "Course:",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF666666)
                )

                Spacer(modifier = Modifier.width(8.dp))

                Box(modifier = Modifier.weight(1f)) {
                    OutlinedButton(
                        onClick = { onCourseDropdownToggle(!showCourseDropdown) },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            selectedCourse?.name ?: "Select a course",
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Icon(
                            Icons.Filled.KeyboardArrowDown,
                            contentDescription = "Select course"
                        )
                    }

                    DropdownMenu(
                        expanded = showCourseDropdown,
                        onDismissRequest = { onCourseDropdownToggle(false) },
                        modifier = Modifier
                            .background(Color.White)
                            .width(300.dp)
                    ) {
                        if (courses.isEmpty()) {
                            DropdownMenuItem(
                                text = { Text("No courses available") },
                                onClick = { }
                            )
                        } else {
                            courses.forEach { course ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            course.name,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = if (course.id == selectedCourse?.id)
                                                Color(0xFF333D79)
                                            else
                                                Color(0xFF333333)
                                        )
                                    },
                                    onClick = { onCourseSelected(course) }
                                )
                            }
                        }
                    }
                }
            }

            if (selectedCourse != null) {
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        "Class:",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF666666)
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    Box(modifier = Modifier.weight(1f)) {
                        OutlinedButton(
                            onClick = { onClassDropdownToggle(!showClassDropdown) },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                selectedClass?.name ?: "Select a class",
                                maxLines = 1,
                                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )
                            Icon(
                                Icons.Filled.KeyboardArrowDown,
                                contentDescription = "Select class"
                            )
                        }

                        DropdownMenu(
                            expanded = showClassDropdown,
                            onDismissRequest = { onClassDropdownToggle(false) },
                            modifier = Modifier
                                .background(Color.White)
                                .width(300.dp)
                        ) {
                            if (classes.isEmpty()) {
                                DropdownMenuItem(
                                    text = { Text("No classes available") },
                                    onClick = { }
                                )
                            } else {
                                classes.forEach { classItem ->
                                    DropdownMenuItem(
                                        text = {
                                            Column {
                                                Text(
                                                    classItem.name,
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    fontWeight = FontWeight.Medium
                                                )
                                                Text(
                                                    "Section ${classItem.section ?: "A"} • ${classItem.schedule ?: "No schedule"}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = Color(0xFF666666)
                                                )
                                            }
                                        },
                                        onClick = { onClassSelected(classItem) }
                                    )
                                }
                            }
                        }
                    }
                }
            }

            if (selectedCourse != null || selectedClass != null) {
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(
                    onClick = { onClearSelection() },
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text(
                        "Clear Selection",
                        color = Color(0xFFD32F2F),
                        style = MaterialTheme.typography.labelMedium
                    )
                }
            }
        }
    }
}

@Composable
fun DateNavigationBar(
    dateRange: String,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onToday: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = onPrevious) {
                Icon(
                    Icons.Default.ChevronLeft,
                    contentDescription = "Previous",
                    tint = Color(0xFF333D79)
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = dateRange,
                    fontWeight = FontWeight.Medium,
                    style = MaterialTheme.typography.titleMedium
                )

                Spacer(modifier = Modifier.width(8.dp))

                TextButton(onClick = onToday) {
                    Text(
                        "Today",
                        color = Color(0xFF333D79)
                    )
                }
            }

            IconButton(onClick = onNext) {
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = "Next",
                    tint = Color(0xFF333D79)
                )
            }
        }
    }
}

@Composable
fun ScheduleGrid(
    dayNames: List<String>,
    timeSlots: List<TimeSlot>,
    isTimeSlotScheduled: (Int, TimeSlot) -> Boolean,
    selectedClass: ClassItem?,
    modifier: Modifier = Modifier
) {
    // Track fullscreen state
    var isFullScreen by remember { mutableStateOf(false) }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Header with schedule info and fullscreen toggle
            if (selectedClass?.schedule != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "${selectedClass.name} meets ${selectedClass.schedule}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier
                            .weight(1f)
                            .background(Color(0xFFF5F5F5), RoundedCornerShape(8.dp))
                            .padding(12.dp),
                        textAlign = TextAlign.Center,
                        color = Color(0xFF333D79)
                    )

                    // Fullscreen toggle button
                    IconButton(
                        onClick = { isFullScreen = !isFullScreen },
                        modifier = Modifier.padding(start = 8.dp)
                    ) {
                        Icon(
                            imageVector = if (isFullScreen)
                                Icons.Default.KeyboardArrowDown
                            else
                                Icons.Default.KeyboardArrowDown,
                            contentDescription = if (isFullScreen) "Exit fullscreen" else "Enter fullscreen",
                            tint = Color(0xFF333D79)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
            ) {
                Column {
                    Row(modifier = Modifier.width(800.dp)) {
                        Box(
                            modifier = Modifier
                                .width(80.dp)
                                .height(40.dp)
                                .background(Color(0xFFF8F9FA), RoundedCornerShape(topStart = 8.dp))
                                .border(0.5.dp, Color(0xFFDDDDDD), RoundedCornerShape(topStart = 8.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Time",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        dayNames.forEach { day ->
                            Box(
                                modifier = Modifier
                                    .width(103.dp)
                                    .height(40.dp)
                                    .background(Color(0xFFF8F9FA))
                                    .border(0.5.dp, Color(0xFFDDDDDD)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = day,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }

                    val relevantTimeSlots = if (selectedClass?.schedule != null) {
                        val scheduleStr = selectedClass.schedule
                        val startTimeIndex = timeSlots.indexOfFirst {
                            scheduleStr.contains(it.display) || scheduleStr.contains(it.value)
                        }

                        if (startTimeIndex >= 0) {
                            val startIdx = maxOf(0, startTimeIndex - 2)
                            val endIdx = minOf(timeSlots.size - 1, startTimeIndex + 6)
                            timeSlots.subList(startIdx, endIdx + 1)
                        } else {
                            timeSlots.filter {
                                it.value.startsWith("11:") ||
                                        it.value.startsWith("12:") ||
                                        it.value.startsWith("13:") ||
                                        it.value.startsWith("14:") ||
                                        it.value.startsWith("15:")
                            }
                        }
                    } else {
                        timeSlots.filter {
                            it.value.startsWith("11:") ||
                                    it.value.startsWith("12:") ||
                                    it.value.startsWith("13:") ||
                                    it.value.startsWith("14:") ||
                                    it.value.startsWith("15:")
                        }
                    }

                    // Dynamic height based on fullscreen state
                    Column(
                        // Use animateContentSize to smoothly animate between heights
                        modifier = Modifier
                            .height(if (isFullScreen) 550.dp else 350.dp)
                            .animateContentSize(
                                animationSpec = spring(
                                    dampingRatio = Spring.DampingRatioMediumBouncy,
                                    stiffness = Spring.StiffnessLow
                                )
                            )
                    ) {
                        relevantTimeSlots.forEach { timeSlot ->
                            Row(modifier = Modifier.width(800.dp)) {
                                Box(
                                    modifier = Modifier
                                        .width(80.dp)
                                        .height(50.dp)
                                        .background(Color(0xFFE6EAFF))
                                        .border(0.5.dp, Color(0xFFDDDDDD)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = timeSlot.display,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color(0xFF666666)
                                    )
                                }

                                // Day cells
                                for (dayIndex in 0..6) {
                                    val isScheduled = isTimeSlotScheduled(dayIndex, timeSlot)
                                    Box(
                                        modifier = Modifier
                                            .width(103.dp)
                                            .height(50.dp)
                                            .background(
                                                if (isScheduled) Color(0xFF333D79) else Color.White
                                            )
                                            .border(0.5.dp, Color(0xFFDDDDDD)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (isScheduled) {
                                            val prevTimeSlotValue = relevantTimeSlots.getOrNull(
                                                relevantTimeSlots.indexOf(timeSlot) - 1
                                            )?.value

                                            val isPrevScheduled = prevTimeSlotValue?.let {
                                                isTimeSlotScheduled(dayIndex, TimeSlot("", it))
                                            } ?: false

                                            if (!isPrevScheduled) {
                                                Text(
                                                    text = selectedClass?.name ?: "",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = Color.White,
                                                    maxLines = 1,
                                                    textAlign = TextAlign.Center,
                                                    modifier = Modifier.padding(horizontal = 4.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Swipe horizontally to see all days",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF666666),
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = " • ${if (isFullScreen) "Minimize" else "Expand"} view",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF333D79),
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun ClassScheduleDetails(
    selectedCourse: CourseItem?,
    selectedClass: ClassItem?,
    modifier: Modifier = Modifier
) {

    val context = LocalContext.current

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 12.dp)
            ) {
                Icon(
                    Icons.Default.Schedule,
                    contentDescription = null,
                    tint = Color(0xFF333D79),
                    modifier = Modifier.size(24.dp)
                )

                Spacer(modifier = Modifier.width(8.dp))

                Text(
                    "Schedule Details",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF333333)
                )
            }

            Divider(
                modifier = Modifier.padding(vertical = 8.dp),
                color = Color(0xFFEEEEEE)
            )

            DetailRow("Course", selectedCourse?.name ?: "")
            DetailRow("Class", selectedClass?.name ?: "")
            DetailRow("Section", selectedClass?.section ?: "")
            DetailRow("Schedule", selectedClass?.schedule ?: "Not specified")
            DetailRow("Students", "${selectedClass?.student_count ?: 0}")

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedButton(
                onClick = {
                    if (selectedClass != null) {
                        val intent = Intent(context, MyClassesActivity::class.java).apply {
                            putExtra("CLASS_ID", selectedClass.id)
                            putExtra("CLASS_NAME", selectedClass.name)
                            putExtra("COURSE_ID", selectedClass.courseId)
                            putExtra("COURSE_NAME", selectedCourse?.name)
                        }
                        context.startActivity(intent)
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("View Class Details")
            }
        }
    }
}

@Composable
fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = "$label:",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF666666)
        )

        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
fun EmptyScheduleState(
    selectedCourse: CourseItem?,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .height(200.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFF)),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Default.School,
                contentDescription = null,
                tint = Color(0xFF333D79).copy(alpha = 0.5f),
                modifier = Modifier.size(48.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = selectedCourse?.let { "Select a Class" } ?: "Select a Course",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF333333)
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = selectedCourse?.let {
                    "Please select a class to view its schedule"
                } ?: "Please select a course to view its classes' schedules",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF666666),
                textAlign = TextAlign.Center
            )
        }
    }
}

data class TimeSlot(val display: String, val value: String)
data class ScheduledTimeSlot(val day: Int, val hour: Int, val minute: Int)

fun convertToMinutes(timeStr: String, isPM: Boolean): Int {
    val cleanTime = timeStr.replace(Regex("[^\\d:]"), "")
    val parts = cleanTime.split(":")

    var hours = if (parts.isNotEmpty()) parts[0].toIntOrNull() ?: 0 else 0
    val minutes = if (parts.size > 1) parts[1].toIntOrNull() ?: 0 else 0

    if (isPM && hours < 12) {
        hours += 12
    }
    if (!isPM && hours == 12) {
        hours = 0
    }

    return (hours * 60) + minutes
}