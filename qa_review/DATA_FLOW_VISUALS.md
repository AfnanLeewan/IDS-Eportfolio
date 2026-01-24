# 📊 Data Flow Architecture - Visual Reference

## Feature #1: Score Entry Data Flow (Current vs. Recommended)

### CURRENT FLOW (PROBLEMATIC)
```
┌─────────────────────────────────────────────────────────────────────┐
│                    SCORE ENTRY - CURRENT FLOW                       │
└─────────────────────────────────────────────────────────────────────┘

User Interaction Layer
    │
    ├─ ScoresView Component
    │   ├─ State: selectedYear, selectedClass, selectedProgramId
    │   └─ Event: Click "Edit" → handleSaveScores()
    │
    └─ ScoreEditDialog Component
        ├─ State: editedScores = { subTopic1: 15, subTopic2: 25 }
        └─ Event: Click "Save" → onSave(studentId, editedScores)

            ↓ (calls handleSaveScores)

React Query Layer
    │
    ├─ updateScoresMutation.mutateAsync({
    │   ├─ studentId: "S001"
    │   ├─ scores: [{ subTopicId: "ST1", score: 15 }, ...]
    │   └─ academicYear: 2568
    │ })
    │
    └─ ❌ IMMEDIATELY calls: setEditDialogOpen(false)  ← CLOSES DIALOG BEFORE MUTATION COMPLETES
        └─ editedScores state is lost
        └─ If mutation fails, form cannot be recovered

            ↓ (in background)

API/Network Layer
    │
    ├─ supabase.from('student_scores').upsert({
    │   ├─ student_id: "S001"
    │   ├─ sub_topic_id: "ST1"
    │   ├─ score: 15
    │   └─ academic_year: 2568
    │ })
    │
    └─ RLS Check: has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin')
        ├─ ✓ Passes
        └─ ❌ No check: Is teacher assigned to this student's class?

            ↓ (200-500ms later)

Database Layer
    │
    ├─ INSERT/UPDATE into student_scores
    │   ├─ ✓ Row created/updated
    │   ├─ ✓ Trigger creates score_history entry
    │   └─ ❌ created_by/updated_by NOT populated
    │
    └─ Return: { id: "sc_001", student_id: "S001", score: 15, ... }

            ↓ (back to React Query)

Cache Update Layer (React Query)
    │
    ├─ onSuccess triggered
    │   ├─ queryClient.invalidateQueries(['student_scores', 'S001'])
    │   ├─ queryClient.invalidateQueries(['class_scores'])
    │   ├─ queryClient.invalidateQueries(['student_scores_by_year'])
    │   └─ toast.success('บันทึกคะแนนเรียบร้อยแล้ว')
    │
    └─ ❌ Cache invalidation creates 3 separate network requests
        └─ Components re-render multiple times (flickering)

            ↓

Component Re-render Layer
    │
    ├─ ScoresView re-renders
    │   ├─ Fresh query data: Student X scores = [15, 25, ...]
    │   └─ Table shows new scores ✓
    │
    ├─ ScoreEditDialog already unmounted ❌
    │   └─ Form state lost, can't retry
    │
    └─ User sees: Success message, dialog closed, scores updated ✓

User Feedback
    └─ Sees success, but if mutation failed before dialog closed,
       no way to know or retry


ISSUES IN THIS FLOW:
❌ Dialog closes BEFORE mutation completes
❌ Response NOT validated (assumes score was accepted)
❌ No rollback on error
❌ No double-click prevention
❌ Multiple cache invalidations create race window
❌ No audit trail (created_by/updated_by missing)
```

### RECOMMENDED FLOW (SAFE)
```
┌─────────────────────────────────────────────────────────────────────┐
│                    SCORE ENTRY - RECOMMENDED FLOW                    │
└─────────────────────────────────────────────────────────────────────┘

User Interaction Layer
    │
    ├─ ScoresView Component
    │   ├─ State: selectedYear, selectedClass, isSaving = false
    │   └─ Event: Click "Save"
    │
    └─ Guard Check ← NEW
        ├─ if (isSaving || mutation.isPending) return; ✓
        └─ setIsSaving(true)

            ↓

Optimistic Update Layer ← NEW
    │
    ├─ onMutate hook executes BEFORE network request
    │   ├─ Cancel pending queries
    │   ├─ Save previous data for rollback
    │   ├─ Update cache optimistically
    │   └─ Component re-renders immediately with new values
    │       └─ User sees instant feedback ← Better UX
    │
    └─ Return: { previousData: [...] } ← For rollback

            ↓

API/Network Layer
    │
    ├─ supabase.from('student_scores').upsert({
    │   ├─ student_id: "S001"
    │   ├─ score: 15
    │   ├─ updated_by: user.id ← NEW (AUDIT TRAIL)
    │   └─ updated_at: new Date()
    │ })
    │   .select()  ← Request response data back
    │
    └─ RLS Check IMPROVED ← NEW
        ├─ has_role(auth.uid(), 'teacher')
        ├─ AND EXISTS(SELECT 1 FROM teacher_assignments WHERE teacher_id = auth.uid() AND class_id matches...)
        └─ ✓ Teacher can only edit assigned students

            ↓ (200-500ms later)

Database Layer
    │
    ├─ INSERT/UPDATE into student_scores
    │   ├─ ✓ Row created/updated with updated_by = user.id
    │   ├─ ✓ Trigger creates score_history entry with audit trail
    │   └─ ✓ Return updated record in response
    │
    └─ Return: { id: "sc_001", student_id: "S001", score: 15, updated_by: "uuid_123", ... }

            ↓ (back to React Query)

Response Validation Layer ← NEW
    │
    ├─ Check: response.score === expectedScore?
    │   └─ If mismatch: throw Error('Server rejected value')
    │
    ├─ Check: response.updated_by exists?
    │   └─ Verify audit trail was created
    │
    └─ If all valid: Proceed to onSuccess
       If invalid: Trigger onError → Rollback

            ↓

Cache Update Layer (React Query)
    │
    ├─ onSuccess triggered
    │   ├─ ✓ Validation passed
    │   ├─ invalidateQueries ONCE (tagged, batched)
    │   ├─ toast.success('Saved successfully')
    │   └─ setIsSaving(false)
    │
    └─ OR onError triggered
        ├─ Rollback: setQueryData(previousData) ← From onMutate
        ├─ toast.error('Failed to save: <reason>')
        ├─ Dialog STAYS OPEN ← User can retry
        └─ setIsSaving(false)

            ↓

Component Re-render Layer
    │
    ├─ If Success:
    │   ├─ ScoresView updates with new data
    │   ├─ ScoreEditDialog closes ← After validation passes
    │   └─ User sees success message
    │
    └─ If Failure:
        ├─ ScoreEditDialog STAYS OPEN
        ├─ Form shows edited values (user can retry)
        ├─ Error message visible
        └─ User can click Save again

User Feedback
    ├─ Success: "Score saved successfully"
    │   └─ Can be confident it worked
    │
    └─ Failure: "Failed to save: [reason]"
        └─ Can see error and retry immediately


IMPROVEMENTS IN THIS FLOW:
✓ Guard prevents double-click (only 1 mutation)
✓ Optimistic update shows instant feedback
✓ Response validated before cache update
✓ Dialog closes AFTER mutation confirms success
✓ Form remains open if error occurs (can retry)
✓ Rollback on error returns to previous state
✓ Audit trail created (updated_by)
✓ RLS enforces teacher-student relationship
```

---

## Data State Lifecycle: Score Entry

```
NORMAL HAPPY PATH:
═══════════════════════════════════════════════════════════════

Component: { editedScores: { ST1: 50, ST2: 30 } }
Cache:     { classScores: [{ id: S001, scores: [50, 30] }] }
Database:  { student_scores: [{ student_id: S001, sub_topic_id: ST1, score: 50 }, ...] }
User View: Score shows 50 (from cache)
                                    │
                                    ├─ User edits: 50 → 75
                                    │
Component: { editedScores: { ST1: 75, ST2: 30 } }  ← Local only
Cache:     { classScores: [{ id: S001, scores: [50, 30] }] }  ← Still old
Database:  { student_scores: [{ ..., score: 50 }, ...] }  ← Still old
User View: Shows 50 (cache not updated yet)
                                    │
                                    ├─ User clicks Save
                                    │
Component: { editedScores: { ST1: 75, ST2: 30 } }  ← onMutate preserves
Cache:     { classScores: [{ id: S001, scores: [75, 30] }] }  ← OPTIMISTIC UPDATE
Database:  { student_scores: [{ ..., score: 50 }, ...] }  ← Mutation in flight
User View: Shows 75 (optimistic)  ← INSTANT FEEDBACK
                                    │
                                    ├─ 300ms later: Mutation arrives at DB
                                    │
Component: { editedScores: { ST1: 75, ST2: 30 } }
Cache:     { classScores: [{ id: S001, scores: [75, 30] }] }
Database:  { student_scores: [{ ..., score: 75 }, ...] }  ← PERSISTED
User View: Shows 75  ← Matches everything
                                    │
                                    ├─ onSuccess: validate response
                                    │
Component: { editedScores: null, dialogOpen: false }  ← Dialog closes
Cache:     { classScores: [{ id: S001, scores: [75, 30] }] }  ← Confirmed
Database:  { student_scores: [{ ..., score: 75 }, ...] }  ← Confirmed
User View: Shows 75, success toast

✓ ALL STATE CONSISTENT


ERROR PATH (Network Failure):
═══════════════════════════════════════════════════════════════

Component: { editedScores: { ST1: 75, ST2: 30 } }
Cache:     { classScores: [{ id: S001, scores: [75, 30] }] }  ← Optimistic
Database:  { student_scores: [{ ..., score: 50 }, ...] }  ← Still old
User View: Shows 75 (optimistic)
                                    │
                                    ├─ 300ms later: Network error
                                    │
Component: { editedScores: { ST1: 75, ST2: 30 } }  ← KEPT (user can retry)
Cache:     { classScores: [{ id: S001, scores: [50, 30] }] }  ← ROLLED BACK
Database:  { student_scores: [{ ..., score: 50 }, ...] }  ← No change
User View: Shows 50 (rolled back), error toast
                                    │
                                    ├─ onError: Rollback
                                    ├─ User sees form still open with 75 entered
                                    ├─ User can click Save again
                                    │
                                    └─ Try again (repeat flow)

✓ STATE CONSISTENT
✓ USER CAN RECOVER


ERROR PATH (Server Validation Rejects):
═══════════════════════════════════════════════════════════════

User enters: 100 (but max_score is 80)
                                    │
Component: { editedScores: { ST1: 100 } }
Cache:     { classScores: [{ ST1: 100 }] }  ← Optimistic (WRONG!)
Database:  { student_scores: [{ ..., score: 50 }] }  ← Still old
User View: Shows 100
                                    │
                                    ├─ Mutation reaches DB
                                    ├─ Validation: 100 > max_score (80)
                                    ├─ Constraint applied: score capped at 80
                                    └─ Returns: { score: 80 } ← DIFFERENT!
                                    │
Component: { editedScores: { ST1: 100 } }
Cache:     { classScores: [{ ST1: 100 }] }  ← Still optimistic wrong value
Database:  { student_scores: [{ ..., score: 80 }] }  ← Constrained
User View: Shows 100
                                    │
                                    ├─ Response validation:
                                    │  if (response.score !== 100) throw Error
                                    │
Component: { editedScores: { ST1: 100 } }
Cache:     { classScores: [{ ST1: 80 }] }  ← ROLLED BACK to DB value
Database:  { student_scores: [{ ..., score: 80 }] }
User View: Shows 80, error: "Score mismatch: expected 100, got 80. Max score is 80"
                                    │
                                    ├─ User sees error
                                    ├─ Form shows 100 (can edit and retry)
                                    ├─ User changes to 75
                                    └─ Clicks Save again

✓ ERROR DETECTED
✓ USER INFORMED
✓ USER CAN RECOVER
```

---

## Cache Invalidation Pattern: Before vs. After

### CURRENT (Multiple Invalidations)
```
onSuccess fires
  │
  ├─ invalidateQueries(['student_scores', 'S001'])
  │   └─ Marks query as stale
  │   └─ Component re-fetches
  │
  ├─ invalidateQueries(['class_scores'])
  │   └─ Marks query as stale
  │   └─ Component re-fetches (if subscribed)
  │
  ├─ invalidateQueries(['student_scores_by_year'])
  │   └─ Marks query as stale
  │   └─ Component re-fetches (if subscribed)
  │
  └─ RACE WINDOW:
      Between marking stale and refetch completing
      Components may read inconsistent data
      Multiple re-renders (3+)
      Flickering possible
```

### RECOMMENDED (Atomic Invalidation)
```
onSuccess fires
  │
  ├─ Batch all invalidations:
  │   invalidateQueries({ 
  │     predicate: (query) => 
  │       query.queryKey[0] === 'student_scores' ||
  │       query.queryKey[0] === 'class_scores'
  │   })
  │
  └─ Single re-render with consistent data
      No race window
      Better UX
```

---

## Real-Time Sync: Conflict Detection

```
WITHOUT CONFLICT DETECTION (Current):
════════════════════════════════════════

User A View:              User B View:              Database:
Score: 50          →      Score: 50         →      score: 50

User A edits: 75          User B edits: 80          
  (local)                   (local)

User A saves              User B saves
  ↓                         ↓
Mutation A sent           Mutation B sent
  (50→75)                   (50→80)

                Real-time broadcast: Student X updated
                  ↓ (to both User A and User B)
                
User A:                   User B:
invalidate cache          invalidate cache
refetch...                refetch...

Mutation A completes:     Mutation B completes:
score = 75 ← DB           score = 80 ← DB

Refetch 1 completes:      Refetch 2 completes:
Score: 80 (from Mutation B)  Score: 75 (from Mutation A)

RESULT: Last refetch to complete wins
        User A sees 75 (correct from their perspective)
        User B sees 75 (WRONG! They saved 80)


WITH CONFLICT DETECTION (Recommended):
════════════════════════════════════════

Real-time broadcast includes: updated_by: "user_b_id"

User A receives broadcast:
  └─ Check: is updated_by === currentUser.id?
     └─ NO (it's user_b_id)
     └─ Safe to invalidate cache
     └─ User A refetches, sees 80
     └─ Toast: "Score updated by another user"

User B receives broadcast:
  └─ Check: is updated_by === currentUser.id?
     └─ YES (it's user_b_id)
     └─ DON'T invalidate cache yet
     └─ Wait for User B's own mutation to complete
     └─ User B's mutation confirms score = 80

RESULT: No conflict, correct values everywhere
```

---

## React Query State Machine: Mutation States

```
┌─────────────────────────────────────────────────────────────┐
│              MUTATION STATE TRANSITIONS                     │
└─────────────────────────────────────────────────────────────┘

                        START
                          │
                          ├─ User clicks Save
                          │
                    ┌─────▼──────┐
                    │  IDLE       │
                    │ (waiting)   │
                    └─────┬──────┘
                          │
                          ├─ User triggers mutation
                          │
                    ┌─────▼──────┐
                    │ onMutate   │  ← NEW in fixed version
                    │ (prep)     │    - Save previous state
                    └─────┬──────┘    - Update cache optimistically
                          │           - Show loading UI
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
   [Network Request]               [Optimistic UI Update]
        │                                   │
        ├─ Success? ────────┐             │ User sees new value
        │   └─ Response OK   │             │
        │     Validation OK  │             │
        │                   │             │
        │ Failure? ────┐    │             │
        │   └─ Network │    │             │
        │     Error    │    │             │
        │   └─ Server  │    │             │
        │     Error    │    │             │
        │              │    │             │
        │         ┌────▼─────────┐       │
        │         │   onSuccess  │◄──────┘
        │         │  (confirm)   │
        │         └────┬─────────┘
        │              │
        │              ├─ Validate response
        │              ├─ Invalidate cache
        │              ├─ Refetch data
        │              └─ Show toast
        │
        │         ┌───────────┐
        │         │  SUCCESS  │
        │         └───────────┘
        │
        └──────┐
               │
          ┌────▼──────────┐
          │   onError      │
          │   (rollback)   │
          └────┬───────────┘
               │
               ├─ Restore previous state
               ├─ Roll back optimistic update
               ├─ Keep dialog open
               ├─ Show error message
               └─ Enable retry button
               │
               │  ┌────────────┐
               └─►│   ERROR    │
                  │  (retry)   │
                  └────────────┘
                        │
                        └─ User clicks Retry
                           └─ Loop back to mutation
```

---

## State Synchronization Matrix: All Features

```
┌─────────────┬──────────────┬───────────┬──────────┬────────────┐
│  Feature    │ Local State  │ RQ Cache  │ Database │ Consistent │
├─────────────┼──────────────┼───────────┼──────────┼────────────┤
│ Score Entry │              │           │          │            │
│  (Current)  │ ✓ (form)     │ ✓ (data)  │ ✓ (DB)   │ ❌ NO      │
│             │ Dialog close │ Multi-    │ Audit    │            │
│             │ → lose form  │ invalidate│ missing  │            │
├─────────────┼──────────────┼───────────┼──────────┼────────────┤
│ Score Entry │              │           │          │            │
│  (Fixed)    │ ✓ (form)     │ ✓ (opt)   │ ✓ (DB)   │ ✓ YES      │
│             │ Form stays   │ Stays     │ Audit    │            │
│             │ if error     │ consistent│ trail    │            │
├─────────────┼──────────────┼───────────┼──────────┼────────────┤
│ Auth        │ ✓ (user)     │ N/A       │ ✓ (DB)   │ ⚠️  RACE   │
│             │ Race between │           │ Profile  │            │
│             │ listener &   │           │ loading  │            │
│             │ getSession   │           │          │            │
├─────────────┼──────────────┼───────────┼──────────┼────────────┤
│ User Mgmt   │ ✓ (manual)   │ ❌ None   │ ✓ (DB)   │ ⚠️  DRIFT  │
│             │ Setusers()   │ No RQ     │          │            │
│             │              │ tracking  │          │            │
├─────────────┼──────────────┼───────────┼──────────┼────────────┤
│ Real-Time   │ ✓ (values)   │ ✓ (cache) │ ✓ (DB)   │ ❌ CONFLICT│
│             │              │ Invalidate│ May      │            │
│             │              │ always    │ conflict │            │
├─────────────┼──────────────┼───────────┼──────────┼────────────┤
│ Dashboard   │ ✓ (student)  │ ✓ (scores)│ ✓ (DB)   │ ✓ YES      │
│             │              │ Read-only │          │            │
└─────────────┴──────────────┴───────────┴──────────┴────────────┘

Legend:
✓ Consistent
⚠️  Potential issue
❌ Broken
N/A Not applicable
```
