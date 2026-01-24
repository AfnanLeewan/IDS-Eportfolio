# Academic Year Management System - Implementation Guide

## Overview
A comprehensive year-based data storage and management system has been implemented for the Insightful Scores platform. This allows you to manage and monitor score records year by year, archive historical data, and perform year-over-year comparisons.

## Features Implemented

### 1. **Database Layer**
- ✅ `academic_years` table for centralized year management
- ✅ Academic year tracking added to `student_scores`, `students`, and `classes` tables
- ✅ Year-based filtering indexes for optimal performance
- ✅ Materialized views updated to support year-based statistics
- ✅ Comprehensive RPC functions for year-aware operations
- ✅ **Fixed**: `archive_academic_year` updated to respect `academic_year_id` foreign key schema
- ✅ **Fixed**: `set_current_academic_year` updated to include explicit `WHERE` clause for safety

### 2. **Backend Functions**

#### Year Management Functions:
- `set_current_academic_year(p_year_id)` - Set the active academic year
- `get_current_academic_year()` - Retrieve current academic year
- `archive_academic_year(p_year_id)` - Archive a year and deactivate associated classes

#### Year-Aware Statistics:
- `get_class_statistics_by_year(p_class_id, p_academic_year)` - Class stats for a specific year
- `get_student_scores_by_year(p_student_id, p_academic_year)` - Student scores by year
- `get_student_year_comparison(p_student_id)` - Year-over-year performance comparison

### 3. **React Hooks** (`src/hooks/useSupabaseData.ts`)

#### Query Hooks:
- `useAcademicYears()` - Fetch all academic years
- `useCurrentAcademicYear()` - Get current academic year
- `useStudentScoresByYear(studentId, year)` - Year-specific scores
- `useClassStatisticsByYear(classId, year)` - Year-specific class stats
- `useStudentYearComparison(studentId)` - Multi-year comparison

#### Mutation Hooks:
- `useCreateAcademicYear()` - Create new academic year
- `useSetCurrentAcademicYear()` - Change current year
- `useArchiveAcademicYear()` - Archive a year
- `useUpdateAcademicYear()` - Update year details

### 4. **UI Components**

#### Academic Year Management Component
**File**: `src/components/management/AcademicYearManagement.tsx`

Features:
- View all academic years in a beautiful grid layout
- Create new academic years with validation
- Set current academic year
- Archive old years
- Visual indicators for current and active years
- Responsive design with smooth animations

#### Year Selector Component
**File**: `src/components/common/YearSelector.tsx`

Features:
- Dropdown selector for academic years
- Auto-defaults to current year
- Shows which year is current
- Reusable across different years

#### Analytics Dashboard
**File**: `src/components/dashboard/AnalyticsDashboard.tsx`

Features:
- Full integration with Supabase real-time data
- Dynamic filtering by Year, Program, Class, and Subject
- Interactive charts (Radar, Box Plot, Heatmap) powered by live scores
- **Student Deep Dive**: detailed analysis for individual students
- Automatic calculation of class averages and standard deviations using `score-utils.ts`

## Database Schema

### Academic Years Table
```sql
CREATE TABLE public.academic_years (
  id TEXT PRIMARY KEY,
  year_number INTEGER NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Updated Tables
- `student_scores` - Added `academic_year` column (defaults to 2568)
- `students` - Added `joined_year` and `academic_year` columns
- All queries now support year-based filtering

## How to Use

### 1. Managing Academic Years

Navigate to the Management page and access the Academic Year Management section:

```tsx
import { AcademicYearManagement } from '@/components/management/AcademicYearManagement';

// In your management page
<AcademicYearManagement />
```

**Actions Available:**
- **Create Year**: Add a new academic year with start/end dates
- **Set Current**: Mark a year as the current active year
- **Archive**: Archive old years (makes them read-only)

### 2. Adding Year Filter to Views

Add the year selector to any view:

```tsx
import { YearSelector } from '@/components/common/YearSelector';
import { useState } from 'react';
import { useCurrentAcademicYear } from '@/hooks/useSupabaseData';

function MyScoresView() {
  const { data: currentYear } = useCurrentAcademicYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const activeYear = selectedYear || currentYear?.year_number || 2568;

  return (
    <div>
      <YearSelector 
        value={selectedYear} 
        onValueChange={setSelectedYear} 
      />
      {/* Your content filtered by activeYear */}
    </div>
  );
}
```

### 3. Querying Year-Specific Data

```tsx
// Get student scores for a specific year
const { data: scores } = useStudentScoresByYear('S001', 2568);

// Get class statistics for a year
const { data: stats } = useClassStatisticsByYear('pre-a-1', 2568);

// Compare student performance across years
const { data: comparison } = useStudentYearComparison('S001');
```

## Data Migration

### Existing Data
All existing scores have been automatically assigned to academic year **2568** (current year).

### Future Scores
When creating new scores, the system will use the current academic year by default.

## Best Practices

### 1. Year Transitions
When transitioning to a new academic year:
1. Create the new academic year first
2. Set it as current when ready
3. Archive the previous year when no longer needed

### 2. Data Integrity
- **DO NOT** delete academic years - use archive instead
- Archived years are read-only but data remains accessible
- Students and classes track their academic year automatically

### 3. Performance
- Indexes are created for year-based queries
- Materialized views are updated to include year filtering
- Use year filters in queries for optimal performance

## API Examples

### Create New Year
```typescript
const createYear = useCreateAcademicYear();

createYear.mutate({
  id: 'ay-2569',
  year_number: 2569,
  display_name: '2569 (2026-2027)',
  start_date: '2026-05-01',
  end_date: '2027-04-30',
  is_active: true,
  is_current: false,
});
```

### Set Current Year
```typescript
const setCurrentYear = useSetCurrentAcademicYear();
setCurrentYear.mutate('ay-2569');
```

### Archive Year
```typescript
const archiveYear = useArchiveAcademicYear();
archiveYear.mutate('ay-2567');
```

## Default Years Created

The system comes pre-populated with 3 academic years:
- **2567** (2024-2025) - Active, not current
- **2568** (2025-2026) - Active, **CURRENT** ⭐
-**2569** (2026-2027) - Active, not current

## Next Steps

### Recommended Integrations:

1. **Update Scores View**
   - Add YearSelector to filter scores by year
   - Show year in score displays
   - Add year comparison charts

2. **Update Dashboard**
   - Add year selector to analytics
   - Show year-over-year trends
   - Multi-year performance graphs

3. **Reports**
   - Generate year-specific reports
   - Compare year performance
   - Export historical data

4. **Student Profiles**
   - Show student progress across years
   - Year-by-year performance tracking
   - Historical grade reports

## Troubleshooting

### TypeScript Errors
If you see TypeScript errors about the new tables, restart your TypeScript server:
```bash
# In VS Code: Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

### Migration Issues
If the migration didn't apply:
```bash
npx supabase db reset
npx supabase db push
```

###Year Not Showing
Ensure at least one year is marked as current:
```sql
UPDATE academic_years SET is_current = true WHERE year_number = 2568;
```

## Files Modified/Created

### Created:
- `supabase/migrations/20260122141200_academic_year_management.sql`
- `src/components/management/AcademicYearManagement.tsx`
- `src/components/common/YearSelector.tsx`

### Modified:
- `src/hooks/useSupabaseData.ts` - Added year management hooks
- `src/components/scores/ScoresView.tsx` - Fixed missing import

## Support

For questions or issues:
1. Check the console for any error messages
2. Verify database migration was successful
3. Ensure at least one academic year is set as current
4. Review the query hooks documentation above

---

**Implementation Date**: January 22, 2026  
**Database Migration**: 20260122141200_academic_year_management  
**Status**: ✅ Complete and Ready to Use
