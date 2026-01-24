# Hierarchical Data Flow - Implementation Guide

## Overview

This document describes the new hierarchical data structure implemented in the Insightful Scores platform, which properly organizes academic data following this flow:

```
Academic Year
├── Programs (e.g., Pre-A-Level, Pre-SCIUS)
│   ├── Subjects (e.g., Mathematics, Physics)
│   │   └── Topics (e.g., Calculus, Mechanics)
│   └── Assigned Classes
└── Classes (e.g., M.6/1, Pre-A-1)
    └── Students
```

## Data Structure Hierarchy

### 1. Academic Year → Programs
- Each **Academic Year** can create multiple **Programs**
- Programs are scoped to their academic year
- Example: "2568" year can have "Pre-A-Level 2568" and "Pre-SCIUS 2568" programs

### 2. Program → Subjects → Topics
- Each **Program** can create multiple **Subjects**
- Each **Subject** can create multiple **Topics** (formerly sub-topics)
- Topics define assessments with max scores
- Example hierarchy:
  - Program: "Pre-A-Level"
    - Subject: "Mathematics"
      - Topic: "Calculus" (max score: 20)
      - Topic: "Algebra" (max score: 15)

### 3. Academic Year → Classes
- Each **Academic Year** can create multiple **Classes**
- Classes are independent of programs initially
- Classes contain Students
- Example: "2568" year creates "M.6/1", "M.6/2", "Pre-A-1"

### 4. Program ↔ Class (Many-to-Many)
- A **Program** can be assigned to multiple **Classes**
- A **Class** can be assigned to multiple **Programs**
- This is managed through the `program_classes` junction table
- **Important**: Program and Class must belong to the same Academic Year

### 5. Class → Students
- Each **Class** contains multiple **Students**
- Students are added from authenticated users
- Students inherit their academic year from their class

## Key Features

### Automatic Year Scoping
- Programs automatically belong to the academic year they were created in
- Classes automatically belong to the academic year they were created in
- Cannot assign a program to a class from a different year (enforced by database function)

### Score Tracking
- Student scores are tracked by **Topic** (not subject directly)
- Scores are automatically associated with the academic year
- Can compare student performance across years

### Data Integrity
- Cascade deletes: Deleting a program deletes all its subjects and topics
- Deleting a subject deletes all its topics
- Deleting a class removes all program assignments
- Archive functionality preserves historical data

## Database Schema

### Core Tables

```sql
-- Academic Years
academic_years (
  id,
  year_number,
  display_name,
  start_date,
  end_date,
  is_active,
  is_current
)

-- Programs (belongs to academic year)
exam_programs (
  id,
  name,
  description,
  academic_year_id → academic_years.id,
  is_active
)

-- Subjects (belongs to program)
subjects (
  id,
  program_id → exam_programs.id,
  name,
  code,
  display_order
)

-- Topics (belongs to subject)
sub_topics (
  id,
  subject_id → subjects.id,
  name,
  max_score,
  display_order
)

-- Classes (belongs to academic year)
classes (
  id,
  name,
  academic_year_id → academic_years.id,
  is_active
)

-- Program-Class Assignment (many-to-many)
program_classes (
  id,
  program_id → exam_programs.id,
  class_id → classes.id,
  assigned_at,
  assigned_by,
  is_active
)

-- Students (belongs to class)
students (
  id,
  user_id → auth.users.id,
  name,
  class_id → classes.id,
  email,
  is_active
)

-- Student Scores (belongs to student and topic)
student_scores (
  id,
  student_id → students.id,
  sub_topic_id → sub_topics.id,
  score,
  academic_year,
  exam_date
)
```

## Management Workflow

### Step 1: Setup Academic Year
1. Navigate to **Management** → **Academic Years**
2. Create a new academic year (or set existing year as current)
3. All subsequent data will be associated with this year

### Step 2: Create Programs
1. Navigate to **Management** → **Programs**
2. Create programs for the current year
   - Example: "Pre-A-Level", "Pre-SCIUS", "Regular"
3. Programs are automatically linked to the current academic year

### Step 3: Create Subjects and Topics
1. Navigate to **Management** → **Subjects and Topics**
2. Select a program
3. Create subjects for that program
   - Example: Mathematics, Physics, Chemistry
4. For each subject, create topics with max scores
   - Example: Mathematics → Calculus (20 marks), Algebra (15 marks)

### Step 4: Create Classes
1. Navigate to **Management** → **Classes**
2. Create classes for the current year
   - Example: "M.6/1", "M.6/2", "Pre-A-1"
3. Classes are automatically linked to the current academic year

### Step 5: Assign Classes to Programs
1. Navigate to **Management** → **Programs**
2. Select a program
3. Click **Manage Classes**
4. Assign classes to the program
   - Example: Assign "M.6/1" and "M.6/2" to "Pre-A-Level" program
   - This means students in these classes will have scores for all subjects in the program

### Step 6: Add Students
1. Navigate to **Management** → **Students**
2. Add students to their respective classes
3. Students can only be added from authenticated users

### Step 7: Enter Scores
1. Navigate to **Scores**
2. Select a class and subject
3. Enter scores for topics
4. Scores are automatically associated with:
   - The student
   - The topic
   - The current academic year

## Database Functions

### Year Management
```sql
-- Get all programs for an academic year
get_year_programs(p_academic_year_id)

-- Get all classes for an academic year
get_year_classes(p_academic_year_id)

-- Set current academic year
set_current_academic_year(p_year_id)

-- Archive academic year (makes read-only)
archive_academic_year(p_year_id)
```

### Program-Class Management
```sql
-- Assign class to program (must be same year)
assign_class_to_program(p_program_id, p_class_id, p_assigned_by)

-- Remove class from program
remove_class_from_program(p_program_id, p_class_id)

-- Get all classes assigned to a program
get_program_classes(p_program_id)

-- Get all programs assigned to a class
get_class_programs(p_class_id)

-- Get all students in a program (via class assignments)
get_program_students(p_program_id)
```

### Statistics
```sql
-- Get class statistics for a specific year
get_class_statistics_by_year(p_class_id, p_academic_year)

-- Get student scores for a specific year
get_student_scores_by_year(p_student_id, p_academic_year)

-- Compare student performance across years
get_student_year_comparison(p_student_id)
```

## React Hooks

### Query Hooks
```typescript
// Academic Years
useAcademicYears() // Get all years
useCurrentAcademicYear() // Get current year

// Programs
useYearPrograms(yearId) // Get programs for a year
useExamProgramsByYear(yearId) // Alternative with filtering

// Classes
useYearClasses(yearId) // Get classes for a year
useClassesByYear(yearId) // Alternative with filtering

// Program-Class Relationships
useProgramClasses(programId) // Get classes in a program
useClassPrograms(classId) // Get programs for a class
useProgramStudents(programId) // Get students via program

// Subjects and Topics
useSubjects(programId) // Get subjects for a program
useSubTopics(subjectId) // Get topics for a subject
```

### Mutation Hooks
```typescript
// Programs
useCreateExamProgram() // Requires academic_year_id
useUpdateExamProgram()
useDeleteExamProgram()

// Classes
useCreateClass() // Requires academic_year_id
useUpdateClass()
useDeleteClass()

// Program-Class Assignments
useAssignClassToProgram() // Validates same year
useRemoveClassFromProgram()

// Subjects and Topics
useCreateSubject() // Requires program_id
useCreateSubTopic() // Requires subject_id
useDeleteSubject() // Also deletes topics
useDeleteSubTopic()
```

## Migration Information

### Database Migration
- File: `20260124135300_hierarchical_data_structure.sql`
- Applied: 2026-01-24

### Changes Made
1. Added `academic_year_id` to `exam_programs` table
2. Removed `program_id` from `classes` table
3. Added `academic_year_id` to `classes` table
4. Created `program_classes` junction table
5. Added helper functions for program-class management
6. Updated existing data to link to current year (ay-2568)

### Data Preservation
- All existing programs linked to year 2568
- All existing classes linked to year 2568
- No data loss during migration

## Best Practices

### 1. Year Transitions
When moving to a new academic year:
1. Create new academic year
2. Optionally copy programs from previous year
3. Create new classes for the new year
4. Set new year as current
5. Archive previous year when complete

### 2. Program-Class Assignments
- Assign classes to programs based on curriculum requirements
- Students will have scores for ALL subjects in ALL assigned programs
- Example: If "M.6/1" is assigned to both "Pre-A-Level" and "Advanced Math", students will track scores for subjects in both programs

### 3. Data Integrity
- Never delete academic years - use archive instead
- Be cautious when deleting programs (cascades to subjects/topics)
- Deleting a subject removes all topics and scores
- Use soft delete (is_active = false) when possible

### 4. Performance
- Indexes created for all year-based queries
- Use year filters in queries for optimal performance
- Materialized views updated to support year grouping

## Troubleshooting

### Cannot Assign Class to Program
**Error**: "Program and class must belong to the same academic year"
**Solution**: Ensure both the program and class were created in the same academic year

### No Programs Showing
**Problem**: Created program but it doesn't appear
**Solution**: Check that you're viewing the correct academic year

### Students Not Showing in Program
**Problem**: Program shows 0 students
**Solution**: Ensure classes are assigned to the program, and students are added to those classes

### Scores Not Saving
**Problem**: Cannot enter scores
**Solution**: Verify:
1. Program has subjects
2. Subjects have topics
3. Class is assigned to the program
4. Student is in the class

## UI Components

### Management Dashboard Tabs
1. **Academic Years** - Manage years, set current, archive old
2. **Programs** - Create programs, manage curricula, assign classes
3. **Classes** - Create classes, view assigned programs
4. **Subjects & Topics** - Manage curriculum content
5. **Students** - Add students to classes

### Flow Features
- Automatic year scoping prevents cross-year assignments
- Visual indicators show relationships (programs ↔ classes)
- Counts show data at each level (subject count, class count, student count)
- Cascading views (year → programs → subjects → topics)

---

**Implementation Date**: January 24, 2026  
**Database Migration**: 20260124135300_hierarchical_data_structure  
**Status**: ✅ Complete and Ready to Use
