# Vocalyx Frontend: Courses & Classes Implementation Documentation

## Overview

This document provides a detailed explanation of the frontend implementation for the Courses and Classes system in the Vocalyx application. It explains the component structure, data flow, state management, and API interactions to help backend developers understand how to build compatible API endpoints and data structures.

## System Structure

The application implements a hierarchical structure where:

- **Courses** are the top-level entities that contain Classes
- **Classes** belong to Courses and contain student data

## Data Models

### Course Model

The frontend uses the following structure for Course objects:

```javascript
{
  id: String,              // Unique identifier
  name: String,            // Course name (e.g., "Introduction to Programming")
  courseCode: String,      // Course code (e.g., "CS101")
  description: String,     // Course description
  semester: String,        // Semester (Fall, Spring, Summer, Winter)
  academic_year: String,   // Academic year (e.g., "2023-2024")
  status: String,          // Status (active, completed, archived)
  created_at: Date,        // Creation timestamp
  updated_at: Date,        // Last update timestamp
  classes_count: Number    // Number of classes in this course
}
```

### Class Model

The frontend uses the following structure for Class objects:

```javascript
{
  id: String,              // Unique identifier
  name: String,            // Class name
  section: String,         // Section identifier (e.g., "A", "B")
  student_count: Number,   // Number of students
  schedule: String,        // Class schedule (e.g., "M,W,F 1:30 - 3:00PM")
  status: String,          // Status (active, completed, archived)
  course_id: String,       // Reference to parent course
  created_at: Date,        // Creation timestamp
  updated_at: Date,        // Last update timestamp
  description: String,     // Optional class description
  recordings_count: Number // Number of recordings associated with this class
}
```

## Components and Flow

### Main Components

1. **Courses.jsx**
   - Lists all courses
   - Provides filtering and search functionality
   - Entry point to course details

2. **CourseDetail.jsx**
   - Displays details for a specific course
   - Shows classes within the course
   - Provides functionality to add new classes to the course

3. **Classes.jsx**
   - Lists all classes (can be filtered by course)
   - Provides search and filter functionality

4. **ClassDetails.jsx**
   - Displays details for a specific class
   - Shows student data and recordings
   - Includes breadcrumb navigation showing course > class hierarchy

5. **CourseModal.jsx**
   - Modal for creating/editing courses
   - Collects course code, name, semester, academic year

6. **ClassModal.jsx**
   - Modal for creating/editing classes
   - Can be initialized with a courseId to associate the class with a course

### User Flow

1. User navigates to Courses from the sidebar
2. User can:
   - View list of all courses
   - Search/filter courses
   - Create a new course
   - Click on a course to view details

3. In course details, user can:
   - View course information
   - See classes within the course
   - Add a new class to the course
   - Click on a class to view class details

4. In class details, user can:
   - View class information
   - See breadcrumb navigation showing the parent course
   - Manage student data and recordings

## API Interaction

### Required Endpoints

1. **Fetch Courses**
   - `GET /api/courses`
   - Returns list of all courses
   - Should support pagination, sorting, and filtering

2. **Fetch Course Details**
   - `GET /api/courses/:id`
   - Returns details for a specific course including its classes

3. **Create Course**
   - `POST /api/courses`
   - Creates a new course
   - Required fields: name, courseCode, semester, academic_year
   - Optional fields: description

4. **Update Course**
   - `PUT /api/courses/:id`
   - Updates an existing course

5. **Delete Course**
   - `DELETE /api/courses/:id`
   - Deletes a course (should handle associated classes)

6. **Fetch Classes**
   - `GET /api/classes`
   - Returns list of all classes
   - Should support query parameter `?course_id=xxx` to filter by course

7. **Fetch Class Details**
   - `GET /api/classes/:id`
   - Returns details for a specific class

8. **Create Class**
   - `POST /api/classes`
   - Creates a new class
   - Required fields: name, section, student_count, schedule, course_id
   - Optional fields: description

9. **Update Class**
   - `PUT /api/classes/:id`
   - Updates an existing class

10. **Delete Class**
    - `DELETE /api/classes/:id`
    - Deletes a class

## Current API Implementation

Currently, the frontend uses the `classService` to interact with the API:

```javascript
// Example API calls used in the frontend
classService.getClasses()                // Fetch all classes
classService.getClassDetails(id)         // Fetch a specific class
classService.createClass(classData)      // Create a new class
```

For the new course structure, the frontend will need a `courseService` with similar methods.

## State Management

The application uses React's useState and useEffect hooks for state management:

- Course list state in Courses.jsx
- Course details and classes list in CourseDetail.jsx
- Class details in ClassDetails.jsx

When data is modified, it's updated both in the API and in the local state to ensure UI consistency.

## Form Validation

Forms for creating and editing courses and classes implement the following validations:

### Course Form Validation
- Course Code: Required
- Course Name: Required
- Semester: Required, must be one of: Fall, Spring, Summer, Winter
- Academic Year: Required, format YYYY-YYYY

### Class Form Validation
- Class Name: Required
- Section: Required
- Student Count: Required, must be a positive number
- Schedule: Required
- Course ID: Required when creating a class within a course

## UI/UX Considerations

1. **Breadcrumb Navigation**
   - Class details show breadcrumb navigation to parent course
   - Format: Courses > [Course Name] > [Class Name]

2. **Creation Flow**
   - When creating a class from within a course, the course_id is pre-filled
   - When creating a course, a confirmation message appears upon success

3. **List Views**
   - Course and class lists include filtering, search, and sorting options
   - Status indicators use color coding (active: blue, completed: green, archived: gray)

## Development Notes for Backend

1. **Data Consistency**
   - Maintain counters for classes_count in the Course model
   - Ensure cascading actions when deleting courses (either delete classes or prevent deletion if classes exist)

2. **Query Parameters**
   - Support filtering by status, search by name/description, and sorting
   - Implement pagination for large datasets

3. **Response Format**
   - Follow consistent response format for all endpoints:
     ```javascript
     {
       success: Boolean,
       data: Object|Array,
       message: String,  // For errors
       pagination: Object // Optional, for list endpoints
     }
     ```

4. **Error Handling**
   - Use appropriate HTTP status codes
   - Provide descriptive error messages

## Future Enhancements

The frontend is designed to accommodate these planned features:

1. **Course Templates**
   - Ability to create course templates for reuse

2. **Bulk Operations**
   - Import/export courses and classes
   - Bulk edit functionality

3. **Advanced Analytics**
   - Course-level analytics integrating class data
   - Student performance across courses

## Conclusion

The Courses and Classes system implements a hierarchical structure that allows educators to organize their educational content effectively. The frontend components are designed to provide intuitive navigation and management of this hierarchy, with clear data flows and state management.

Backend developers should focus on implementing the described API endpoints with special attention to the relationship between courses and classes, ensuring data consistency and appropriate query capabilities. 