# 🔍 Comprehensive QA Review: IDS E-Portfolio System
**Stack:** React + TypeScript + Supabase + TanStack React Query  
**Date:** January 24, 2026  
**Reviewer:** Senior Full-Stack Lead & QA Engineer

---

## Executive Summary

The IDS E-Portfolio system is a **React-based educational dashboard** with role-based access control (RBAC) for managing student scores across an academic hierarchy. While the architecture leverages solid modern patterns (React Query, Supabase RLS), **several critical data synchronization risks and race conditions have been identified** that require immediate remediation.

**Overall Risk Level:** 🟠 **MEDIUM-HIGH**

---

## 1. AUTHENTICATION & AUTHORIZATION FLOW

### Architecture
```
Auth.tsx (Supabase) 
  ↓
AuthContext (role state)
  ↓
Protected Routes (Index.tsx)
  ↓
Role-gated UI Components
```

### ✅ Strengths
- **RLS Policies:** Database-level enforcement with `has_role()` security definer function
- **Session Management:** Proper `onAuthStateChange` listener with cleanup
- **Role Enum:** Type-safe `app_role` enum in database

### ⚠️ Issues Found

#### Issue #1: Race Condition in AuthContext Initialization
**Location:** [AuthContext.tsx](src/contexts/AuthContext.tsx#L76-L99)

```typescript
// PROBLEM: Two concurrent fetches of user data
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserData(session.user.id);  // Fetch #1
        }, 0);
      }
      setLoading(false);
    }
  );

  // Deferred with setTimeout!
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      await fetchUserData(session.user.id);  // Fetch #2
    }
    setLoading(false);  // This can race and set loading AFTER the listener
  });
});
```

**Risk:** 
- Both `onAuthStateChange` listener and `getSession()` can trigger `fetchUserData()` simultaneously
- `setLoading(false)` may be called twice in unpredictable order
- If listener completes after `getSession()`, the UI shows "loading complete" but profile/role may update 50ms later, causing flash/stale state

**Impact:** Moderate - Most users won't see this, but race conditions can manifest under slow networks

**Recommendation:**
```typescript
let isMounted = true;

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    }
  );

  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!isMounted) return;
    
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      await fetchUserData(session.user.id);
    }
    setLoading(false);
  });

  return () => {
    isMounted = false;
    subscription?.unsubscribe();
  };
}, []);
```

---

## 2. DATA FETCHING & SYNCHRONIZATION

### Core Hook: `useSupabaseData.ts`

#### Issue #2: Missing Error State in Query Hooks
**Location:** [useSupabaseData.ts - Multiple locations](src/hooks/useSupabaseData.ts#L60-L90)

```typescript
// Example: useSubjects() - NO ERROR HANDLING
export function useSubjects(programId?: string) {
  return useQuery({
    queryKey: programId ? queryKeys.subjectsByProgram(programId) : queryKeys.subjects,
    queryFn: async () => {
      let query = supabase.from('subjects').select('*').order('display_order');
      if (programId) query = query.eq('program_id', programId);
      
      const { data, error } = await query;
      if (error) throw error;  // ✓ Error is thrown
      return data;
    },
    // ❌ NO error boundary, NO UI feedback for failures
  });
}
```

**Risk:** If a query fails, users see no error message. The component continues with stale data.

**Components affected:**
- `useSubjects()`
- `useClasses()`
- `useExamPrograms()`
- `useClassScores()` ← **Critical for scores view**

**Recommendation:** Add error handling to critical queries:
```typescript
export function useClassScores(classId: string = 'all') {
  return useQuery<any[]>({
    queryKey: queryKeys.classScores(classId),
    queryFn: async () => { /* ... */ },
    onError: (error: Error) => {
      toast.error(`Failed to load class scores: ${error.message}`);
    },
  });
}
```

---

#### Issue #3: Mutation Success Without Response Validation
**Location:** [useSupabaseData.ts - Score Mutations](src/hooks/useSupabaseData.ts#L330-L370)

```typescript
export function useUpdateStudentScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      studentId, 
      subTopicId, 
      score, 
      academicYear 
    }: { /* ... */ }) => {
      const { data, error } = await supabase
        .from('student_scores')
        .upsert({
          student_id: studentId,
          sub_topic_id: subTopicId,
          score,
          academic_year: academicYear,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id, sub_topic_id' })
        .select()
        .single();

      if (error) throw error;
      return data;  // ❌ NO VALIDATION - assumes server accepted the value
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentScores(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: ['class_scores'] });
      queryClient.invalidateQueries({ queryKey: ['student_scores_by_year'] });
      // ✓ Cache invalidation is good, but...
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาดในการบันทึกคะแนน: ${error.message}`);
    },
  });
}
```

**Risk:**
1. **No response validation**: If server applies RLS and rejects the update silently, `data` is still truthy
2. **Assumes UI value matches backend**: Score clamping/validation may differ
3. **No audit check**: Score history isn't verified to have been created

**Critical Scenario:**
```
User edits score: 95 → 150 (exceeds max_score of 100)
Frontend may clamp to 100, but backend accepts 95 as stored
Cache invalidation succeeds → fresh data loads 95
User thinks 100 was saved, but 95 is persisted

OR if backend RLS fails silently:
Data returned but not actually persisted
Fresh query after invalidation loads stale score
```

**Recommendation:**
```typescript
mutationFn: async ({ /* ... */ }) => {
  const { data, error } = await supabase
    .from('student_scores')
    .upsert({/* ... */})
    .select()
    .single();

  if (error) throw error;
  
  // VALIDATE response
  if (!data || data.score !== score) {
    throw new Error('Score mismatch: expected ' + score + ', got ' + (data?.score ?? 'null'));
  }
  
  return data;
},
```

---

#### Issue #4: Race Condition - Double-Click Save
**Location:** [ScoresView.tsx - handleSaveScores](src/components/scores/ScoresView.tsx#L336-L346)

```typescript
const handleSaveScores = async (studentId: string, newScores: { subTopicId: string; score: number }[]) => {
  try {
     await updateScoresMutation.mutateAsync({  // ❌ NO LOADING STATE CHECK
       studentId,
       scores: newScores,
       academicYear: activeYear
     });
     setEditDialogOpen(false);
  } catch (error) {
    console.error("Failed to save scores:", error);
  }
};
```

**Risk:** User clicks "Save" → mutation in flight → user clicks "Save" again → **two mutations sent**

**Race Condition Scenario:**
```
1. User clicks Save (Mutation A sent to DB)
2. Before response, user clicks Save again (Mutation B sent to DB)
3. Both mutations execute on DB
4. Cache invalidation happens 2x (harmless but wasteful)
5. If one fails and one succeeds, user sees success but partial data
```

**Recommendation:**
```tsx
const [isSaving, setIsSaving] = useState(false);

const handleSaveScores = async (studentId: string, newScores: { subTopicId: string; score: number }[]) => {
  if (isSaving) return; // ← GUARD AGAINST DOUBLE-CLICK
  
  try {
    setIsSaving(true);
    await updateScoresMutation.mutateAsync({
      studentId,
      scores: newScores,
      academicYear: activeYear
    });
    setEditDialogOpen(false);
  } catch (error) {
    console.error("Failed to save scores:", error);
  } finally {
    setIsSaving(false);
  }
};

// Disable button while saving:
<Button disabled={isSaving || updateScoresMutation.isPending}>
  {isSaving ? 'Saving...' : 'Save'}
</Button>
```

---

#### Issue #5: Optimistic Update Not Implemented
**Location:** [ScoresView.tsx](src/components/scores/ScoresView.tsx#L330-L360)

**Current Flow:**
```
User edits score
  ↓
Click Save
  ↓
Mutation sent to DB (user waits)
  ↓
Response returns
  ↓
Cache invalidated
  ↓
Fresh query re-fetches all class scores
  ↓
UI updates (500ms+ delay)
```

**Better Pattern:**
```typescript
mutationFn: async ({ /* ... */ }) => { /* server call */ },
onMutate: async (newData) => {
  // Cancel pending queries
  await queryClient.cancelQueries({ 
    queryKey: queryKeys.classScores(newData.studentId) 
  });
  
  // Save previous data for rollback
  const previousScores = queryClient.getQueryData(
    queryKeys.classScores(newData.studentId)
  );
  
  // Optimistically update UI
  queryClient.setQueryData(
    queryKeys.classScores(newData.studentId),
    (old) => updateScoresOptimistically(old, newData)
  );
  
  return { previousScores };
},
onError: (err, newData, context) => {
  // Rollback on error
  queryClient.setQueryData(
    queryKeys.classScores(newData.studentId),
    context?.previousScores
  );
  toast.error('Failed to save. Reverted.');
},
```

**Impact:** Current UX feels laggy. 100-300ms optimization possible.

---

## 3. STATE MANAGEMENT & COMPONENT LOGIC

#### Issue #6: Form State Not Reset on Error
**Location:** [ScoreEditDialog.tsx](src/components/scores/ScoreEditDialog.tsx#L40-L60)

```typescript
const handleOpenChange = (isOpen: boolean) => {
  if (isOpen && student && subject) {
    // Initialize scores when opening
    const initialScores: Record<string, number> = {};
    subject.subTopics.forEach((subTopic) => {
      const scoreEntry = student.scores.find((s) => s.subTopicId === subTopic.id);
      initialScores[subTopic.id] = scoreEntry?.score || 0;
    });
    setEditedScores(initialScores);
  }
  onOpenChange(isOpen);  // ❌ Form NOT cleared on save failure
};

const handleSave = () => {
  if (!student || !subject) return;
  const scores = Object.entries(editedScores).map(([subTopicId, score]) => ({
    subTopicId,
    score,
  }));
  onSave(student.id, scores);  // ❌ CALLS onSave, doesn't wait for result
  onOpenChange(false);  // ❌ Closes dialog IMMEDIATELY
};
```

**Risk:**
1. Dialog closes before mutation completes
2. If mutation fails, form state is lost
3. User unaware if save actually succeeded or just closed

**Scenario:**
```
1. User opens dialog, enters scores [10, 20, 30]
2. Clicks Save
3. Dialog closes immediately (onOpenChange(false))
4. Network error occurs in background
5. User doesn't know save failed
6. When they re-open, they see old scores, confused
```

**Recommendation:**
```typescript
const handleSave = async () => {
  if (!student || !subject) return;
  try {
    const scores = Object.entries(editedScores).map(([subTopicId, score]) => ({
      subTopicId,
      score,
    }));
    
    // AWAIT the result
    await onSave(student.id, scores);
    
    // Only close if successful
    onOpenChange(false);
  } catch (error) {
    // Form stays open, user sees error, can retry
    toast.error(`Failed to save: ${error.message}`);
  }
};
```

And update the caller:
```typescript
const handleSaveScores = async (
  studentId: string, 
  newScores: { subTopicId: string; score: number }[]
) => {
  await updateScoresMutation.mutateAsync({
    studentId,
    scores: newScores,
    academicYear: activeYear
  });
};
```

---

#### Issue #7: Inline Score Update Missing Feedback
**Location:** [ScoresView.tsx - handleInlineScoreUpdate](src/components/scores/ScoresView.tsx#L347-L356)

```typescript
const handleInlineScoreUpdate = async (studentId: string, subTopicId: string, newScore: number) => {
  try {
    await updateScoreMutation.mutateAsync({
      studentId,
      subTopicId,
      score: newScore,
      academicYear: activeYear
    });
  } catch (error) {
    console.error("Failed to update score inline:", error);  // ❌ Silent failure
  }
};
```

**Risk:**
- User clicks inline edit, UI updates optimistically
- Network error occurs
- UI stays in edited state (no rollback)
- User thinks score was saved, but wasn't

**Recommendation:**
```typescript
const handleInlineScoreUpdate = async (
  studentId: string, 
  subTopicId: string, 
  newScore: number,
  previousScore: number  // For rollback
) => {
  // Show loading state on that specific cell
  setCellLoading(`${studentId}-${subTopicId}`, true);
  
  try {
    await updateScoreMutation.mutateAsync({
      studentId,
      subTopicId,
      score: newScore,
      academicYear: activeYear
    });
    toast.success('Score updated');
  } catch (error) {
    // Revert the cell value
    setStudents(prev => prev.map(s => 
      s.id === studentId 
        ? { 
            ...s, 
            scores: s.scores.map(sc => 
              sc.subTopicId === subTopicId 
                ? { ...sc, score: previousScore }  // ROLLBACK
                : sc
            )
          }
        : s
    ));
    toast.error(`Failed to update: ${error.message}`);
  } finally {
    setCellLoading(`${studentId}-${subTopicId}`, false);
  }
};
```

---

## 4. RBAC & SECURITY

### Database RLS Policies

#### ✅ Strengths
- **Role-based function:** `has_role(_user_id, _role)` centralized
- **Student self-view:** Students can only see own scores
- **Teacher/Admin separation:** Clear permission hierarchy

#### ⚠️ Issue #8: Missing Teacher-Class Association Check

**Location:** Database schema doesn't enforce teacher-student relationship

```sql
-- Current student_scores RLS (from DB)
CREATE POLICY "Teachers and admins can insert scores"
  ON public.student_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  );
```

**Risk:** 
- ANY teacher can insert scores for ANY student
- No verification that teacher teaches the student's class
- Teacher A can enter scores for Class B's students

**Should be:**
```sql
CREATE POLICY "Teachers and admins can insert scores"
  ON public.student_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    (
      public.has_role(auth.uid(), 'teacher')
      AND EXISTS (
        SELECT 1 FROM public.teacher_assignments ta
        WHERE ta.teacher_id = auth.uid()
        AND ta.subject_id IN (
          SELECT sub_topic_id FROM public.sub_topics
          WHERE sub_topic_id = sub_topic_id  -- Match the subject
        )
      )
    )
  );
```

Or use a simpler check via teacher_assignments table (see below).

---

#### Issue #9: Missing Audit Trail Enforcement

**Location:** [useSupabaseData.ts - Score mutations](src/hooks/useSupabaseData.ts#L330-L370)

```typescript
mutationFn: async ({ studentId, subTopicId, score, academicYear }) => {
  const { data, error } = await supabase
    .from('student_scores')
    .upsert({
      student_id: studentId,
      sub_topic_id: subTopicId,
      score,
      academic_year: academicYear,
      updated_at: new Date().toISOString()
      // ❌ NO created_by or updated_by
      // ❌ NO trigger to create score_history entry
    }, { onConflict: 'student_id, sub_topic_id' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

**Risk:**
- No audit trail of who changed what score
- Compliance risk for academic records
- Can't investigate disputes or cheating

**Schema has the field** but it's not being populated:
```sql
CREATE TABLE public.student_scores (
  -- ...
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  -- ...
);
```

**Recommendation:**
```typescript
mutationFn: async ({ studentId, subTopicId, score, academicYear }) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('student_scores')
    .upsert({
      student_id: studentId,
      sub_topic_id: subTopicId,
      score,
      academic_year: academicYear,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,  // ← ADD
      created_by: user?.id,  // ← ADD (upsert handles this)
    }, { onConflict: 'student_id, sub_topic_id' })
    .select()
    .single();
  
  if (error) throw error;
  
  // Verify audit entry was created by DB trigger
  return data;
}
```

---

#### Issue #10: User Role Change Not Reflected Until Refresh

**Location:** [UserManagement.tsx - handleRoleChange](src/components/admin/UserManagement.tsx#L145-L165)

```typescript
const handleRoleChange = async (userId: string, newRole: AppRole) => {
  setUpdating(userId);

  const { error } = await supabase
    .from('user_roles')
    .update({ role: newRole })
    .eq('user_id', userId);

  if (error) {
    toast({ title: 'Error', description: 'Could not change role', variant: 'destructive' });
  } else {
    toast({ title: 'Success', description: `Changed to ${roleLabels[newRole]}` });
    // Update local state
    setUsers(users.map((u) => 
      u.user_id === userId ? { ...u, role: newRole } : u
    ));
  }

  setUpdating(null);
};
```

**Risk:**
- The changed user doesn't see their new role until page refresh
- Their AuthContext still has old `role` value
- Any RLS checks based on new role fail
- In a multi-window scenario, user in other tab doesn't see change

**Note:** This is by design in Supabase - RLS checks happen at query time. The user's `role` in AuthContext gets refreshed when their session refreshes (typically on next page load or logout/login).

**Workaround:**
```typescript
const handleRoleChange = async (userId: string, newRole: AppRole) => {
  setUpdating(userId);

  try {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) throw error;
    
    // Invalidate role cache
    queryClient.invalidateQueries({ queryKey: ['user_roles'] });
    
    // If this is the current user, force re-fetch of AuthContext
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.id === userId) {
      // Refresh AuthContext by calling fetchUserData
      // (This would require exposing a refresh function from AuthContext)
      toast.info('Your role has been updated. Please refresh the page.');
    }
    
    toast.success(`Changed to ${roleLabels[newRole]}`);
    setUsers(users.map((u) => 
      u.user_id === userId ? { ...u, role: newRole } : u
    ));
  } catch (error) {
    toast.error(`Error: ${error.message}`);
  } finally {
    setUpdating(null);
  }
};
```

---

## 5. REAL-TIME SYNCHRONIZATION

### Hook: `useRealtime.ts`

#### ✅ Strengths
- Postgres Change subscription implemented
- Proper cache invalidation on changes
- Toast notifications for updates

#### Issue #11: No Conflict Resolution for Concurrent Updates

**Location:** [useRealtime.ts](src/hooks/useRealtime.ts#L20-L45)

```typescript
export function useRealtimeScores(classId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!enabled || !classId) return;
    
    const channel = supabase
      .channel(`scores-${classId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_scores',
        },
        (payload) => {
          // Invalidate and refetch
          queryClient.invalidateQueries({ queryKey: queryKeys.classScores(classId) });
          // ...
        }
      )
      .subscribe();
```

**Risk:** Race condition when:
1. Local user makes a change
2. Before mutation completes, a real-time notification arrives for the same student
3. Invalidation clears local state before mutation returns
4. Optimistic update is lost

**Scenario:**
```
User A opens ScoresView for Class 1, loads scores [Student X: 50]

User B changes Student X's score to 80 (real-time broadcast)
  → Invalidates cache
  → useRealtimeScores refetches
  → Local query now shows 80

User A clicks inline edit for Student X: 50 → 75
  → updateScoreMutation in flight
  → Cache invalidation happens on subscription
  → User A's change to 75 is lost when cache revalidates with 80
```

**Recommendation:**
```typescript
on('postgres_changes', {/* ... */}, (payload) => {
  // Only invalidate if the change is NOT from current user
  const isOwnChange = payload.new?.updated_by === currentUserId;
  
  if (!isOwnChange) {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.classScores(classId) 
    });
    toast.info('Scores updated by another user');
  }
}),
```

Or implement conflict-free merge:
```typescript
(payload) => {
  if (payload.eventType === 'UPDATE') {
    // Merge incoming change with local state
    const prevScores = queryClient.getQueryData(
      queryKeys.classScores(classId)
    );
    const merged = mergeScoreChanges(prevScores, payload.new);
    queryClient.setQueryData(
      queryKeys.classScores(classId),
      merged
    );
  }
}
```

---

## 6. ERROR HANDLING & FALLBACKS

#### Issue #12: Missing Error Boundary for Critical Components

```typescript
// ScoresView has no error boundary
export function ScoresView({ students: initialStudents = [] }: ScoresViewProps) {
  // 15+ hooks, any can fail
  const { data: programs = [], isLoading: programsLoading } = useYearPrograms(activeYearId);
  const { data: subjectsFromDB = [], isLoading: subjectsLoading, error: subjectsError } = useSubjectWithTopics(...);
  const { data: classesFromDB = [], isLoading: classesLoading } = useYearClasses(activeYearId);
  
  // ❌ Only subjectsError is captured, others are ignored
  
  // No error boundary, no fallback UI
```

**Recommendation:**
```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error, resetErrorBoundary}) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-700">Error Loading Scores</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-600 mb-4">{error.message}</p>
        <Button onClick={resetErrorBoundary}>Retry</Button>
      </CardContent>
    </Card>
  )
}

export function ScoresViewWithBoundary(props: ScoresViewProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ScoresView {...props} />
    </ErrorBoundary>
  );
}
```

---

## 7. INLINE CHECKLIST OF FLAGGED FUNCTIONS

| Function | File | Risk | Issue |
|----------|------|------|-------|
| `fetchUserData` | AuthContext.tsx | 🟠 Medium | Race condition in initialization |
| `useSubjects` | useSupabaseData.ts | 🟠 Medium | No error state UI |
| `useClassScores` | useSupabaseData.ts | 🟠 Medium | No error state UI |
| `useUpdateStudentScore` | useSupabaseData.ts | 🔴 High | No response validation |
| `useUpdateStudentScores` | useSupabaseData.ts | 🔴 High | No response validation |
| `handleSaveScores` | ScoresView.tsx | 🔴 High | Double-click race condition |
| `handleInlineScoreUpdate` | ScoresView.tsx | 🔴 High | Silent failure, no rollback |
| `handleSave` | ScoreEditDialog.tsx | 🔴 High | Closes before mutation completes |
| `handleRoleChange` | UserManagement.tsx | 🟡 Low-Medium | Role change not reflected until refresh |
| `useRealtimeScores` | useRealtime.ts | 🔴 High | Concurrent update conflicts |
| Student Score RLS | migrations/*.sql | 🔴 High | Missing teacher-class check |
| Score insert/update | mutations | 🔴 High | No audit trail (`created_by`, `updated_by`) |

---

## 8. RECOMMENDED REMEDIATION PRIORITY

### Phase 1 - CRITICAL (Do First)
- [ ] Add mutation response validation (Issue #3)
- [ ] Fix double-click save guard (Issue #4)
- [ ] Add teacher-class association RLS (Issue #8)
- [ ] Implement audit trail for scores (Issue #9)
- [ ] Fix dialog close timing (Issue #6)

### Phase 2 - HIGH (Do Soon)
- [ ] Add optimistic updates to score mutations (Issue #5)
- [ ] Implement proper error UI for queries (Issue #2)
- [ ] Add error boundary to critical components (Issue #12)
- [ ] Add inline update rollback (Issue #7)
- [ ] Fix AuthContext race condition (Issue #1)

### Phase 3 - MEDIUM (Plan)
- [ ] Implement real-time conflict resolution (Issue #11)
- [ ] Expose role refresh in AuthContext (Issue #10)
- [ ] Add loading indicators for async operations

---

## 9. TESTING RECOMMENDATIONS

### Unit Tests Needed
```typescript
// ✓ Test response validation in mutations
test('updateStudentScore throws if response score != input score', () => {
  // Mock server returning different value than expected
  // Verify error is thrown
});

// ✓ Test double-click prevention
test('handleSaveScores ignores second click while first is in flight', () => {
  // Simulate click, click again before first completes
  // Verify only one mutation sent
});
```

### Integration Tests Needed
```typescript
// ✓ Test concurrent updates
test('ScoresView handles real-time update while user editing same student', () => {
  // User A editing Student X
  // User B updates Student X in real-time
  // Verify conflict handled (merge or show warning)
});

// ✓ Test RLS enforcement
test('Teacher cannot insert scores for students not in their class', () => {
  // Create teacher role
  // Try to insert score for unassigned student
  // Verify RLS blocks it
});
```

### E2E Tests Needed
```gherkin
Scenario: User saves score twice (double-click)
  Given ScoresView is open with editable cell
  When user enters value and clicks Save twice rapidly
  Then only one API request is sent
  And user sees success message once
  
Scenario: Score edit dialog fails
  Given dialog is open with unsaved scores
  When network error occurs during save
  Then dialog remains open
  And user can see error message
  And form retains edited values for retry
```

---

## 10. CONCLUSION

The IDS E-Portfolio system has a **solid foundation** with React Query and Supabase RLS, but several **data synchronization gaps** create risks around:

1. **Data Integrity:** Mutations don't validate responses
2. **Concurrency:** Double-clicks and real-time conflicts unhandled
3. **User Feedback:** Silent failures on network errors
4. **Audit & Security:** Missing teacher-class checks and audit trails

**Estimated effort to remediate:** 15-20 developer hours  
**Recommended timeline:** 2-3 sprints (Phase 1 in next sprint)

All identified issues have provided code examples and are non-blocking for MVP but should be addressed before production deployment.

---

**Generated:** 2026-01-24  
**Reviewer:** Senior Full-Stack Lead & QA Engineer
