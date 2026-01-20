# 🐛 Blank Scores Page - Troubleshooting

## ✅ **Fix Applied**

Added loading state to prevent blank page.

---

## 🔍 **Check These Things**

### **1. Check Browser Console**

Open browser Developer Tools (F12) and look for errors:

```
Press F12 → Console tab
```

Look for:
- ❌ Red error messages
- ⚠️ Warning messages
- Any TypeScript errors

**Common errors:**
- "Cannot read property 'id' of undefined"
- "subjectsFromDB is not iterable"
- "TypeError: ..."

---

### **2. Check if Subjects Exist in Database**

Open Supabase SQL Editor and run:

```sql
SELECT * FROM subjects;
```

**Expected result:** Should return rows like:
```
| id       | name        | code | program_id   |
|----------|-------------|------|--------------|
| biology  | Biology     | BIO  | pre-a-level  |
| math     | Mathematics | MAT  | pre-a-level  |
```

**If empty:** You need to add subjects via Management page first!

---

### **3. Check Sub-topics**

```sql
SELECT * FROM sub_topics;
```

Should return rows with `subject_id`, `name`, `max_score`.

---

### **4. Verify Data is Loading**

Add this temporarily to ScoresView.tsx (after line 75):

```typescript
console.log('Subjects from DB:', subjectsFromDB);
console.log('Is Loading:', subjectsLoading);
console.log('Subjects count:', subjectsFromDB.length);
```

Then check the browser console.

---

## 🔧 **Quick Fixes**

### **Fix 1: Reset to Mock Data Temporarily**

If you need the page working immediately, revert ScoresView:

```bash
git checkout src/components/scores/ScoresView.tsx
```

This will use mock data again (but won't sync with Management).

### **Fix 2: Add Subjects via Management**

1. Go to Management → Subjects
2. Click "Add Subject"
3. Add at least one subject
4. Go back to Scores page
5. Should work now

### **Fix 3: Check Type Mismatch**

The database returns:
```typescript
{
  id: string,
  name: string,
  code: string,
  program_id: string,
  sub_topics: Array<{
    id: string,
    name: string,
    max_score: number
  }>
}
```

But mockData expects:
```typescript
{
  id: string,
  name: string,
  code: string,
  subTopics: Array<{  // Note: different property name!
    id: string,
    name: string,
    maxScore: number  // Note: camelCase!
  }>
}
```

**The property names don't match!** This might be causing the issue.

---

## ✅ **Proper Fix: Map Database Format to Component Format**

Update ScoresView.tsx line 100-103:

```typescript
// Use database subjects and map to expected format
const subjects = useMemo(() => {
  const dbSubjects = selectedSubject === "all" 
    ? subjectsFromDB
    : subjectsFromDB.filter(s => s.id === selectedSubject);
  
  // Map database format to component format
  return dbSubjects.map(subject => ({
    ...subject,
    subTopics: subject.sub_topics?.map(st => ({
      id: st.id,
      name: st.name,
      maxScore: st.max_score, // Convert snake_case to camelCase
    })) || []
  }));
}, [subjectsFromDB, selectedSubject]);
```

---

## 🆘 **Still Blank?**

### **Option A: Share Console Errors**

1. Press F12
2. Go to Console tab
3. Take screenshot of any errors
4. Share with me

### **Option B: Check Network Tab**

1. Press F12
2. Go to Network tab
3. Reload page
4. Look for failed requests (red)
5. Check if API calls to Supabase are succeeding

### **Option C: Verify Auth**

Make sure you're logged in:
```typescript
// Add to console
console.log('User:', authUser);
console.log('Role:', role);
```

If not logged in, the RLS policies might block data access.

---

## 📝 **Next Steps**

1. ✅ Check browser console for errors
2. ✅ Check if subjects exist in database  
3. ✅ Add console.log to see what data is loaded
4. ✅ Apply proper format mapping if needed

---

**Most Likely Cause:**
- Property name mismatch (`sub_topics` vs `subTopics`)
- Empty database (no subjects added yet)
- TypeScript type inference error

---

Created: 2026-01-20 16:54
Status: Investigating
