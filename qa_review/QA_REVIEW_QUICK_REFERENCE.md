# 🎯 QA Review - Quick Reference & Visual Diagrams

## Data Flow Diagram: Score Update Path

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CURRENT FLOW (RISKY)                           │
└─────────────────────────────────────────────────────────────────────────┘

ScoresView.tsx
   │
   ├─ User clicks "Save" button
   │
   ├─ [ScoreEditDialog] calls onSave()
   │
   ├─ [ScoresView] → handleSaveScores()
   │     ❌ No double-click prevention
   │     ❌ No loading state
   │
   ├─ updateScoresMutation.mutateAsync()
   │     │
   │     ├─ Sent to Backend
   │     │
   │     └─ supabase.from('student_scores').upsert()
   │           │
   │           ├─ RLS checks (✓ Works)
   │           │
   │           └─ INSERT/UPDATE executed
   │                 ❌ NO created_by/updated_by populated
   │                 ❌ NO score_history audit entry
   │                 ❌ NO response validation
   │
   ├─ Response returns (or error)
   │
   ├─ onSuccess triggered
   │     │
   │     ├─ invalidateQueries(studentScores)
   │     ├─ invalidateQueries(classScores)
   │     └─ invalidateQueries(studentScoresByYear)
   │
   ├─ Cache cleared
   │
   ├─ Fresh queries fetch new data
   │
   └─ UI re-renders with new values
        ⏱️  500ms+ delay visible to user


┌─────────────────────────────────────────────────────────────────────────┐
│                        RECOMMENDED FLOW (SAFE)                          │
└─────────────────────────────────────────────────────────────────────────┘

ScoresView.tsx
   │
   ├─ User clicks "Save" button
   │
   ├─ [GUARD] Check if mutation in flight
   │     ✓ Prevents double-click
   │
   ├─ [onMutate] Optimistic update
   │     │
   │     ├─ Get previous data
   │     ├─ Update local cache immediately
   │     └─ UI shows new value instantly
   │
   ├─ updateScoresMutation.mutateAsync()
   │     │
   │     └─ supabase.from('student_scores').upsert()
   │           │
   │           ├─ RLS checks
   │           │
   │           ├─ INSERT/UPDATE with updated_by & created_by
   │           │
   │           ├─ Database TRIGGER creates score_history entry
   │           │     ✓ Audit trail created
   │           │
   │           └─ Response: [{ id, student_id, score, ... }]
   │
   ├─ [onSuccess] Response validation
   │     │
   │     ├─ Assert response.score === expectedScore
   │     │     ✓ Catches server-side validation failures
   │     │
   │     └─ Confirm audit entry created
   │           ✓ Verify score_history has entry
   │
   ├─ Cache tagged with version number
   │
   ├─ Real-time subscription notifies other users
   │
   ├─ UI shows immediate feedback
   │     ⏱️  < 50ms perceived latency
   │
   └─ Success toast shown


CONFLICT SCENARIOS:

Scenario A: User A saves, User B's real-time arrives during mutation
   User A saving → User B's score updates in real-time
   → Real-time handler checks: isOwnChange?
   → If NOT own change: only invalidate, don't lose pending mutation
   → After User A's mutation completes, fresh query resolves conflict

Scenario B: Double-click save
   User A clicks Save → mutation in flight (500ms)
   User A clicks Save again
   → Guard check: mutationInFlight = true → return early
   → Only ONE mutation sent
```

---

## Critical Mutation Checklist

When creating any mutation, ensure:

```typescript
export function useMyMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data) => {
      // ✓ VALIDATE INPUT
      if (!data.id || !data.value) throw new Error('Missing required fields');
      
      const { data: response, error } = await supabase
        .from('my_table')
        .upsert({
          ...data,
          updated_by: user?.id,        // ✓ AUDIT TRAIL
          updated_at: new Date(),      // ✓ TIMESTAMP
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // ✓ VALIDATE RESPONSE - CRITICAL!
      if (!response || response.value !== data.value) {
        throw new Error(`Server rejected: expected ${data.value}, got ${response?.value}`);
      }
      
      return response;
    },
    
    // ✓ OPTIMISTIC UPDATE
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['my_data'] });
      
      const previousData = queryClient.getQueryData(['my_data']);
      
      queryClient.setQueryData(['my_data'], (old) => 
        old ? updateOptimistically(old, newData) : old
      );
      
      return { previousData };
    },
    
    // ✓ ERROR ROLLBACK
    onError: (error, variables, context) => {
      queryClient.setQueryData(['my_data'], context?.previousData);
      toast.error(`Failed: ${error.message}`);
    },
    
    // ✓ SUCCESS CONFIRMATION
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my_data'] });
      toast.success('Saved successfully');
    },
  });
}
```

---

## RLS Policy Audit Template

For each table with RLS, verify:

```sql
-- ✓ Check 1: RLS is enabled
SELECT tablename FROM pg_tables 
WHERE schemaname='public' 
AND tablename='student_scores';

SELECT * FROM pg_class 
WHERE relname='student_scores' 
AND relrowsecurity = true;

-- ✓ Check 2: Policies exist
SELECT policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'student_scores';

-- ✓ Check 3: Admin bypass
-- Admin users should NOT bypass RLS via SECURITY DEFINER functions
-- All checks should use has_role(auth.uid(), role)

-- ✓ Check 4: Self-reference check
-- Student should only see their own:
CREATE POLICY "Students see own data"
  ON public.students FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ✓ Check 5: Teacher-student relationship
-- Teacher should only see students in their assigned classes:
CREATE POLICY "Teachers see assigned students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher')
    AND EXISTS (
      SELECT 1 FROM public.teacher_assignments ta
      JOIN public.classes c ON ta.class_id = c.id
      WHERE ta.teacher_id = auth.uid()
      AND c.id = students.class_id
    )
  );
```

---

## State Machine: Score Edit Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                    SCORE EDIT LIFECYCLE                          │
└──────────────────────────────────────────────────────────────────┘

         [CLOSED]
            │
            ├─ User clicks "Edit"
            │
            ▼
       [OPENING]
            │
            ├─ Load current values
            ├─ Initialize form
            │
            ▼
       [EDITING]
            │
            ├─ User types values ← ❌ Can be lost if dialog closes
            │
            ├─ User clicks "Save"
            │
            ▼
    [SAVING] ← ❌ CURRENT BUG: Dialog closes immediately
            │     Dialog closes before mutation resolves
            │     If mutation fails, form state lost
            │
            ├─ Network request in flight
            │
            ├─ Error?
            │   │
            │   ├─ NO → Go to [SAVED]
            │   │
            │   └─ YES → Dialog already closed! ❌
            │        Form values lost
            │        User unaware of failure
            │
            ▼
       [SAVED]
            │
            ├─ Close dialog (after mutation completes ✓)
            │
            ▼
       [CLOSED]

        [ERROR STATE MISSING] ← ADD THIS
            │
            ├─ Keep dialog open
            ├─ Show error toast
            ├─ User can retry with same values
            │
            └─ User clicks "Cancel" or "Retry"

RECOMMENDED STATE FLOW:

[CLOSED] → [OPENING] → [EDITING] → [SAVING] → ?
                                       │
                                       ├─ Success → [SAVED] → [CLOSING] → [CLOSED]
                                       │
                                       └─ Error → [ERROR] ← User sees this
                                              │
                                              └─ Retry → [SAVING] (again)
                                                   or
                                                 Cancel → [EDITING] (form still open)
```

---

## Race Condition Scenarios Matrix

| Scenario | Trigger | Current Behavior | Fixed Behavior | Risk |
|----------|---------|------------------|-----------------|------|
| **Double-Click Save** | User mashes Save button | 2+ mutations sent | 1 mutation sent | 🔴 High |
| **Inline + Bulk Edit** | User edits inline AND dialog save at same time | Both mutations succeed, may conflict | Queued or serialized | 🔴 High |
| **Real-time + Local Edit** | Other user updates score while you're editing | Cache invalidates, loses your edit | Check update source, merge if safe | 🔴 High |
| **Browser Tab Sync** | Same user in 2 tabs, saves in both | Duplicate updates | Conflict detection | 🟠 Medium |
| **Network Retry** | Mutation fails, user clicks Retry | May create duplicate rows | Idempotent upsert | 🟠 Medium |
| **Auth Refresh Mid-Mutation** | Session token expires mid-request | Mutation fails, unclear to user | Queue retry after refresh | 🟠 Medium |

---

## Error Handling Flowchart

```
User Action
    │
    ├─ Click "Save"
    │
    ├─ Frontend Validation
    │  ├─ Required fields? ✓
    │  ├─ Format valid? ✓
    │  └─ Bounds check? ✓
    │
    ├─ [Guard] Prevent double-click ✓
    │
    ├─ [Optimistic Update] Show new value immediately ✓
    │
    ├─ Mutation Sent to Backend
    │  │
    │  ├─ Network Error?
    │  │  ├─ YES → Rollback optimistic update ✓
    │  │  │        Show error toast ✓
    │  │  │        Keep form open for retry ✓
    │  │  │
    │  │  └─ NO → Continue
    │  │
    │  ├─ RLS Check
    │  │  ├─ FAILED → 401 Unauthorized ✓
    │  │  │           Show error (user can't edit this)
    │  │  │
    │  │  └─ PASSED → Continue
    │  │
    │  ├─ Server-side Validation
    │  │  ├─ Score > max_score? REJECT ✓
    │  │  ├─ Negative score? REJECT ✓
    │  │  ├─ Invalid sub_topic? REJECT ✓
    │  │  │
    │  │  └─ PASSED → Insert/Update
    │  │
    │  ├─ Database Write
    │  │  ├─ FAILED → 500 Error ✓
    │  │  │           Show error
    │  │  │           Keep form open
    │  │  │
    │  │  └─ SUCCESS → Continue
    │  │
    │  └─ Response Returned
    │     │
    │     ├─ [VALIDATION] ← ❌ MISSING
    │     │  Is score in response === input?
    │     │  Is audit entry created?
    │     │
    │     └─ All good → Close dialog ✓
    │
    └─ UI Updated, Cache Invalidated ✓


MISSING VALIDATIONS (Add These):

1. Response Content Validation
   if (response.score !== expectedScore) {
     throw new Error('Server rejected the value');
   }

2. Audit Trail Verification
   const history = await supabase
     .from('score_history')
     .select('*')
     .eq('student_score_id', response.id)
     .order('changed_at', { ascending: false })
     .limit(1)
     .single();
   
   if (!history) throw new Error('Audit entry not created');

3. Idempotency Check
   Add idempotency_key to mutation to prevent duplicates on retry
```

---

## Quick Fix Template: Score Save Function

### Current (Buggy)
```typescript
const handleSaveScores = async (studentId: string, newScores: { subTopicId: string; score: number }[]) => {
  try {
     await updateScoresMutation.mutateAsync({
       studentId,
       scores: newScores,
       academicYear: activeYear
     });
     setEditDialogOpen(false);
  } catch (error) {
    console.error("Failed to save scores:", error);  // ❌ Silent
  }
};
```

### Fixed
```typescript
const [isSaving, setIsSaving] = useState(false);

const handleSaveScores = async (studentId: string, newScores: { subTopicId: string; score: number }[]) => {
  // ✓ Guard: prevent double-click
  if (isSaving) {
    toast.info('Please wait for previous save to complete');
    return;
  }
  
  // ✓ Validate input
  if (!studentId || !newScores.length) {
    toast.error('Invalid input');
    return;
  }
  
  setIsSaving(true);
  
  try {
    // ✓ Await mutation and validate response
    const result = await updateScoresMutation.mutateAsync({
      studentId,
      scores: newScores,
      academicYear: activeYear
    });
    
    // ✓ Verify response
    if (!result || !result.length) {
      throw new Error('Server returned empty response');
    }
    
    // ✓ Verify audit trail
    const allScoresUpdated = result.every(r => 
      newScores.some(ns => ns.subTopicId === r.sub_topic_id && ns.score === r.score)
    );
    if (!allScoresUpdated) {
      throw new Error('Some scores were not saved correctly');
    }
    
    // ✓ Only close after validation passes
    toast.success('Scores saved successfully');
    setEditDialogOpen(false);
    
  } catch (error) {
    // ✓ Show error and keep form open
    toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Dialog stays open, user can retry
  } finally {
    setIsSaving(false);
  }
};
```

---

## Permission Matrix

```
                │ Admin │ Teacher │ Student │ Anonymous
────────────────┼───────┼─────────┼─────────┼───────────
View Dashboard  │  ✓    │    ✓    │    ✓    │    ✗
View All Scores │  ✓    │    ✓*   │    ✗    │    ✗
View Own Scores │  ✓    │    ✓    │    ✓    │    ✗
Edit Scores     │  ✓    │    ✓*   │    ✗    │    ✗
Delete Scores   │  ✓    │    ✓*   │    ✗    │    ✗
Manage Users    │  ✓    │    ✗    │    ✗    │    ✗
View Audit Log  │  ✓    │    ✓*   │    ✗    │    ✗
Manage Classes  │  ✓    │    ✗    │    ✗    │    ✗
Manage Programs │  ✓    │    ✗    │    ✗    │    ✗

✓  = Allowed
✗  = Denied
✓* = Allowed ONLY for assigned students/classes
     ❌ CURRENTLY NOT ENFORCED - FIX REQUIRED
```

---

## Testing Checklist

### Unit Tests
- [ ] `useUpdateStudentScore` validates response score matches input
- [ ] `useUpdateStudentScore` throws on validation failure
- [ ] `handleSaveScores` prevents double-click
- [ ] `handleInlineScoreUpdate` rolls back on error
- [ ] `useCreateUser` populates `created_by` field
- [ ] RLS function `has_role()` returns correct boolean

### Integration Tests
- [ ] Teacher cannot edit scores for unassigned class
- [ ] Student cannot see other student's scores
- [ ] Score mutation creates audit trail entry
- [ ] Real-time update triggers cache invalidation
- [ ] Concurrent mutations merge correctly

### E2E Tests
- [ ] User saves score → verify DB entry created with updated_by
- [ ] User clicks Save twice → only one mutation sent
- [ ] Network error during save → form stays open, shows error
- [ ] Real-time score update arrives → UI updates without losing local edit
- [ ] User changes role → correct permissions enforced on next action

---

## Deployment Checklist

Before deploying to production:

- [ ] All mutations validate response
- [ ] All mutations populate audit fields (created_by, updated_by)
- [ ] Double-click prevention added to all save handlers
- [ ] Error boundaries wrap critical components
- [ ] RLS teacher-class association policy deployed
- [ ] Optimistic updates implemented for score mutations
- [ ] Real-time conflict handling tested
- [ ] E2E tests pass (all scenarios)
- [ ] Load test: 10+ users editing same class concurrently
- [ ] Security audit: RLS policies reviewed
- [ ] Audit trail: sample entries verified in score_history table
- [ ] Rollback plan documented (DB migrations + rollback script)
