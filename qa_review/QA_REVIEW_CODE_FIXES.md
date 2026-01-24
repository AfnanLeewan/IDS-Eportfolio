# 🔧 QA Review - Recommended Code Fixes

## Fix #1: Response Validation in Score Mutations

**File:** `src/hooks/useSupabaseData.ts`  
**Lines:** 330-370

### Current Code ❌
```typescript
export function useUpdateStudentScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      studentId, 
      subTopicId, 
      score, 
      academicYear 
    }: { 
      studentId: string; 
      subTopicId: string; 
      score: number;
      academicYear: number;
    }) => {
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
      return data;  // ❌ NO VALIDATION
    },
    // ...
  });
}
```

### Fixed Code ✓
```typescript
export function useUpdateStudentScore() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      studentId, 
      subTopicId, 
      score, 
      academicYear 
    }: { 
      studentId: string; 
      subTopicId: string; 
      score: number;
      academicYear: number;
    }) => {
      // ✓ Input validation
      if (!studentId || !subTopicId) {
        throw new Error('Missing required fields: studentId, subTopicId');
      }
      if (score < 0) {
        throw new Error('Score cannot be negative');
      }

      const { data, error } = await supabase
        .from('student_scores')
        .upsert({
          student_id: studentId,
          sub_topic_id: subTopicId,
          score,
          academic_year: academicYear,
          updated_at: new Date().toISOString(),
          updated_by: user?.id  // ✓ AUDIT TRAIL
        }, { onConflict: 'student_id, sub_topic_id' })
        .select()
        .single();

      if (error) throw error;
      
      // ✓ RESPONSE VALIDATION
      if (!data) {
        throw new Error('Server returned no data');
      }
      if (data.score !== score) {
        throw new Error(
          `Score mismatch: sent ${score}, received ${data.score}. ` +
          'Server-side validation may have rejected your value. ' +
          `Max score check: is ${score} within limits?`
        );
      }
      if (!data.updated_by) {
        console.warn('Audit trail: updated_by not set. Check database trigger.');
      }
      
      return data;
    },
    onMutate: async (newData) => {
      // ✓ OPTIMISTIC UPDATE
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.studentScores(newData.studentId) 
      });
      
      const previousData = queryClient.getQueryData(
        queryKeys.studentScores(newData.studentId)
      );
      
      // Update cache optimistically
      queryClient.setQueryData(
        queryKeys.studentScores(newData.studentId),
        (old: any[]) => {
          if (!old) return old;
          return old.map(score =>
            score.sub_topic_id === newData.subTopicId
              ? { ...score, score: newData.score }
              : score
          );
        }
      );
      
      return { previousData };
    },
    onSuccess: (_, variables) => {
      // ✓ Cache invalidation after successful validation
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.studentScores(variables.studentId) 
      });
      queryClient.invalidateQueries({ queryKey: ['class_scores'] });
      queryClient.invalidateQueries({ queryKey: ['student_scores_by_year'] });
      
      // ✓ Success feedback
      toast.success('Score updated successfully');
    },
    onError: (error: Error, variables, context: any) => {
      // ✓ ROLLBACK optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.studentScores(variables.studentId),
          context.previousData
        );
      }
      
      // ✓ Clear error message
      toast.error(`Failed to update score: ${error.message}`);
    },
  });
}
```

---

## Fix #2: Double-Click Prevention in Save Handler

**File:** `src/components/scores/ScoresView.tsx`  
**Lines:** 334-346

### Current Code ❌
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
    console.error("Failed to save scores:", error);
  }
};
```

### Fixed Code ✓
```typescript
const [isSaving, setIsSaving] = useState(false);

const handleSaveScores = async (
  studentId: string, 
  newScores: { subTopicId: string; score: number }[]
) => {
  // ✓ GUARD: Prevent double-click
  if (isSaving || updateScoresMutation.isPending) {
    toast.info('Save in progress. Please wait.');
    return;
  }
  
  // ✓ INPUT VALIDATION
  if (!studentId) {
    toast.error('No student selected');
    return;
  }
  if (!newScores || newScores.length === 0) {
    toast.error('No scores to save');
    return;
  }
  
  setIsSaving(true);
  
  try {
    // ✓ AWAIT mutation completely
    const result = await updateScoresMutation.mutateAsync({
      studentId,
      scores: newScores,
      academicYear: activeYear
    });
    
    // ✓ VALIDATE result
    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error('No scores were saved. Please try again.');
    }
    
    // ✓ Verify each score was saved correctly
    for (const newScore of newScores) {
      const saved = result.find(r => r.sub_topic_id === newScore.subTopicId);
      if (!saved || saved.score !== newScore.score) {
        throw new Error(
          `Score mismatch for sub-topic ${newScore.subTopicId}: ` +
          `expected ${newScore.score}, got ${saved?.score ?? 'missing'}`
        );
      }
    }
    
    // ✓ Only close AFTER successful validation
    setEditDialogOpen(false);
    toast.success(`Saved ${newScores.length} score(s) successfully`);
    
  } catch (error) {
    // ✓ SHOW ERROR and keep form open for retry
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Failed to save scores: ${errorMessage}`);
    
    // Form dialog stays open, user can edit and retry
  } finally {
    setIsSaving(false);
  }
};

// Update dialog to show loading state:
<Button 
  onClick={handleSave}
  disabled={isSaving || updateScoresMutation.isPending}
  className="gradient-primary text-primary-foreground"
>
  {isSaving || updateScoresMutation.isPending ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Saving...
    </>
  ) : (
    'Save Changes'
  )}
</Button>
```

---

## Fix #3: Dialog Close Timing Issue

**File:** `src/components/scores/ScoreEditDialog.tsx`  
**Lines:** 40-60

### Current Code ❌
```typescript
const handleSave = () => {
  if (!student || !subject) return;
  const scores = Object.entries(editedScores).map(([subTopicId, score]) => ({
    subTopicId,
    score,
  }));
  onSave(student.id, scores);  // ❌ Doesn't wait for result
  onOpenChange(false);  // ❌ Closes immediately
};
```

### Fixed Code ✓
```typescript
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ScoreEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  subject: Subject | null;
  onSave: (studentId: string, scores: { subTopicId: string; score: number }[]) => Promise<void>;
  // ✓ onSave now returns a Promise
}

export function ScoreEditDialog({
  open,
  onOpenChange,
  student,
  subject,
  onSave,
}: ScoreEditDialogProps) {
  const [editedScores, setEditedScores] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);  // ✓ NEW
  const [saveError, setSaveError] = useState<string | null>(null);  // ✓ NEW

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && student && subject) {
      const initialScores: Record<string, number> = {};
      subject.subTopics.forEach((subTopic) => {
        const scoreEntry = student.scores.find((s) => s.subTopicId === subTopic.id);
        initialScores[subTopic.id] = scoreEntry?.score || 0;
      });
      setEditedScores(initialScores);
      setSaveError(null);  // ✓ Clear error on open
    }
    onOpenChange(isOpen);
  };

  const handleScoreChange = (subTopicId: string, value: string, maxScore: number) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(numValue, maxScore));
    setEditedScores((prev) => ({ ...prev, [subTopicId]: clampedValue }));
    setSaveError(null);  // ✓ Clear error when user edits
  };

  // ✓ Make async and await result
  const handleSave = async () => {
    if (!student || !subject) return;
    
    // ✓ Validate before sending
    const hasChanges = Object.keys(editedScores).some(
      (subTopicId) => {
        const original = student.scores.find((s) => s.subTopicId === subTopicId)?.score ?? 0;
        return editedScores[subTopicId] !== original;
      }
    );
    
    if (!hasChanges) {
      setSaveError('No changes to save');
      return;
    }
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const scores = Object.entries(editedScores).map(([subTopicId, score]) => ({
        subTopicId,
        score,
      }));
      
      // ✓ AWAIT the save operation
      await onSave(student.id, scores);
      
      // ✓ Only close AFTER successful save
      onOpenChange(false);
      
    } catch (error) {
      // ✓ Show error and keep dialog open
      setSaveError(
        error instanceof Error 
          ? error.message 
          : 'Failed to save. Please try again.'
      );
      console.error('Save error:', error);
      
      // Dialog stays open for retry
    } finally {
      setIsSaving(false);
    }
  };

  if (!student || !subject) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Scores - {student.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{subject.name}</p>
        </DialogHeader>
        
        {/* ✓ Show error if save failed */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
            {saveError}
          </div>
        )}
        
        <div className="space-y-4 py-4">
          {subject.subTopics.map((subTopic) => (
            <div key={subTopic.id} className="flex items-center gap-4">
              <Label className="flex-1 text-sm">{subTopic.name}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={subTopic.maxScore}
                  value={editedScores[subTopic.id] || 0}
                  onChange={(e) =>
                    handleScoreChange(subTopic.id, e.target.value, subTopic.maxScore)
                  }
                  disabled={isSaving}  // ✓ Disable during save
                  className="w-20 text-center"
                />
                <span className="text-sm text-muted-foreground">/ {subTopic.maxScore}</span>
              </div>
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSaving}  // ✓ Disable during save
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}  // ✓ Disable during save
            className="gradient-primary text-primary-foreground"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Fix #4: Add Audit Trail to User Mutations

**File:** `src/hooks/useSupabaseData.ts`  
**Lines:** 1590-1610

### Current Code ❌
```typescript
export function useCreateUser() {
  return useMutation({
    mutationFn: async (data: { email: string; password: string; fullName: string; role: string }) => {
      const { data: userId, error } = await supabase.rpc('create_new_user', {
        p_email: data.email,
        p_password: data.password,
        p_full_name: data.fullName,
        p_role: data.role
        // ❌ No created_by audit information
      });
      
      if (error) throw error;
      return userId;
    },
  });
}
```

### Fixed Code ✓
```typescript
export function useCreateUser() {
  const { user: adminUser } = useAuth();  // ✓ Get current admin
  
  return useMutation({
    mutationFn: async (data: { 
      email: string; 
      password: string; 
      fullName: string; 
      role: string 
    }) => {
      // ✓ Validate input
      if (!data.email || !data.password || !data.fullName || !data.role) {
        throw new Error('Missing required fields');
      }
      if (!['admin', 'teacher', 'student'].includes(data.role)) {
        throw new Error('Invalid role');
      }
      if (data.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      
      // ✓ Enhanced RPC with audit trail
      const { data: userId, error } = await supabase.rpc('create_new_user', {
        p_email: data.email,
        p_password: data.password,
        p_full_name: data.fullName,
        p_role: data.role,
        p_created_by: adminUser?.id  // ✓ AUDIT: Who created this user
      });
      
      if (error) throw error;
      
      // ✓ Validate response
      if (!userId) {
        throw new Error('Server returned no user ID');
      }
      
      return userId;
    },
    onSuccess: (userId) => {
      // ✓ Invalidate users list so it refreshes
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User created: ${userId}`);
    },
    onError: (error: Error) => {
      // ✓ Clear error message
      toast.error(`Failed to create user: ${error.message}`);
    },
  });
}
```

---

## Fix #5: AuthContext Race Condition

**File:** `src/contexts/AuthContext.tsx`  
**Lines:** 70-100

### Current Code ❌
```typescript
useEffect(() => {
  // Set up auth state listener FIRST
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Defer data fetching with setTimeout to avoid deadlock
      if (session?.user) {
        setTimeout(() => {
          fetchUserData(session.user.id);  // ❌ Race: Could complete after getSession
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
      }
      setLoading(false);  // ❌ Can be called twice in different orders
    }
  );

  // THEN check for existing session
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      await fetchUserData(session.user.id);  // ❌ Race: 2nd call
    }
    setLoading(false);  // ❌ Can overwrite listener's setLoading
  });

  return () => subscription.unsubscribe();
}, []);
```

### Fixed Code ✓
```typescript
useEffect(() => {
  // ✓ Add mounted flag to prevent state updates after unmount
  let isMounted = true;
  let loadingCheck = { listener: false, session: false };  // Track which completed

  // Set up auth state listener
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (!isMounted) return;  // ✓ Don't update if component unmounted
      
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }
      
      // ✓ Mark listener done
      loadingCheck.listener = true;
      // ✓ Only set loading to false when BOTH are complete
      if (loadingCheck.listener && loadingCheck.session) {
        setLoading(false);
      }
    }
  );

  // Check for existing session
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!isMounted) return;  // ✓ Check mounted before updating
    
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      await fetchUserData(session.user.id);
    }
    
    // ✓ Mark session check done
    loadingCheck.session = true;
    // ✓ Only set loading to false when BOTH are complete
    if (loadingCheck.listener && loadingCheck.session) {
      setLoading(false);
    }
  }).catch((error) => {
    // ✓ Handle errors from getSession
    console.error('Failed to get session:', error);
    if (isMounted) {
      loadingCheck.session = true;
      if (loadingCheck.listener && loadingCheck.session) {
        setLoading(false);
      }
    }
  });

  // ✓ Cleanup: Mark unmounted
  return () => {
    isMounted = false;
    subscription?.unsubscribe();
  };
}, []);
```

---

## Fix #6: Add Error Handler to Critical Queries

**File:** `src/hooks/useSupabaseData.ts`  
**Location:** Multiple query functions

### Template ✓
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
      
      // ✓ Validate response
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected array of students');
      }
      
      return data;
    },
    // ✓ ADD ERROR HANDLING
    onError: (error: Error) => {
      console.error('Failed to load class scores:', error);
      toast.error(`Failed to load scores: ${error.message}`);
    },
  });
}
```

---

## Fix #7: Inline Score Update with Rollback

**File:** `src/components/scores/ScoresView.tsx`  
**Lines:** 347-356

### Current Code ❌
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

### Fixed Code ✓
```typescript
const [cellLoadingState, setCellLoadingState] = useState<Record<string, boolean>>({});
const cellKey = (sid: string, stid: string) => `${sid}-${stid}`;

const handleInlineScoreUpdate = async (
  studentId: string, 
  subTopicId: string, 
  newScore: number
) => {
  const key = cellKey(studentId, subTopicId);
  
  // ✓ Get previous value for rollback
  const previousScore = students.find(s => s.id === studentId)
    ?.scores.find(sc => sc.subTopicId === subTopicId)
    ?.score ?? 0;
  
  // ✓ Show loading state on cell
  setCellLoadingState(prev => ({ ...prev, [key]: true }));
  
  try {
    await updateScoreMutation.mutateAsync({
      studentId,
      subTopicId,
      score: newScore,
      academicYear: activeYear
    });
    
    // ✓ Success feedback
    toast.success('Score updated');
    
  } catch (error) {
    // ✓ ROLLBACK the cell value
    setStudents(prev =>
      prev.map(student =>
        student.id === studentId
          ? {
              ...student,
              scores: student.scores.map(score =>
                score.subTopicId === subTopicId
                  ? { ...score, score: previousScore }  // ← REVERT
                  : score
              )
            }
          : student
      )
    );
    
    // ✓ Show error
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Failed to update: ${errorMsg}`);
    console.error('Inline score update failed:', error);
    
  } finally {
    // ✓ Clear loading state
    setCellLoadingState(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  }
};

// Usage in table cell:
<TableCell
  className={cn(
    'cursor-pointer hover:bg-muted/50 transition-colors',
    cellLoadingState[cellKey(student.id, subTopic.id)] && 'opacity-60 pointer-events-none'
  )}
  onClick={() => {
    const currentScore = student.scores.find(
      s => s.subTopicId === subTopic.id
    )?.score ?? 0;
    handleInlineScoreUpdate(student.id, subTopic.id, currentScore + 1);
  }}
>
  {cellLoadingState[cellKey(student.id, subTopic.id)] && (
    <Loader2 className="h-4 w-4 inline-block animate-spin mr-2" />
  )}
  {student.scores.find(s => s.subTopicId === subTopic.id)?.score ?? 0}
</TableCell>
```

---

## Fix #8: Real-Time Conflict Handling

**File:** `src/hooks/useRealtime.ts`  
**Lines:** 30-45

### Current Code ❌
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
      console.log('Score change detected:', payload);
      
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
```

### Fixed Code ✓
```typescript
import { useAuth } from '@/contexts/AuthContext';

export function useRealtimeScores(classId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const { user } = useAuth();  // ✓ Get current user
  
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
          console.log('Score change detected:', payload);
          
          // ✓ CHECK: Is this change from the current user?
          const isOwnChange = payload.new?.updated_by === user?.id;
          
          if (isOwnChange) {
            // ✓ This is our change, wait for local mutation to complete
            // Don't invalidate to prevent losing optimistic update
            console.log('Own change detected, local mutation will handle cache');
          } else {
            // ✓ Change from another user, safe to invalidate
            queryClient.invalidateQueries({ 
              queryKey: queryKeys.classScores(classId) 
            });
            queryClient.invalidateQueries({ 
              queryKey: queryKeys.classStats(classId) 
            });
            
            // ✓ Notify user about external change
            const action = payload.eventType === 'INSERT' ? 'added' : 'updated';
            const student = payload.new?.student_id ?? 'unknown';
            toast.info(`Score ${action} by another user`, {
              description: `Student: ${student}`,
              duration: 3000,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time scores subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error');
          toast.error('Failed to subscribe to real-time updates');
        }
      });
    
    return () => {
      channel.unsubscribe();
    };
  }, [enabled, classId, queryClient, user?.id]);
}
```

---

## Implementation Order

1. **Fix #1** - Response Validation (5 minutes) - **CRITICAL**
2. **Fix #2** - Double-Click Prevention (10 minutes) - **CRITICAL**
3. **Fix #3** - Dialog Timing (10 minutes) - **CRITICAL**
4. **Fix #4** - Audit Trail (5 minutes) - **CRITICAL**
5. **Fix #5** - AuthContext Race (15 minutes) - **HIGH**
6. **Fix #6** - Query Error Handlers (10 minutes) - **HIGH**
7. **Fix #7** - Inline Rollback (15 minutes) - **HIGH**
8. **Fix #8** - Real-Time Conflicts (10 minutes) - **MEDIUM**

**Total estimated time:** 80 minutes (1.5 hours) for critical fixes
