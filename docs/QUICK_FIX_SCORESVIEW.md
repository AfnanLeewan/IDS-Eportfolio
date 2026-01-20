# 🎯 IMMEDIATE FIX - Scores Page Synchronization

## ✅ **Quick Solution (5 minutes)**

Since ScoresView.tsx is complex (665 lines), here's the **fastest fix** to get synchronization working:

### **Option 1: Update Subject Data Source Only** (Recommended)

Change just **line 95-97** in ScoresView.tsx:

```typescript
// ❌ FIND THIS (around line 95-97):
const subjects = selectedSubject === "all" 
  ? preALevelProgram.subjects 
  : preALevelProgram.subjects.filter(s => s.id === selectedSubject);

// ✅ REPLACE WITH:
import { useSubjectWithTopics } from '@/hooks/useSupabaseData';

// At the top of the component:
const { data: subjectsData = [] } = useSubjectWithTopics('pre-a-level');

// Then line 95-97 becomes:
const subjects = selectedSubject === "all" 
  ? subjectsData
  : subjectsData.filter(s => s.id === selectedSubject);
```

This single change will make both pages show the same subjects!

---

## 📝 **Step-by-Step Instructions**

### **1. Add Import** (Line 1-50 area)

Find the imports section and add:
```typescript
import { 
  useSubjectWithTopics,
  useClasses,
  useClassScores 
} from '@/hooks/useSupabaseData';
```

### **2. Add Hook in Component** (After line 71)

```typescript
export function ScoresView({ students: initialStudents = mockStudents }: ScoresViewProps) {
  // Add this line:
  const { data: subjectsFromDB = [], isLoading: subjectsLoading } = useSubjectWithTopics('pre-a-level');
  
  const [students, setStudents] = useState<Student[]>(initialStudents);
  // ... rest of code
```

### **3. Replace subjects calculation** (Line 95-97)

```typescript
// ❌ OLD:
const subjects = selectedSubject === "all" 
  ? preALevelProgram.subjects 
  : preALevelProgram.subjects.filter(s => s.id === selectedSubject);

// ✅ NEW:
const subjects = selectedSubject === "all" 
  ? subjectsFromDB
  : subjectsFromDB.filter(s => s.id === selectedSubject);
```

---

## 🎯 **Even Simpler: Find & Replace**

1. Open `src/components/scores/ScoresView.tsx`

2. Find this text:
   ```
   preALevelProgram.subjects
   ```

3. Replace ALL occurrences with:
   ```
   subjectsFromDB
   ```

4. Add at the top of the component (after line 71):
   ```typescript
   const { data: subjectsFromDB = [] } = useSubjectWithTopics('pre-a-level');
   ```

5. Add to imports (top of file):
   ```typescript
   import { useSubjectWithTopics } from '@/hooks/useSupabaseData';
   ```

---

## ✅ **Expected Result**

After this change:

**Scores Page** will show:
- ✅ Biology  
- ✅ Mathematics
- ✅ English
- ✅ Thai Language
- ✅ Social Studies

Same as Management page! 🎉

---

## 🔧 **Full Component Migration (Later)**

For a complete fix, all of these need updating:

| Mock Data | Replace With | Priority |
|-----------|-------------|----------|
| `preALevelProgram.subjects` | `useSubjectWithTopics()` | 🔴 URGENT |
| `mockStudents` | `useClassScores()` | 🟡 HIGH |
| `classGroups` | `useClasses()` | 🟡 HIGH |
| `getSubjectScore()` | `calculateSubjectScore()` | 🟢 MEDIUM |
| `getTotalScore()` | `calculateTotalScore()` | 🟢 MEDIUM |
| `getClassAverage()` | `useClassStatistics()` | 🟢 MEDIUM |

---

## 📋 **Manual Edit Guide**

If you want to do it manually:

**File:** `/Users/afnan/Documents/insightful-scores/src/components/scores/ScoresView.tsx`

**Step 1:** Add import (around line 47, after existing imports):
```typescript
import { useSubjectWithTopics } from '@/hooks/useSupabaseData';
```

**Step 2:** Add hook (around line 72, inside component):
```typescript
const { data: subjectsFromDB = [] } = useSubjectWithTopics('pre-a-level');
```

**Step 3:** Find line 95-97 and change:
```typescript
// From:
const subjects = selectedSubject === "all" 
  ? preALevelProgram.subjects 
  : preALevelProgram.subjects.filter(s => s.id === selectedSubject);

// To:
const subjects = selectedSubject === "all" 
  ? subjectsFromDB
  : subjectsFromDB.filter(s => s.id === selectedSubject);
```

**Step 4:** Save file

**Step 5:** Refresh browser (Cmd+Shift+R)

---

## ✨ **Test It**

1. Go to Management → Subjects
2. Note which subjects are listed
3. Go to Scores page  (คะแนน)
4. ✅ Should show **same subjects**!

---

**This is the minimal change needed to fix synchronization!**

The other mock data (students, classes) can be migrated later as a separate task.

---

Created: 2026-01-20 16:51
Priority: 🔴 URGENT
Status: Ready to implement
