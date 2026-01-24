# 🔄 Data Flow Analysis - Core Features Deep Dive

## Feature Overview

This document traces the complete data flow for each core feature, identifying state synchronization risks, race conditions, and error handling gaps.

### Features Analyzed
1. **Student Score Entry** (Most Critical)
2. **User Authentication** (Foundation)
3. **User Management** (Admin)
4. **Real-Time Score Synchronization**
5. **Student Dashboard**

---

## FEATURE #1: Student Score Entry & Editing

### Feature Flow Overview
```
Teacher views ScoresView
  ↓
Selects Program → Selects Year → Selects Class
  ↓
Loads students with scores
  ↓
Clicks edit on student
  ↓
ScoreEditDialog opens
  ↓
Edits values manually or uploads CSV
  ↓
Clicks Save
  ↓
Mutation sent to database
  ↓
Cache invalidated & UI updated
```

### Data Flow Trace

**Component Stack:**
```
ScoresView (Container)
  ├─ Header (navigation)
  ├─ YearSelector (state: selectedYear)
  ├─ ProgramSelector (state: selectedProgramId)
  ├─ ClassSelector (state: selectedClass)
  └─ StudentScoresTable
      └─ [For each student]
          ├─ InlineEditCell (state: cellValue)
          └─ EditButton
              └─ ScoreEditDialog
                  └─ ScoreInputFields (state: editedScores)
```

### Database Query Chain

**Step 1: Load Programs for Year**
```typescript
// From useSupabaseData.ts
export function useYearPrograms(yearId: string) {
  return useQuery({
    queryKey: ['year_programs', yearId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_classes')
        .select('program_id, programs(*)')
        .eq('academic_year_id', yearId);
      
      if (error) throw error;
      return data; // ❌ ISSUE: No validation
    },
  });
}

// Flow: Database → Query result → Component state (selectedProgramId)
```

**Step 2: Load Classes for Program & Year**
```typescript
export function useYearClasses(yearId: string) {
  return useQuery({
    queryKey: ['year_classes', yearId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_classes')
        .select('class_id, classes(*)')
        .eq('academic_year_id', yearId);
      
      if (error) throw error;
      return data;
    },
  });
}

// Flow: Database → Query result → Component state (selectedClass)
```

**Step 3: Load Students with Scores**
```typescript
export function useClassScores(classId: string = 'all') {
  return useQuery<any[]>({
    queryKey: queryKeys.classScores(classId),
    queryFn: async () => {
      let studentsQuery = supabase
        .from('students')
        .select(`
          id,
          name,
          class_id,
          student_scores (
            id,
            sub_topic_id,
            score,
            exam_date,
            updated_at
          )
        `)
        .eq('is_active', true);
      
      if (classId !== 'all') {
        studentsQuery = studentsQuery.eq('class_id', classId);
      }
      
      const { data, error } = await studentsQuery;
      if (error) throw error;
      
      // ❌ ISSUE #1: No data validation
      // ❌ ISSUE #2: No error state UI
      
      return data;
    },
    // ❌ ISSUE #3: No onError handler
  });
}

// Flow: Database → Joined student_scores → Component state (students)
```

### State Management Trace

**Local Component State:**
```typescript
// ScoresView.tsx
const [selectedYear, setSelectedYear] = useState<number | null>(null);
const [selectedProgramId, setSelectedProgramId] = useState<string>("");
const [selectedClass, setSelectedClass] = useState<string>("all");
const [searchQuery, setSearchQuery] = useState("");
const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);

// ✓ Good: Clear state boundaries
// ⚠️  Issue: No persistent state (lost on refresh)
// ⚠️  Issue: Year selection persists but class doesn't sync
```

**React Query Cache State:**
```typescript
// Queries automatically cached:
queryKeys.classScores(classId)           // ← Main data source
queryKeys.studentScores(studentId)       // ← Individual student
queryKeys.classStats(classId)            // ← Statistics

// ✓ Good: Normalized cache keys
// ❌ Issue: Multiple queries can get out of sync
```

**Form State in ScoreEditDialog:**
```typescript
const [editedScores, setEditedScores] = useState<Record<string, number>>({});

// Flow:
// 1. Dialog opens → Initialize from student.scores
// 2. User edits → setEditedScores (local state)
// 3. User clicks Save → onSave(editedScores)
// 4. ❌ Dialog closes immediately (before mutation completes)
// 5. Form state lost if mutation fails
```

### Mutation & State Update Flow

**Current Implementation (PROBLEMATIC):**
```typescript
// ScoresView.tsx - handleSaveScores
const handleSaveScores = async (studentId: string, newScores: { subTopicId: string; score: number }[]) => {
  try {
     await updateScoresMutation.mutateAsync({  // ← Mutation #1
       studentId,
       scores: newScores,
       academicYear: activeYear
     });
     setEditDialogOpen(false);  // ❌ CLOSES IMMEDIATELY
  } catch (error) {
    console.error("Failed to save scores:", error);  // ❌ SILENT
  }
};

// Hook definition (useSupabaseData.ts)
export function useUpdateStudentScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      studentId, 
      scores,
      academicYear 
    }: { 
      studentId: string; 
      scores: { subTopicId: string; score: number }[];
      academicYear: number;
    }) => {
      const records = scores.map(s => ({
        student_id: studentId,
        sub_topic_id: s.subTopicId,
        score: s.score,
        academic_year: academicYear,
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('student_scores')
        .upsert(records, { onConflict: 'student_id, sub_topic_id' })
        .select();

      if (error) throw error;
      
      // ❌ ISSUE #4: No response validation
      // Assumes data returned matches what was sent
      // If server validation rejects, we won't know
      
      return data;
    },
    onSuccess: (_, variables) => {
      // ✓ Cache invalidation happens
      queryClient.invalidateQueries({ queryKey: queryKeys.studentScores(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: ['class_scores'] });
      toast.success('บันทึกคะแนนเรียบร้อยแล้ว');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาดในการบันทึกคะแนน: ${error.message}`);
      // ✓ Error shown, but form already closed
    },
  });
}
```

### State Synchronization Issues ⚠️

#### Issue #1A: State Mismatch - Dialog Closes Before Mutation

**Problem Scenario:**
```
User opens ScoreEditDialog
  ↓
Enters scores: [10, 20, 30]
  ↓
Clicks Save
  ↓
handleSaveScores() called
  ↓
updateScoresMutation.mutateAsync() sent to server
  ↓
setEditDialogOpen(false) called IMMEDIATELY ← ❌ NO AWAIT
  ↓
Dialog closes
  ↓
Network error occurs (500ms delay)
  ↓
onError() in mutation fires
  ↓
User doesn't see error (dialog already closed)
  ↓
Form state lost
  ↓
User thinks save succeeded, but it didn't

STATE MISMATCH:
- Frontend: Dialog closed, thinks all saved ✓
- Database: Scores not updated ✗
- User: Confused, unaware of failure
```

**Verification:**
```typescript
// Current code doesn't wait for mutation
await updateScoresMutation.mutateAsync(...)  // ← This completes when mutation is SENT, not when response arrives
setEditDialogOpen(false);  // ← This runs immediately

// What user sees:
// 1. Clicks Save
// 2. Dialog closes instantly (UI feedback)
// 3. Sees success toast (from onSuccess)
// OR
// 3. Never sees error toast (component already unmounted)
```

**State Tree Mismatch:**
```
Component A (ScoresView)
├─ students: [{ id, name, scores: [10, 20] }]  ← State A
└─ editDialogOpen: false

Dialog (ScoreEditDialog)
├─ editedScores: { subTopic1: 15, subTopic2: 25 }  ← State B
└─ unmounted after dialog closes

React Query Cache
├─ classScores: { students: [{ id, scores: [10, 20] }] }  ← State C

Database
├─ student_scores: { student: id, scores: [10, 20] }  ← State D

If mutation fails silently:
A, C, D remain: [10, 20]
B is lost when dialog unmounts
User has no record of attempted change
Next refresh shows old values
```

#### Issue #1B: Race Condition - Double-Click Save

**Problem Scenario:**
```
User clicks Save (Mutation A sent)
  ↓
Before response, user clicks Save again (Mutation B sent)
  ↓
BOTH mutations in flight
  ↓
Both mutate same rows
  ↓
Depending on response order:
  ├─ If A completes first:
  │   Cache invalidated with A's data
  │   B completes, cache invalidated with B's data
  │   Final result: B wins (could be wrong if A was later)
  │
  └─ If B completes first:
      Same issue reversed
```

**Current Code (Vulnerable):**
```typescript
const handleSaveScores = async (studentId: string, newScores: ...) => {
  try {
     // ❌ No check if mutation already in flight
     await updateScoresMutation.mutateAsync({...});
     setEditDialogOpen(false);
  } catch (error) {
    console.error("Failed to save scores:", error);
  }
};

// User clicks Save
// handleSaveScores() starts
// User clicks Save again (while first is in flight)
// handleSaveScores() runs AGAIN
// ❌ Two mutations sent to same endpoint
```

#### Issue #1C: Race Condition - Inline Edit + Dialog Save

**Problem Scenario:**
```
ScoresView has inline edit cells AND dialog edit
User edits inline cell: Score A: 50 → 75
  ↓
User clicks another cell (mutation A sent)
  ↓
User immediately opens dialog for same student
  ↓
Dialog initializes with OLD data (before Mutation A completes)
  ↓
User edits in dialog: Score B: 30 → 45
  ↓
User clicks Save (mutation B sent)
  ↓
Mutation A completes: Score A = 75 ✓
Cache invalidated
Fresh query shows: Score A = 75, Score B = 30 (Mutation B not yet complete)
  ↓
Mutation B completes: Score B = 45
Cache invalidated
But Score A might revert or become inconsistent

RACE WINDOW: Between when mutations land on DB
```

### Error Handling Trace

#### Issue #2A: Silent Failure - No Rollback

**Current Implementation:**
```typescript
const handleInlineScoreUpdate = async (
  studentId: string, 
  subTopicId: string, 
  newScore: number
) => {
  try {
    await updateScoreMutation.mutateAsync({
      studentId,
      subTopicId,
      score: newScore,
      academicYear: activeYear
    });
  } catch (error) {
    console.error("Failed to update score inline:", error);  // ❌ ONLY console.error
  }
};

// Flow:
// 1. User clicks inline cell: 50 → 75
// 2. UI updates optimistically (shows 75)
// 3. Mutation sent to server
// 4. Network error occurs
// 5. catch() block runs → console.error only
// 6. UI STILL SHOWS 75 (no rollback)
// 7. User thinks it saved
// 8. Page refresh shows old value 50
// 9. User sees value reverted, confused
```

**State Mismatch:**
```
Before Edit:
┌─ Frontend: 50
├─ Database: 50
└─ User: Sees 50

After Click (before mutation):
┌─ Frontend: 75 (optimistic update)
├─ Database: 50
└─ User: Sees 75 (thinks changed)

After Mutation Fails:
┌─ Frontend: 75 ❌ (WRONG - no rollback)
├─ Database: 50 ✓ (unchanged)
└─ User: Sees 75, thinks saved, but didn't ❌

After Page Refresh:
┌─ Frontend: 50 (reloaded from DB)
├─ Database: 50 ✓
└─ User: Confused - value reverted! ❌

VERDICT: State Mismatch + No Error Feedback
```

#### Issue #2B: Response Validation Missing

**Current Code:**
```typescript
mutationFn: async ({ studentId, subTopicId, score, academicYear }) => {
  const { data, error } = await supabase
    .from('student_scores')
    .upsert({
      student_id: studentId,
      sub_topic_id: subTopicId,
      score,  // Value we sent: 75
      academic_year: academicYear,
      updated_at: new Date().toISOString()
    }, { onConflict: 'student_id, sub_topic_id' })
    .select()
    .single();

  if (error) throw error;
  
  return data;  // ❌ ASSUMED to contain score = 75
               // ❌ But could contain different value if:
               //    - Server validation rejects
               //    - RLS blocks the update
               //    - Trigger modifies value
               //    - Constraint violations occur
};

// SCENARIO: Server rejects score > max_score
// Frontend sends: score = 100 (max is 80)
// Server rejects but returns data without validation error
// Frontend assumes data.score === 100
// But database has 80
// Cache invalidation happens with wrong data
// No way to detect mismatch
```

**Verification Flow:**
```
User: Enters 100 (max_score is 80)
  ↓
Frontend clamping missing → Sends 100 to server
  ↓
Server-side validation: 100 > 80 → Reject
  ↓
BUT RLS policy passes (user is teacher)
  ↓
Server returns data with score = 80 (database applied constraint)
  ↓
Frontend receives data = { score: 80 }
  ↓
No validation: if (data.score !== expectedScore) throw error
  ↓
Toast: "Score updated successfully" ✓
  ↓
Cache invalidated with score = 80
  ↓
User sees 80 in UI
  ↓
User thinks they entered 100 but only 80 saved
  ❌ SILENT FAILURE - user unaware of constraint
```

### Cache Invalidation Trace

**Step 1: Mutation Completes**
```typescript
onSuccess: (_, variables) => {
  // Three separate cache invalidations
  queryClient.invalidateQueries({ queryKey: queryKeys.studentScores(variables.studentId) });
  queryClient.invalidateQueries({ queryKey: ['class_scores'] });
  queryClient.invalidateQueries({ queryKey: ['student_scores_by_year'] });
  toast.success('บันทึกคะแนนเรียบร้อยแล้ว');
}

// Issue: These are sequential, not atomic
// Window between invalidations where cache is inconsistent
```

**Step 2: Cache Invalidation**
```
Query 1: invalidate studentScores
  ↓
Cache entry deleted
  ↓
Next read on studentScores = miss, refetch from DB

Query 2: invalidate class_scores
  ↓
Cache entry deleted (entire class scores)
  ↓
Next read = miss, but may still be in flight

Query 3: invalidate student_scores_by_year
  ↓
Cache entry deleted
```

**Step 3: Refetch Triggers**
```typescript
// ScoresView is subscribed to:
const { data: studentsWithScores = [] } = useClassScores(selectedClass);

// When classScores cache invalidated:
// 1. Cache entry removed
// 2. useClassScores hook detects stale data
// 3. New query initiated
// 4. Supabase called: SELECT * FROM students...
// 5. Response received
// 6. setQueryData() updates cache
// 7. Component re-renders with new data
// 8. Table updates with new scores

// ⏱️ Total delay: 200-500ms (network + processing)
// ❌ User sees UI lag
```

**Issue: Multiple Invalidations Create Race Window**
```
Time 0: Mutation completes
Time 1: Invalidate studentScores
Time 2: Query client recognizes stale studentScores
Time 3: Invalidate class_scores
Time 4: Query client recognizes stale class_scores
...
Time N: First refetch completes
Time N+1: Second refetch completes

If Component uses BOTH queries:
├─ Query 1 completes with new data
├─ Component re-renders
└─ Query 2 still in flight
    └─ Component re-renders again when Query 2 completes

Result: 2+ re-renders, potential flickering
```

---

## FEATURE #2: User Authentication

### Data Flow Trace

```
User navigates to / (Index page)
  ↓
AuthProvider effect runs
  ↓
supabase.auth.onAuthStateChange() sets up listener
  ↓
supabase.auth.getSession() called
  ↓
Two parallel fetches of user data:
├─ From listener (via setTimeout(0))
└─ From getSession() response
  ↓
Profile & Role queries execute
  ↓
setProfile() & setRole() called
  ↓
Page re-renders with authenticated state
```

### State Mismatch - Race Condition

**Problem:**
```typescript
useEffect(() => {
  let isMounted = true;
  let loadingCheck = { listener: false, session: false };

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);  // ← ASYNC, no await
      } else {
        setProfile(null);
        setRole(null);
      }
      
      loadingCheck.listener = true;
      if (loadingCheck.listener && loadingCheck.session) {
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
    
    loadingCheck.session = true;
    if (loadingCheck.listener && loadingCheck.session) {
      setLoading(false);
    }
  });

  return () => {
    isMounted = false;
    subscription?.unsubscribe();
  };
}, []);

// ❌ ISSUE: Race condition in initialization
// Listener call: fetchUserData() NOT awaited → Returns immediately
// Session call: fetchUserData() IS awaited → Waits for completion
// 
// Timing scenarios:
// Scenario A (Fast Network):
//   1. listener runs first, fetchUserData starts
//   2. session runs second, fetchUserData called again (2x call!)
//   3. Both complete
//   4. setLoading(false) called twice (wasteful but safe)
//
// Scenario B (Listener Slow):
//   1. session runs first, fetchUserData completes
//   2. setLoading(false) called from session
//   3. UI shows: loading = false, but profile/role still loading
//   4. Flash of incorrect state
//   5. listener finally completes, triggers re-render
//   6. Flash again
```

**State Tree During Race:**
```
Time 0: Auth initialized
├─ loading: true
├─ user: null
├─ profile: null
└─ role: null

Time 1: Listener fires (session exists)
├─ loading: true (not yet updated)
├─ user: { id: "123", email: "..." }  ← Updated
├─ profile: null (fetchUserData in flight)
└─ role: null (fetchUserData in flight)

Time 2: getSession completes
├─ loading: true (still waiting for profile)
├─ user: { id: "123", email: "..." }  ✓
├─ profile: null (still loading)
└─ role: null (still loading)

Time 3: fetchUserData from listener completes
├─ loading: true
├─ user: { id: "123", email: "..." }
├─ profile: { user_id: "123", full_name: "John" }  ← Updated
└─ role: "teacher"  ← Updated

Time 4: Second fetchUserData from session completes (or not)
├─ loading: true
├─ user: { id: "123", email: "..." }
├─ profile: { user_id: "123", full_name: "John" }
└─ role: "teacher"

Time 5: Both complete, setLoading(false)
├─ loading: false ✓
├─ user: { id: "123", email: "..." } ✓
├─ profile: { user_id: "123", full_name: "John" } ✓
└─ role: "teacher" ✓

BUT: Components subscribed to individual state changes
     May see intermediate states and re-render multiple times
```

### Error Handling

**Current Implementation:**
```typescript
const fetchUserData = async (userId: string) => {
  // Fetch profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileData) {
    setProfile(profileData);
  }

  // Fetch role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleData) {
    setRole(roleData.role as AppRole);
  }
};

// ❌ ISSUE: No error handling
// If profile query fails: profileData = undefined, setProfile never called
// If role query fails: roleData = undefined, setRole never called
// User sees loading state forever (loading never set to false)
```

**State Impact:**
```
User logs in → loading: true

fetchUserData tries to fetch profile
  ↓
Network error (401 Unauthorized - token expired)
  ↓
No error thrown (Supabase returns null on auth error with maybeSingle)
  ↓
profileData = null
  ↓
setProfile() not called (if check fails)
  ↓
setRole() not called
  ↓
setLoading(false) called
  ↓
UI renders with:
├─ loading: false ✓
├─ user: { id, email } ✓
├─ profile: null ❌ (Should show loading error)
└─ role: null ❌ (No role, so no access to any feature)
```

---

## FEATURE #3: User Management (Admin)

### Data Flow

```
Admin clicks "Users" tab
  ↓
UserManagement component mounts
  ↓
useEffect: fetchUsers()
  ↓
Two parallel queries:
├─ SELECT * FROM profiles
└─ SELECT * FROM user_roles
  ↓
Results merged in component state: [users with roles]
  ↓
Table renders
  ↓
Admin clicks "Change Role" dropdown
  ↓
handleRoleChange() runs
  ↓
UPDATE user_roles SET role = 'teacher'
  ↓
If success:
├─ Local state updated: setUsers(...)
├─ Toast shown
└─ Table re-renders

BUT: Changed user doesn't see new role until refresh
```

### Issue #3A: Manual State Management

**Problem:**
```typescript
const [users, setUsers] = useState<UserWithRole[]>([]);

useEffect(() => {
  if (isAdmin) {
    fetchUsers();  // ← Manual fetch & state management
  }
}, [isAdmin]);

const handleRoleChange = async (userId: string, newRole: AppRole) => {
  setUpdating(userId);

  const { error } = await supabase
    .from('user_roles')
    .update({ role: newRole })
    .eq('user_id', userId);

  if (error) {
    toast({...});
  } else {
    toast({...});
    // ❌ Manual update to state
    setUsers(users.map((u) => 
      u.user_id === userId ? { ...u, role: newRole } : u
    ));
  }

  setUpdating(null);
};

// ❌ Issue: No query cache invalidation
// If another admin loads users in another tab, they won't see this change
// If user refreshes, they see new role, but UserManagement component still shows old role
// State is disconnected from server
```

### Issue #3B: Response Assumed to Be Success

**Problem:**
```typescript
const handleRoleChange = async (userId: string, newRole: AppRole) => {
  setUpdating(userId);

  const { error } = await supabase
    .from('user_roles')
    .update({ role: newRole })
    .eq('user_id', userId);

  if (error) {
    toast({ title: 'Error', ... });
  } else {
    // ❌ Assumes update succeeded
    // But what if:
    // - RLS policy blocked the update?
    // - User row doesn't exist?
    // - Transaction failed?
    // - Server returned 200 but no rows updated?
    
    toast({ title: 'Success', description: '...' });
    setUsers(users.map((u) => 
      u.user_id === userId ? { ...u, role: newRole } : u
    ));
  }

  setUpdating(null);
};

// Missing: Verify number of rows updated
// Missing: Query to confirm role change persisted
```

**Better Approach:**
```typescript
const { data, error } = await supabase
  .from('user_roles')
  .update({ role: newRole })
  .eq('user_id', userId)
  .select();  // ← Get back updated records

if (error) throw error;

if (!data || data.length === 0) {
  throw new Error('No rows updated - user may not exist');
}

if (data[0].role !== newRole) {
  throw new Error(`Role mismatch: expected ${newRole}, got ${data[0].role}`);
}

// NOW it's safe to show success
```

---

## FEATURE #4: Real-Time Score Synchronization

### Data Flow

```
Component mounts with classId
  ↓
useRealtimeScores(classId) hook fires
  ↓
supabase.channel(`scores-${classId}`).on('postgres_changes', ...)
  ↓
Listening for INSERT/UPDATE/DELETE on student_scores table
  ↓
User A updates Student X's score in another window
  ↓
Postgres broadcast to all subscribers
  ↓
Real-time callback fires in User B's browser
  ↓
queryClient.invalidateQueries({ queryKey: ['class_scores'] })
  ↓
Cache cleared
  ↓
Component using useClassScores refetches
  ↓
New data loaded from DB
  ↓
UI updates to show User A's change
```

### Issue #4A: Conflict Between Concurrent Updates

**Scenario:**
```
Time 0: User A opens ScoresView for Class 1
├─ Loads: Student X: { score: 50 }
└─ Cache state: { class_scores: [Student X: 50] }

Time 50ms: User B updates Student X's score from 50 → 80
├─ Mutation sent to DB
├─ Broadcast sent to real-time subscribers
└─ Cache invalidated on User A's browser

Time 100ms: User B's mutation completes successfully
├─ Cache invalidation triggers
├─ useClassScores refetches
└─ Shows Student X: 80 ✓

Time 150ms: MEANWHILE - User A starts editing Student X inline
├─ Clicks cell: shows input, value = 50 (from cache before invalidation)
├─ User A enters: 50 → 75
├─ Sends mutation to DB
└─ Local state shows 75

Time 200ms: User B's real-time change arrives at User A's browser
├─ Callback fires: invalidateQueries(['class_scores'])
├─ Cache cleared
├─ useClassScores refetches...

Time 250ms: User A's mutation (75) reaches DB
├─ Upserts: student_scores { student_id: X, score: 75 }
├─ Success
└─ onSuccess fires: invalidateQueries(['class_scores'])

Time 300ms: First refetch completes (from Time 200ms invalidation)
├─ Shows Student X: 75 ✓ (from User A's mutation)
└─ Cache state: { class_scores: [Student X: 75] }

RESULT: Both changes applied sequentially ✓ (in this case)

BUT if timing is different:

Time 0: User A loads Class 1 cache
Time 50ms: User B updates Student X: 50 → 80
Time 75ms: User A clicks edit: 50 → 75 (form shows 50 before refetch)
Time 100ms: User B's broadcast arrives, invalidates cache, refetches
Time 150ms: Refetch from Time 100ms completes: loads 80 from DB
Time 200ms: User A's mutation sent to DB: upsert score = 75
Time 250ms: User A's onSuccess fires: invalidateQueries

CONFLICT WINDOW: Time 100-150ms
├─ Cache updated to 80 (from User B)
├─ But User A's mutation will overwrite to 75
├─ Depending on what User A entered, could be correct or wrong

RESULT: Last write wins, but may not be correct
```

### Issue #4B: No Source Tracking

**Current Implementation:**
```typescript
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
      // ❌ Always invalidate, no conflict detection
      queryClient.invalidateQueries({ queryKey: queryKeys.classScores(classId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.classStats(classId) });
      
      const action = payload.eventType === 'INSERT' ? 'เพิ่ม' : 'อัปเดต';
      toast.info(`มีการ${action}คะแนนใหม่`, {
        description: 'ข้อมูลได้รับการอัปเดตแล้ว',
        duration: 3000,
      });
    }
  )
  .subscribe();

// ❌ Issue: Can't distinguish:
// - Is this change from my own mutation?
// - Is this change from another user?
// - Should I invalidate cache immediately or wait for my mutation?
```

**Better Approach:**
```typescript
(payload) => {
  const isOwnChange = payload.new?.updated_by === currentUserId;
  
  if (isOwnChange) {
    // Don't invalidate - let mutation's onSuccess handle cache update
    console.log('Own change confirmed by real-time');
  } else {
    // External change - safe to invalidate
    queryClient.invalidateQueries({ queryKey: queryKeys.classScores(classId) });
    toast.info('Scores updated by another user');
  }
}
```

---

## FEATURE #5: Student Dashboard

### Data Flow

```
Student navigates to / (Index page)
  ↓
Index.tsx checks role (from AuthContext)
  ↓
role === 'student' → Render StudentDashboard
  ↓
StudentDashboard mounts
  ↓
Queries to load:
├─ useCurrentStudent() → Gets student profile linked to user_id
├─ useStudentScores(studentId) → Gets all scores for student
└─ Other stats queries
  ↓
Renders dashboard with student's scores
```

### Issue #5A: Dependent Query Execution

**Problem:**
```typescript
export function useCurrentStudent() {
  const { user, isStudent } = useAuth();
  return useQuery({
    queryKey: ['current_student', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('students')
        .select('*, classes(name)')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isStudent,  // ← Only runs if user?.id exists
  });
}

// Issue: If user loads before user?.id is available
// Query won't run until user?.id is set
// But even then, race condition with AuthContext initialization
```

**State Impact:**
```
Time 0: App loads
├─ AuthContext.loading = true
├─ Auth.role = null
└─ useCurrentStudent.enabled = false (role not set yet)

Time 50ms: Auth session checked
├─ AuthContext.loading = false
├─ Auth.user = { id: '123' }
├─ Auth.role = 'student' (from DB)
└─ useCurrentStudent.enabled = true ← NOW enabled

Time 100ms: useCurrentStudent query runs
├─ Queries: SELECT * FROM students WHERE user_id = '123'
└─ But race condition: What if profile fetch was still in flight?

If profile fetch fails:
├─ auth.role = null
└─ useCurrentStudent.enabled = false
    └─ Query never runs → Student dashboard never loads
```

---

## SUMMARY TABLE: State Mismatch Risks

| Feature | State Type | Mismatch Risk | Severity | Current Status |
|---------|-----------|-----------------|----------|----------------|
| Score Entry | Dialog Form | Closes before mutation | 🔴 HIGH | ❌ Not fixed |
| Score Entry | Local edits | No rollback on error | 🔴 HIGH | ❌ Not fixed |
| Score Entry | Cache | Multiple invalidations | 🟠 MEDIUM | ⚠️ Works but slow |
| Score Entry | UI | Double-click sends 2 mutations | 🔴 HIGH | ❌ Not fixed |
| Authentication | Profile/Role | Race condition on init | 🟠 MEDIUM | ⚠️ Partially fixed |
| User Management | Users list | Manual state sync | 🟠 MEDIUM | ❌ Not fixed |
| User Management | Role change | No verification | 🟠 MEDIUM | ❌ Not fixed |
| Real-Time | Live updates | Conflict with local edit | 🔴 HIGH | ❌ Not fixed |
| Real-Time | Cache | No source tracking | 🟠 MEDIUM | ❌ Not fixed |
| Dashboard | Student profile | Dependent query race | 🟠 MEDIUM | ⚠️ Partially fixed |

---

## IMPLEMENTATION PRIORITY

### PHASE 1: CRITICAL (Implement Now)
```
1. Score Entry: Fix dialog close timing (Feature #1, Issue #1A)
2. Score Entry: Add response validation (Feature #1, Issue #2B)
3. Score Entry: Prevent double-click (Feature #1, Issue #1B)
4. Real-Time: Add source tracking (Feature #4, Issue #4B)
```

### PHASE 2: HIGH (Implement Soon)
```
5. Score Entry: Add inline rollback (Feature #1, Issue #2A)
6. Authentication: Complete race condition fix (Feature #2)
7. User Management: Use React Query instead of manual state (Feature #3)
8. Real-Time: Implement conflict detection (Feature #4, Issue #4A)
```

### PHASE 3: MEDIUM (Plan for Later)
```
9. Score Entry: Implement optimistic updates
10. User Management: Add response verification
```

---

## Recommended Code Changes

See **QA_REVIEW_CODE_FIXES.md** for complete implementation of all fixes.
