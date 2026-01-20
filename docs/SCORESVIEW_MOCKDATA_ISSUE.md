# 🔄 URGENT: ScoresView Still Using MockData!

## 🚨 **Problem Confirmed**

**Management Page** (✅ Fixed):
- Shows: Biology, Mathematics, English, Thai Language, Social Studies
- ✅ Reading from DATABASE

**Scores Page** (❌ Still Broken):
- Shows: Physics, Chemistry, Biology, Mathematics, English
- ❌ Reading from MOCKDATA

---

## 📍 **Root Cause**

File: `src/components/scores/ScoresView.tsx`

**Line 39-47:**
```typescript
import {
  mockStudents,           // ❌ Mock data
  classGroups,           // ❌ Mock data
  preALevelProgram,      // ❌ Mock data (has Physics, Chemistry...)
  getSubjectScore,       // ❌ Mock function
  getTotalScore,         // ❌ Mock function
  getClassAverage,       // ❌ Mock function
  Student,
  Subject,
} from "@/lib/mockData";
```

**Line 71-72:**
```typescript
export function ScoresView({ students: initialStudents = mockStudents }: ScoresViewProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  // ❌ Using mock data!
```

---

## ✅ **Solution**

Need to replace mockData imports with database hooks:

```typescript
// ❌ OLD:
import { mockStudents, preALevelProgram } from '@/lib/mockData';
const [students, setStudents] = useState(mockStudents);
const subjects = preALevelProgram.subjects;

// ✅ NEW:
import { useClassScores, useSubjectWithTopics } from '@/hooks/useSupabaseData';
const { data: students = [] } = useClassScores(selectedClass);
const { data: subjects = [] } = useSubjectWithTopics('pre-a-level');
```

---

## 📋 **This Component Depends On:**

1. `mockStudents` → Replace with `useClassScores()`
2. `classGroups` → Replace with `useClasses()`
3. `preALevelProgram.subjects` → Replace with `useSubjectWithTopics()`
4. `getSubjectScore()` → Replace with `calculateSubjectScore()` from dataUtils
5. `getTotalScore()` → Replace with `calculateTotalScore()` from dataUtils
6. `getClassAverage()` → Replace with `useClassStatistics()`

---

## 🎯 **Expected After Fix**

Both pages will show:
- Biology
- Mathematics  
- English
- Thai Language
- Social Studies

✅ Synchronized from same database source!

---

**Status:** Fixing now...

Created: 2026-01-20 16:50
Priority: URGENT
