# 🎯 Quick Start Guide - Project cvdgfhkabzcpyxxzpvyc

## ✅ Your Project Details

**Supabase Project:** `cvdgfhkabzcpyxxzpvyc`  
**Dashboard:** https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc  
**Database Editor:** https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc/editor

---

## 🚀 Current Issue: Email Validation

The error `Email address "admin123@gmail.com" is invalid` suggests Supabase's email validation or domain restrictions.

### **Solution 1: Disable Email Confirmations (Development)**

1. Go to: https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc/auth/providers

2. Click **"Email"** provider

3. Find **"Confirm email"** toggle

4. **Disable** it for development

5. Save settings

### **Solution 2: Use Different Email Format**

Try these formats that usually work:

```
Email: test.admin@gmail.com
Email: admin.IDS E-Portfolio system@gmail.com  
Email: myemail+admin@gmail.com
```

Avoid:
- ❌ `admin123@gmail.com` (looks suspicious to validators)
- ❌ `test@test.com` (blocked test domains)
- ❌ Numbers only in username

---

## 📝 Step-by-Step Signup

### 1. Start Your App

```bash
npm run dev
```

Visit: http://localhost:5173

### 2. Create Account

Go to **"สมัครสมาชิก"** (Signup) tab

Enter:
```
ชื่อ-นามสกุล: Admin User
อีเมล: myemail.admin@gmail.com  ← Use a real-looking email
รหัสผ่าน: SecurePass123
```

### 3. Upgrade to Admin

Open SQL Editor:
https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc/sql

Run this:
```sql
-- Check if user was created
SELECT 
  p.email,
  p.full_name,
  ur.role
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
ORDER BY p.created_at DESC
LIMIT 5;
```

Then upgrade to admin:
```sql
-- Make yourself admin (replace with your actual email)
UPDATE user_roles
SET role = 'admin'
WHERE user_id = (
  SELECT user_id 
  FROM profiles 
  WHERE email = 'myemail.admin@gmail.com'
);
```

Verify:
```sql
SELECT p.email, ur.role
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
WHERE p.email = 'myemail.admin@gmail.com';
```

Should show: `role: admin`

### 4. Login

- Logout from the app
- Login with the same email/password
- You're now admin! 🎉

---

## 🔧 Troubleshooting Email Validation

### Method 1: Check Email Provider Settings

```sql
-- Run in SQL Editor to see auth configuration
SELECT * FROM auth.config;
```

### Method 2: Bypass Email Confirmation

In Supabase Dashboard:
1. Auth → Providers → Email
2. Disable "Confirm email"  
3. Disable "Secure email change"
4. Save

### Method 3: Use OAuth Instead

Click **"สมัครด้วย Google"** button to signup with Google OAuth - this bypasses email validation!

Then upgrade your role via SQL as shown above.

---

## 🎯 Alternative: Use OAuth Signup

**Easiest method:**

1. Click **"สมัครด้วย Google"** (Sign up with Google)
2. Authorize with your Google account
3. You'll be created as a student
4. Run SQL to upgrade:
   ```sql
   -- Find your user by Google email
   SELECT p.email, ur.role 
   FROM profiles p 
   JOIN user_roles ur ON ur.user_id = p.user_id
   WHERE p.email = 'yourgoogle@gmail.com';
   
   -- Upgrade to admin
   UPDATE user_roles
   SET role = 'admin'
   WHERE user_id = (
     SELECT user_id FROM profiles WHERE email = 'yourgoogle@gmail.com'
   );
   ```
5. Logout and login - you're admin!

---

## 📊 Verify Database Setup

Check if migrations are applied:

```sql
-- Should return 9 tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'exam_programs',
  'subjects', 
  'sub_topics',
  'classes',
  'students',
  'student_scores',
  'score_history',
  'profiles',
  'user_roles'
)
ORDER BY table_name;
```

Check sample data:
```sql
-- Should return 15 students
SELECT COUNT(*) FROM students;

-- Should return ~495 scores
SELECT COUNT(*) FROM student_scores;
```

---

## ✨ What to Do After Becoming Admin

1. **View User Management**
   - Navigate to "Users" tab (only admins see this)

2. **Create More Users**
   - Add teachers and students via the interface

3. **Test Features**
   - View all classes
   - Edit scores
   - Manage students

---

## 🔗 Quick Links

- **Dashboard:** https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc
- **SQL Editor:** https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc/sql
- **Auth Settings:** https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc/auth/providers
- **Database Editor:** https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc/editor

---

## 📞 Still Having Issues?

If you continue to see email validation errors:

1. **Check Supabase Auth Logs:**
   https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc/logs/explorer

2. **Try Different Email:**
   - Use your actual work/school email
   - Use Gmail with `+` suffix: `youremail+test@gmail.com`

3. **Use Google OAuth:**
   - Easiest and most reliable method
   - No email validation issues

---

**Created:** 2026-01-20  
**Project:** cvdgfhkabzcpyxxzpvyc  
**Status:** Ready to use! ✅
