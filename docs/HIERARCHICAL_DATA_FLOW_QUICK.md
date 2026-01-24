# Hierarchical Data Flow - Quick Reference

## New Data Structure

```
📅 Academic Year (2568, 2569, etc.)
   │
   ├── 📚 Programs
   │   ├── Pre-A-Level
   │   │   ├── 📖 Subjects
   │   │   │   ├── Mathematics
   │   │   │   │   └── 📝 Topics: Calculus, Algebra, Geometry
   │   │   │   ├── Physics
   │   │   │   │   └── 📝 Topics: Mechanics, Thermodynamics
   │   │   │   └── Chemistry
   │   │   └── 🎓 Assigned Classes: M.6/1, M.6/2
   │   │
   │   └── Pre-SCIUS
   │       ├── 📖 Subjects
   │       └── 🎓 Assigned Classes: Pre-A-1
   │
   └── 🎓 Classes
       ├── M.6/1
       │   ├── Assigned to: Pre-A-Level
       │   └── 👨‍🎓 Students: 25
       ├── M.6/2
       │   ├── Assigned to: Pre-A-Level
       │   └── 👨‍🎓 Students: 30
       └── Pre-A-1
           ├── Assigned to: Pre-SCIUS
           └── 👨‍🎓 Students: 20
```

## Management Workflow

### 1️⃣ Setup Year → 2️⃣ Create Programs → 3️⃣ Add Subjects/Topics → 4️⃣ Create Classes → 5️⃣ Assign Classes to Programs → 6️⃣ Add Students → 7️⃣ Enter Scores

## Key Relationships

| Relationship | Type | Description |
|-------------|------|-------------|
| **Year → Programs** | One-to-Many | Each year has multiple programs |
| **Program → Subjects** | One-to-Many | Each program has multiple subjects |
| **Subject → Topics** | One-to-Many | Each subject has multiple topics |
| **Year → Classes** | One-to-Many | Each year has multiple classes |
| **Program ↔ Classes** | Many-to-Many | Programs can have multiple classes, classes can be in multiple programs |
| **Class → Students** | One-to-Many | Each class has multiple students |
| **Student → Scores** | One-to-Many | Students have scores for each topic |

## Important Rules

✅ **Can Do**:
- Create multiple programs per year
- Assign one class to multiple programs
- Assign multiple classes to one program
- Students automatically get scores for ALL subjects in ALL their class's programs

❌ **Cannot Do**:
- Assign class to program from different year
- Have student without a class
- Have topic without a subject
- Have subject without a program

## UI Navigation

```
Management Dashboard
├── Academic Years Tab
│   └── Create Year, Set Current, Archive
├── Programs Tab
│   ├── Create Program (for current year)
│   └── Manage Classes (assign/remove)
├── Classes Tab
│   ├── Create Class (for current year)
│   └── View Assigned Programs
├── Subjects & Topics Tab
│   ├── Select Program
│   ├── Create Subject
│   └── Add Topics to Subject
└── Students Tab
    ├── Select Class
    └── Add Students
```

## Quick Start Guide

1. **Set Current Year**: Management → Academic Years → Set Current (e.g., 2568)
2. **Create Program**: Management → Programs → Add Program (e.g., "Pre-A-Level")
3. **Add Subjects**: Management → Subjects → Select Program → Create Subjects (e.g., "Math", "Physics")
4. **Add Topics**: Expand Subject → Add Topic (e.g., "Calculus - 20 marks")
5. **Create Classes**: Management → Classes → Add Class (e.g., "M.6/1")
6. **Assign to Program**: Management → Programs → Select Program → Manage Classes → Add M.6/1
7. **Add Students**: Management → Students → Select Class → Add Students
8. **Enter Scores**: Scores → Select Class → Select Subject → Enter Topic Scores

## Database Functions Reference

### Year Functions
```sql
get_year_programs(year_id)        -- List all programs in year
get_year_classes(year_id)         -- List all classes in year
set_current_academic_year(year_id) -- Make year active
archive_academic_year(year_id)    -- Archive old year
```

### Program-Class Functions
```sql
assign_class_to_program(program_id, class_id, user_id)  -- Assign class
remove_class_from_program(program_id, class_id)         -- Remove class
get_program_classes(program_id)                         -- Classes in program
get_class_programs(class_id)                            -- Programs for class
get_program_students(program_id)                        -- All students via classes
```

## React Hooks Reference

### Queries
```typescript
// Years
useCurrentAcademicYear()
useAcademicYears()

// Programs & Classes
useYearPrograms(yearId)
useYearClasses(yearId)
useProgramClasses(programId)
useClassPrograms(classId)

// Subjects & Topics
useSubjects(programId)
useSubTopics(subjectId)
```

### Mutations
```typescript
// Programs
useCreateExamProgram()  // { name, description, academic_year_id }
useUpdateExamProgram()
useDeleteExamProgram()

// Classes
useCreateClass()        // { name, academic_year_id }
useUpdateClass()
useDeleteClass()

// Assignments
useAssignClassToProgram()    // { programId, classId }
useRemoveClassFromProgram()  // { programId, classId }

// Subjects
useCreateSubject()      // { name, code, program_id }
useCreateSubTopic()     // { name, max_score, subject_id }
```

## Common Scenarios

### New Academic Year
1. Create new year (e.g., 2569)
2. Optionally copy last year's program structure
3. Create new classes
4. Set as current year
5. Archive previous year

### New Program in Current Year
1. Go to Programs tab
2. Click "Add Program"
3. Program automatically links to current year
4. Add subjects and topics
5. Assign classes to program

### Student Transfers Classes
1. Update student's `class_id`
2. Student automatically gets new programs
3. Previous scores preserved
4. New scores available for new programs

### View Student Progress
1. Select student
2. View scores by year using `get_student_scores_by_year()`
3. Compare across years using `get_student_year_comparison()`

## File Locations

```
Migration:
📁 supabase/migrations/
   └── 20260124135300_hierarchical_data_structure.sql

Components:
📁 src/components/management/
   ├── ManagementDashboard.tsx    ✅ Updated
   ├── ProgramManagement.tsx       ✅ New
   ├── ClassManagement.tsx         ✅ Updated
   ├── SubjectManagement.tsx       ✅ Exists
   ├── StudentManagement.tsx       ✅ Exists
   └── AcademicYearManagement.tsx  ✅ Exists

Hooks:
📁 src/hooks/
   └── useSupabaseData.ts          ✅ Updated with new hooks

Documentation:
📁 docs/
   ├── HIERARCHICAL_DATA_FLOW.md         ✅ New (detailed guide)
   ├── HIERARCHICAL_DATA_FLOW_QUICK.md   ✅ This file
   └── ACADEMIC_YEAR_MANAGEMENT.md       ✅ Previous year system
```

## Status: ✅ Complete

All components, hooks, database functions, and documentation are in place and ready to use!
