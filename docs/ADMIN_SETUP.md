# 🔐 How to Login as Admin

## Quick Answer

By default, **all new users are created as students**. To become an admin, you need to:

1. **Create an account** through the app
2. **Manually upgrade your role to 'admin'** in the Supabase dashboard

Let me guide you through both methods:

---

## Method 1: Create Admin via Supabase Dashboard (Recommended)

### Step 1: Create Your Account

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:5173`

3. Click **"สมัครสมาชิก"** (Sign Up)

4. Enter your details:
   ```
   Email: admin@example.com
   Password: admin123456
   Name: Admin User
   ```

5. Click **"สมัครสมาชิก"** to create account

6. You'll be logged in as a **student** (default role)

### Step 2: Upgrade to Admin Role

1. **Open Supabase Dashboard**
   
   Visit: https://vydkiostfqlsjucyxsph.supabase.co/project/vydkiostfqlsjucyxsph/editor

2. **Go to SQL Editor**
   
   Click "SQL Editor" in the left sidebar

3. **Run This SQL Query**
   
   ```sql
   -- Find your user ID first
   SELECT 
     ur.user_id,
     p.email,
     p.full_name,
     ur.role
   FROM user_roles ur
   JOIN profiles p ON p.user_id = ur.user_id
   WHERE p.email = 'admin@example.com';
   ```

4. **Copy the `user_id` from the result**

5. **Update Your Role to Admin**
   
   ```sql
   -- Replace YOUR_USER_ID with the actual UUID from step 4
   UPDATE user_roles
   SET role = 'admin'
   WHERE user_id = 'YOUR_USER_ID';
   ```

6. **Verify the Change**
   
   ```sql
   SELECT 
     p.email,
     p.full_name,
     ur.role
   FROM user_roles ur
   JOIN profiles p ON p.user_id = ur.user_id
   WHERE p.email = 'admin@example.com';
   ```
   
   Should show: `role: admin`

7. **Logout and Login Again**
   
   - In your app, click logout
   - Login again with the same credentials
   - You're now an **admin**! 🎉

---

## Method 2: Using SQL Script (Fastest)

### One-Command Admin Creation

Run this in Supabase SQL Editor:

```sql
-- Get or create admin user and set admin role
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if user exists in auth.users by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@example.com';
  
  -- If user exists, just update the role
  IF admin_user_id IS NOT NULL THEN
    UPDATE user_roles
    SET role = 'admin'
    WHERE user_id = admin_user_id;
    
    RAISE NOTICE 'Admin role granted to existing user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'User not found. Please create account through the app first.';
  END IF;
END $$;
```

**Note:** You still need to create the account through the app first (signup page), then run this script.

---

## Method 3: Create Multiple Test Users

Use this script to create test accounts for all roles:

```sql
-- View all users and their roles
SELECT 
  p.email,
  p.full_name,
  ur.role,
  p.created_at
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
ORDER BY p.created_at DESC;
```

To upgrade any user to admin/teacher:

```sql
-- Make a user admin
UPDATE user_roles
SET role = 'admin'
WHERE user_id = (
  SELECT user_id FROM profiles WHERE email = 'youremail@example.com'
);

-- Or make a user teacher
UPDATE user_roles
SET role = 'teacher'
WHERE user_id = (
  SELECT user_id FROM profiles WHERE email = 'teacher@example.com'
);
```

---

## Quick Test Account Setup

### Create 3 Test Accounts:

1. **Admin Account**
   - Email: `admin@test.com`
   - Password: `Test123456`
   - Role: Admin (upgrade after signup)

2. **Teacher Account**
   - Email: `teacher@test.com`
   - Password: `Test123456`
   - Role: Teacher (upgrade after signup)

3. **Student Account**
   - Email: `student@test.com`
   - Password: `Test123456`
   - Role: Student (default)

### Upgrade Script:

After creating all three accounts via the app signup:

```sql
-- Upgrade admin
UPDATE user_roles
SET role = 'admin'
WHERE user_id = (SELECT user_id FROM profiles WHERE email = 'admin@test.com');

-- Upgrade teacher
UPDATE user_roles
SET role = 'teacher'
WHERE user_id = (SELECT user_id FROM profiles WHERE email = 'teacher@test.com');

-- Verify all roles
SELECT 
  p.email,
  ur.role
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
WHERE p.email IN ('admin@test.com', 'teacher@test.com', 'student@test.com')
ORDER BY ur.role;
```

---

## Verify Admin Access

Once logged in as admin, you should see:

### ✅ Admin Dashboard Features

1. **Header Navigation**
   - Dashboard
   - Scores
   - Management
   - **Users** (Admin only! ⭐)

2. **User Management Page**
   - View all users
   - Change user roles
   - See role badges

3. **Full Access**
   - All classes
   - All students
   - All scores
   - System configuration

### Test Admin Powers:

```typescript
// In browser console after login:
console.log('Your role:', localStorage.getItem('role'));
// Should show: "admin"
```

Or check in the app footer - it shows:
```
คุณเข้าสู่ระบบในฐานะ: ผู้ดูแลระบบ
(You are logged in as: Administrator)
```

---

## Troubleshooting

### Problem 1: "Still showing as student after upgrade"

**Solution:**
1. Logout completely
2. Clear browser cache/localStorage
3. Login again

Or run in browser console:
```javascript
localStorage.clear();
window.location.reload();
```

### Problem 2: "Cannot see Users menu"

**Solution:**
1. Check your role in database:
   ```sql
   SELECT role FROM user_roles 
   WHERE user_id = auth.uid();
   ```

2. Force refresh:
   ```javascript
   window.location.reload();
   ```

### Problem 3: "Row-Level Security blocking my queries"

**Solution:**
The RLS policies should allow admins. Check:

```sql
-- Test if you have admin role
SELECT public.has_role(auth.uid(), 'admin');
-- Should return: true
```

If it returns false, re-run the upgrade script.

---

## Automated Admin Setup Script

Save this as a helper script:

```sql
-- admin_setup.sql
-- Make a specific user an admin

-- Step 1: List all users
SELECT 
  p.user_id,
  p.email,
  p.full_name,
  ur.role
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
ORDER BY p.created_at DESC;

-- Step 2: Upgrade to admin (replace the email)
DO $$
DECLARE
  target_email TEXT := 'YOUR_EMAIL_HERE@example.com';
  target_user_id UUID;
BEGIN
  SELECT user_id INTO target_user_id
  FROM profiles
  WHERE email = target_email;
  
  IF target_user_id IS NOT NULL THEN
    UPDATE user_roles
    SET role = 'admin'
    WHERE user_id = target_user_id;
    
    RAISE NOTICE 'Successfully upgraded % to admin', target_email;
  ELSE
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;
END $$;
```

---

## Role Comparison

| Feature | Student | Teacher | Admin |
|---------|---------|---------|-------|
| View own scores | ✅ | ✅ | ✅ |
| View all students | ❌ | ✅ | ✅ |
| Edit scores | ❌ | ✅ | ✅ |
| Add students | ❌ | ✅ | ✅ |
| View analytics | ❌ | ✅ | ✅ |
| **Manage users** | ❌ | ❌ | ✅ |
| **Change roles** | ❌ | ❌ | ✅ |
| **View all classes** | ❌ | ✅ | ✅ |

---

## Quick Command Reference

```bash
# 1. Start app
npm run dev

# 2. Open Supabase Dashboard
open https://vydkiostfqlsjucyxsph.supabase.co/project/vydkiostfqlsjucyxsph/editor

# 3. Open app
open http://localhost:5173
```

**SQL Commands:**
```sql
-- View your current role
SELECT role FROM user_roles WHERE user_id = auth.uid();

-- Become admin (replace email)
UPDATE user_roles SET role = 'admin'
WHERE user_id = (SELECT user_id FROM profiles WHERE email = 'your@email.com');

-- View all users
SELECT p.email, ur.role FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id;
```

---

## Summary

**Fastest Way to Login as Admin:**

1. ✅ Signup via app: `http://localhost:5173/auth`
2. ✅ Open Supabase SQL Editor
3. ✅ Run:
   ```sql
   UPDATE user_roles SET role = 'admin'
   WHERE user_id = (SELECT user_id FROM profiles WHERE email = 'YOUR_EMAIL');
   ```
4. ✅ Logout and login again
5. ✅ You're admin! 🎉

**Default Login (if no setup):**
- All new signups = Student role
- Must manually upgrade via SQL

**Contact admin to upgrade your role if in production!**

---

Created: 2026-01-20  
Last Updated: 2026-01-20
