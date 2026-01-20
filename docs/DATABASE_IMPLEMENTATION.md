# Database Implementation Guide

## Overview

This document describes the complete backend implementation for the EduAssess platform using Supabase as the database and backend-as-a-service.

## Database Schema

### Core Tables

1. **exam_programs** - Exam programs (Pre-A-Level, Pre-SCIUS, etc.)
2. **subjects** - Subjects within programs (Physics, Chemistry, etc.)
3. **sub_topics** - Sub-topics with max scores
4. **classes** - Student classes/sections
5. **students** - Student records
6. **student_scores** - Individual scores for each sub-topic
7. **score_history** - Audit trail for score changes
8. **profiles** - User profiles (already exists)
9. **user_roles** - User role assignments (already exists)

### Relationships

```
exam_programs
  ├── subjects
  │   └── sub_topics
  │       └── student_scores
  └── classes
      └── students
          └── student_scores
```

## Setup Instructions

### Step 1: Install Supabase CLI (if not already installed)

```bash
# macOS
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

### Step 2: Link to Your Supabase Project

```bash
# Navigate to project directory
cd /Users/afnan/Documents/insightful-scores

# Link to your Supabase project
supabase link --project-ref vydkiostfqlsjucyxsph
```

### Step 3: Apply Migrations

You have two options:

#### Option A: Use the automated script

```bash
./scripts/setup-database.sh
```

#### Option B: Manual migration

```bash
# Push all migrations to remote database
supabase db push

# Or apply specific migration
supabase db push supabase/migrations/20260120084500_complete_schema.sql
supabase db push supabase/migrations/20260120084501_seed_data.sql
```

### Step 4: Verify Database Setup

```bash
# Check database status
supabase db status

# View database diff
supabase db diff

# Or visit the Supabase dashboard
# https://vydkiostfqlsjucyxsph.supabase.co/project/vydkiostfqlsjucyxsph/editor
```

## Features Implemented

### ✅ Authentication & Authorization
- Email/password and OAuth authentication
- Role-based access control (Admin, Teacher, Student)
- Row-Level Security (RLS) policies

### ✅ Student Management
- CRUD operations for students
- Class assignments
- Real-time updates

### ✅ Score Management
- Individual score tracking per sub-topic
- Bulk score updates
- Score history/audit trail
- Optimistic UI updates

### ✅ Analytics & Statistics
- Real-time class statistics
- Subject-wise performance
- Top/bottom performers
- Materialized views for performance

### ✅ Real-time Features
- Live score updates via WebSockets
- Presence tracking (who's online)
- Instant UI synchronization

## API Usage Examples

### Query Data

```typescript
import { useStudents, useClassScores } from '@/hooks/useSupabaseData';

// Get all students in a class
const { data: students, isLoading } = useStudents('m6-1');

// Get all scores for a class
const { data: scores } = useClassScores('m6-1');
```

### Mutate Data

```typescript
import { useUpdateScore, useCreateStudent } from '@/hooks/useSupabaseData';

// Update a score
const updateScore = useUpdateScore();
updateScore.mutate({
  studentId: 'STU0001',
  subTopicId: 'phy-mechanics',
  score: 23,
});

// Create a student
const createStudent = useCreateStudent();
createStudent.mutate({
  id: 'STU0016',
  name: 'New Student',
  class_id: 'm6-1',
  email: 'new@example.com',
});
```

### Real-time Subscriptions

```typescript
import { useRealtimeSubscriptions } from '@/hooks/useRealtime';

// Subscribe to real-time updates
useRealtimeSubscriptions('m6-1', user?.id, user?.full_name, {
  scores: true,
  students: true,
  presence: true,
});
```

## Database Functions

The following PostgreSQL functions are available:

### Analytics Functions

- `get_student_total_score(student_id)` - Get total score for a student
- `get_subject_score(student_id, subject_id)` - Get subject score
- `get_class_average(class_id)` - Calculate class average
- `get_class_statistics(class_id)` - Get comprehensive class stats
- `get_top_performers(class_id, limit)` - Get top students

### Utility Functions

- `upsert_student_scores(scores_json, updated_by)` - Bulk update scores
- `refresh_statistics()` - Refresh materialized views

## Materialized Views

### mv_class_subject_stats

Pre-aggregated statistics for performance:

```sql
REFRESH MATERIALIZED VIEW mv_class_subject_stats;
```

Contains:
- Class and subject averages
- Max/min scores
- Standard deviation
- Student counts

## Row-Level Security

All tables have RLS enabled with the following policies:

### Students & Scores
- ✅ Students can view their own data
- ✅ Teachers can view/edit all data
- ✅ Admins have full access

### Curriculum (Subjects, Sub-topics)
- ✅ Everyone can view
- ✅ Only admins can modify

### Classes
- ✅ Everyone can view
- ✅ Teachers and admins can manage

## Performance Optimizations

### Indexes Created
- Student class lookup
- Score student/subtopic lookups
- Composite indexes for common queries

### Caching Strategy
- TanStack Query with 5-minute stale time
- Optimistic updates for better UX
- Invalidation on mutations

### Real-time Optimization
- Filtered subscriptions per class
- Debounced notifications
- Selective query invalidation

## Migration Path from Mock Data

The following components need to be updated:

### ✅ Phase 1: Data Layer (Complete)
- [x] Database schema
- [x] Seed data
- [x] TypeScript types
- [x] React Query hooks
- [x] Utility functions
- [x] Real-time subscriptions

### 🔄 Phase 2: UI Integration (Next Steps)
- [ ] Update `ScoresView` to use hooks
- [ ] Update `AnalyticsDashboard` to use hooks
- [ ] Update `StudentManagement` to use hooks
- [ ] Update chart components
- [ ] Remove `mockData.ts` dependencies

### 🔮 Phase 3: Advanced Features
- [ ] CSV/PDF export
- [ ] Email notifications
- [ ] Enhanced reporting
- [ ] Performance dashboards

## Monitoring & Maintenance

### View Logs

```bash
# View Supabase logs
supabase functions logs

# View database logs via dashboard
# https://vydkiostfqlsjucyxsph.supabase.co/project/vydkiostfqlsjucyxsph/logs
```

### Refresh Statistics

Statistics are auto-updated via triggers, but you can manually refresh:

```sql
SELECT refresh_statistics();
```

Or via the app:

```typescript
const refreshStats = useRefreshStatistics();
refreshStats.mutate();
```

## Troubleshooting

### Migration Errors

If migrations fail:

```bash
# Reset database (WARNING: Deletes all data)
supabase db reset

# Or manually fix via SQL editor in dashboard
```

### RLS Issues

If queries return empty:

```bash
# Check RLS policies
supabase db inspect

# Temporarily disable RLS for debugging (NOT for production!)
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
```

### Type Mismatches

Regenerate types after schema changes:

```bash
supabase gen types typescript --linked > src/integrations/supabase/types-generated.ts
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Support

For issues or questions:
1. Check Supabase logs
2. Review RLS policies
3. Test queries in SQL editor
4. Check browser console for errors

---

**Last Updated:** 2026-01-20
**Database Version:** PostgreSQL 15
**Supabase Project:** vydkiostfqlsjucyxsph
