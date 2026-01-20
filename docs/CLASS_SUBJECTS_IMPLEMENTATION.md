# 🎓 Class-Specific Subjects - Implementation Complete!

## ✅ **What Was Implemented**

### **Many-to-Many Relationship**
- ✅ Each class can select which subjects to teach
- ✅ Subjects can be shared across multiple classes
- ✅ Easy to add/remove subjects from a class

---

## 📊 **Database Changes**

### **New Table: `class_subjects`**

```sql
CREATE TABLE class_subjects (
  id UUID PRIMARY KEY,
  class_id TEXT REFERENCES classes(id),
  subject_id TEXT REFERENCES subjects(id),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(class_id, subject_id)
);
```

**Example Data:**
```
| class_id | subject_id    | is_active |
|----------|---------------|-----------|
| m61      | biology       | true      |
| m61      | chemistry     | true      |
| m62      | mathematics   | true      |
| m62      | english       | true      |
```

---

## 🔧 **New Hooks Added**

### **1. useClassSubjects(classId)**

Get all subjects assigned to a specific class:

```typescript
const { data: subjects } = useClassSubjects('m61');
// Returns: [biology, chemistry, ...] for M.6/1
```

### **2. useAvailableSubjects(classId)**

Get subjects NOT yet assigned to a class:

```typescript
const { data: available } = useAvailableSubjects('m61');
// Returns: [mathematics, english, ...] (not assigned yet)
```

### **3. useAssignSubjectToClass()**

Add a subject to a class:

```typescript
const assign = useAssignSubjectToClass();
assign.mutate({ classId: 'm61', subjectId: 'mathematics' });
```

### **4. useRemoveSubjectFromClass()**

Remove a subject from a class:

```typescript
const remove = useRemoveSubjectFromClass();
remove.mutate({ classId: 'm61', subjectId: 'biology' });
```

---

## 🎯 **How It Works**

### **Scenario:**

**M.6/1:**
- Biology ✅
- Chemistry ✅
- Mathematics ✅

**M.6/2:**
- English ✅
- Mathematics ✅ (same as M.6/1 - shared!)
- Social Studies ✅

**M.6/3:**
- Thai Language ✅
- English ✅ (shared with M.6/2!)

---

## 📝 **Next Steps for Complete Integration**

### **1. Update Subject Management Page**

Add class selector to manage subjects per class:

```typescript
// In SubjectManagement.tsx

const [selectedClass, setSelectedClass] = useState('all');
const { data: classSubjects } = useClassSubjects(selectedClass);
const { data: availableSubjects } = useAvailableSubjects(selectedClass);
const assign = useAssignSubjectToClass();
const remove = useRemoveSubjectFromClass();

// Show subjects for selected class
// Button to add subjects from available pool
// Button to remove subjects from class
```

### **2. Update Scores Page**

Filter subjects by selected class:

```typescript
// In ScoresView.tsx

const { data: classSubjects } = useClassSubjects(selectedClass);

// Map to component format
const subjects = classSubjects?.map(cs => ({
  ...cs.subjects,
  subTopics: cs.subjects.sub_topics?.map(st => ({
    id: st.id,
    name: st.name,
    maxScore: st.max_score
  }))
})) || [];
```

### **3. Update Analytics Dashboard**

Show only subjects for the selected class.

---

## ✅ **Migration Status**

- ✅ Database migration created: `20260120170736_class_subjects.sql`
- ✅ Migration applied to database
- ✅ Hooks added to `useSupabaseData.ts`
- ✅ RLS policies configured
- ✅ Helper functions created
- ⏳ UI components need updating

---

## 🧪 **Testing**

### **Test in SQL Editor:**

```sql
-- See all class-subject assignments
SELECT 
  c.name as class_name,
  s.name as subject_name,
  cs.is_active
FROM class_subjects cs
JOIN classes c ON c.id = cs.class_id
JOIN subjects s ON s.id = cs.subject_id
ORDER BY c.name, cs.display_order, s.name;
```

### **Test Hooks:**

1. Open Management page
2. Select a class
3. View assigned subjects
4. Add a new subject
5. Remove a subject
6. Switch to different class
7. ✅ Should see different subjects!

---

## 📋 **Migration File Location**

```
/Users/afnan/Documents/insightful-scores/supabase/migrations/
└── 20260120170736_class_subjects.sql
```

---

## 🎨 **UI Design Suggestions**

### **Subject Management Page:**

```
┌─────────────────────────────────────────┐
│ Management → Subjects                   │
│                                         │
│ Class: [M.6/1 ▼]                       │
│                                         │
│ Assigned Subjects:                      │
│ ┌───────────────────────────┐          │
│ │ • Biology          [Remove]│          │
│ │ • Chemistry        [Remove]│          │
│ │ • Mathematics      [Remove]│          │
│ └───────────────────────────┘          │
│                                         │
│ Available Subjects:                     │
│ ┌───────────────────────────┐          │
│ │ ☐ English          [Add]  │          │
│ │ ☐ Social Studies   [Add]  │          │
│ │ ☐ Thai Language    [Add]  │          │
│ └───────────────────────────┘          │
└─────────────────────────────────────────┘
```

---

## 🚀 **Benefits**

### **For Teachers:**
- ✅ Assign different subjects to different classes
- ✅ Reuse subjects across classes
- ✅ Easy to manage which class teaches what

### **For Students:**
- ✅ See only subjects relevant to their class
- ✅ Clearer score view

### **For System:**
- ✅ Flexible many-to-many relationship
- ✅ Proper database normalization
- ✅ CASCADE deletes maintain integrity

---

## 📚 **Example Queries**

### **Get subjects for M.6/1:**
```typescript
const { data } = useClassSubjects('m61');
```

### **Assign English to M.6/1:**
```typescript
assignSubject.mutate({ 
  classId: 'm61', 
  subjectId: 'english' 
});
```

### **Check what subjects are available to add:**
```typescript
const { data } = useAvailableSubjects('m61');
```

---

## ⚠️ **Important Notes**

1. **Initial Data:** All existing subjects were auto-assigned to all classes as a starting point.

2. **Deletion:** Deleting a subject from the master list will remove it from ALL classes (CASCADE).

3. **Sharing:** The same subject can be taught by multiple classes - they share the same sub-topics and max scores.

---

**Status:** ✅ Backend Complete, UI Update Pending

**Created:** 2026-01-20 17:07  
**Migration:** 20260120170736_class_subjects.sql  
**Hooks:** Added to useSupabaseData.ts
