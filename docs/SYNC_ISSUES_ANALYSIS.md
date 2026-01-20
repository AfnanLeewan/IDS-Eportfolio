# 🔄 Database Synchronization Issues - Fix Plan

## 🚨 **Problem Identified**

The application has **mixed data sources**:
- ❌ Management pages use **local state** (not persisted)
- ❌ Other components use **mock data** from `mockData.ts`
- ❌ No synchronization between components
- ❌ Changes don't persist to database

### **Evidence:**

1. **SubjectManagement.tsx** (line 31-63):
   - Uses hardcoded `initialSubjects` array
   - All CRUD operations only affect local state
   - After refresh: data reloads from hardcoded array

2. **12+ components still use mockData.ts:**
   - ScoresView.tsx
   - AnalyticsDashboard.tsx
   - StudentDeepDive.tsx
   - All chart components
   - Score dialogs
   - And more...

---

## ✅ **Solution: Complete Database Integration**

### **Phase 1: Update Subject Management** ⚡ (Critical!)

**File:** `src/components/management/SubjectManagement.tsx`

**Changes needed:**
1. Replace `useState<Subject[]>(initialSubjects)` with database hooks
2. Use `useSubjects()` to fetch from database
3. Use `useSubTopics()` to fetch sub-topics
4. Implement mutations for CRUD:
   - `useCreateSubject()`
   - `useUpdateSubject()`
   - `useDeleteSubject()`
   - `useCreateSubTopic()`
   - `useDeleteSubTopic()`
5. Remove all local state operations

**Current flow (broken):**
```
User clicks delete
  → setSubjects(local state)  ❌
  → Component refreshes
  → Data reloads from initialSubjects
  → Delete undone!
```

**Fixed flow:**
```
User clicks delete
  → mutation.mutate(subjectId)  ✅
  → Deletes from database
  → Query invalidated
  → UI auto-updates
  → Delete persists!
```

---

### **Phase 2: Update All Components Using mockData**

All these components need updating:

#### **Scores Management:**
1. `src/components/scores/ScoresView.tsx`
2. `src/components/scores/ScoreEditDialog.tsx`
3. `src/components/scores/AddStudentScoreDialog.tsx`
4. `src/components/scores/SubTopicComparisonChart.tsx`

#### **Analytics Dashboard:**
5. `src/components/dashboard/AnalyticsDashboard.tsx`
6. `src/components/dashboard/BoxPlotChart.tsx`
7. `src/components/dashboard/SubTopicScoreChart.tsx`
8. `src/components/dashboard/SubTopicHeatmap.tsx`
9. `src/components/dashboard/StudentDeepDive.tsx`
10. `src/components/dashboard/ScoreBreakdown.tsx`
11. `src/components/dashboard/SubTopicGapChart.tsx`
12. `src/components/dashboard/SkillProfileComparison.tsx`
13. `src/components/dashboard/ClassDashboard.tsx`
14. `src/components/dashboard/StudentDashboard.tsx`

#### **Changes for each:**

```typescript
// ❌ OLD (mockData):
import { mockStudents, preALevelProgram } from '@/lib/mockData';
const students = mockStudents;
const subjects = preALevelProgram.subjects;

// ✅ NEW (database):
import { useStudents, useSubjects, useSubTopics } from '@/hooks/useSupabaseData';
const { data: students = [], isLoading } = useStudents(classId);
const { data: subjects = [] } = useSubjects('pre-a-level');
const { data: subTopics = [] } = useSubTopics();
```

---

## 🗄️ **Database Hooks Needed**

### **Already Created:**
✅ `useSubjects(programId)` - Get all subjects
✅ `useSubTopics(subjectId)` - Get sub-topics
✅ `useSubjectWithTopics(programId)` - Get subjects with nested sub-topics

### **Need to Add:**

```typescript
// Subject mutations
export function useCreateSubject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subject: {
      id: string;
      program_id: string;
      name: string;
      code: string;
    }) => {
      const { data, error } = await supabase
        .from('subjects')
        .insert(subject)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
      toast.success('Subject created');
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subjectId: string) => {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
      toast.success('Subject deleted');
    },
  });
}

// Sub-topic mutations
export function useCreateSubTopic() { /* similar */ }
export function useUpdateSubTopic() { /* similar */ }
export function useDeleteSubTopic() { /* similar */ }
```

---

## 📋 **Migration Checklist**

### **Immediate Actions (Fix synchronization):**

- [ ] 1. Update `SubjectManagement.tsx` to use database hooks
- [ ] 2. Add subject/sub-topic mutation hooks to `useSupabaseData.ts`
- [ ] 3. Test subject CRUD operations persist
- [ ] 4. Test data syncs between management and scores pages

### **Short Term (Remove all mockData):**

- [ ] 5. Update `ScoresView.tsx` to use `useClassScores()`
- [ ] 6. Update `AnalyticsDashboard.tsx` to use database queries
- [ ] 7. Update all chart components to use real data
- [ ] 8. Update score dialogs to use database
- [ ] 9. Test entire application with real data

### **Final Cleanup:**

- [ ] 10. Remove or deprecate `src/lib/mockData.ts`
- [ ] 11. Remove unused imports
- [ ] 12. Add loading states to all components
- [ ] 13. Add error boundaries
- [ ] 14. Document data flow

---

## 🎯 **Expected Behavior After Fix**

### **Subject Management:**
```
Teacher adds new subject "Computer Science"
  → INSERT into database ✅
  → All components using useSubjects() auto-update
  → Scores page now shows "Computer Science"
  → After refresh: still there! ✅
```

### **Delete Subject:**
```
Teacher deletes "Biology"
  → DELETE from database ✅
  → CASCADE deletes related sub_topics
  → CASCADE deletes related scores
  → All components auto-update
  → After refresh: still deleted! ✅
```

### **Cross-component Sync:**
```
Management page: Shows 7 subjects
Scores page: Shows same 7 subjects
Analytics page: Shows same 7 subjects
  → All reading from same database ✅
  → Real-time sync via TanStack Query ✅
```

---

## 🔧 **Testing Plan**

### **Test 1: Subject Persistence**
1. Go to Management → Subjects
2. Delete all subjects
3. Refresh page
4. ✅ Should still be deleted

### **Test 2: Cross-page Sync**
1. Open Management page
2. Open Scores page in new tab
3. Delete subject in Management
4. Switch to Scores tab
5. ✅ Subject should disappear (with query invalidation)

### **Test 3: Real-time Updates**
1. Two users open same page
2. User A deletes subject
3. ✅ User B sees it disappear

---

## 🚀 **Implementation Priority**

### **Priority 1 - URGENT (Fixes your immediate issue):**
✅ Update `SubjectManagement.tsx`
✅ Add mutation hooks

### **Priority 2 - HIGH:**
✅ Update `ScoresView.tsx`
✅ Update `AnalyticsDashboard.tsx`

### **Priority 3 - MEDIUM:**
✅ Update all chart components
✅ Update score dialogs

### **Priority 4 - LOW:**
✅ Remove mockData.ts
✅ Cleanup and documentation

---

## 📝 **Code Examples**

### **Before (SubjectManagement.tsx):**
```typescript
const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);

const handleDeleteSubject = (subjectId: string) => {
  setSubjects(subjects.filter((s) => s.id !== subjectId));
  // ❌ Only affects local state!
};
```

### **After (SubjectManagement.tsx):**
```typescript
const { data: subjects = [], isLoading } = useSubjects('pre-a-level');
const deleteSubject = useDeleteSubject();

const handleDeleteSubject = (subjectId: string) => {
  deleteSubject.mutate(subjectId);
  // ✅ Deletes from database!
  // ✅ Auto-invalidates queries!
  // ✅ All components update!
};
```

---

**Next Steps:**
1. I'll create the updated SubjectManagement component
2. Add missing mutation hooks
3. Test the synchronization

---

Created: 2026-01-20  
Status: 🚨 Critical Bug Identified  
Action: Fix in progress
