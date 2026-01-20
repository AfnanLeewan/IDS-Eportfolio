# 🚨 Fix 401 Unauthorized Error

## Problem

Getting `401 (Unauthorized)` and `Invalid API key` error when trying to signup.

---

## ✅ **Solution Steps**

### **Step 1: Verify and Update API Key**

1. **Open Supabase Settings:**
   https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc/settings/api

2. **Copy the correct keys:**
   - Look for **"Project API keys"** section
   - Copy the **"anon" "public"** key (NOT the service_role key!)
   - It should be a long string starting with `eyJ...`

3. **Update your `.env` file:**

   Replace the entire file with:
   ```bash
   VITE_SUPABASE_PROJECT_ID="cvdgfhkabzcpyxxzpvyc"
   VITE_SUPABASE_PUBLISHABLE_KEY="PASTE_YOUR_ANON_KEY_HERE"
   VITE_SUPABASE_URL="https://cvdgfhkabzcpyxxzpvyc.supabase.co"
   ```

4. **Stop and restart your dev server:**
   ```bash
   # Press Ctrl+C to stop current server
   # Then restart:
   npm run dev
   ```

5. **Hard refresh browser:**
   - Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Or clear cache and reload

### **Step 2: Enable Email Auth**

1. **Go to Auth Providers:**
   https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc/auth/providers

2. **Make sure "Email" is enabled:**
   - Toggle should be ON
   - Disable "Confirm email" for development
   - Save changes

### **Step 3: Check Site URL Settings**

1. **Go to Auth Settings:**
   https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc/auth/url-configuration

2. **Add to "Redirect URLs":**
   ```
   http://localhost:5173
   http://localhost:5173/
   http://localhost:5173/**
   http://localhost:8080
   http://localhost:8080/
   ```

3. **Set Site URL to:**
   ```
   http://localhost:5173
   ```

4. **Save changes**

---

## 🔍 **Detailed Diagnostics**

### Test 1: Verify API Key Works

Open browser console and run:

```javascript
// Test if API key is valid
fetch('https://cvdgfhkabzcpyxxzpvyc.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'YOUR_API_KEY_HERE',
    'Authorization': 'Bearer YOUR_API_KEY_HERE'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Expected:** Should return some JSON (not 401 error)

### Test 2: Check Environment Variables

In browser console:
```javascript
console.log('Project ID:', import.meta.env.VITE_SUPABASE_PROJECT_ID);
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key (first 20 chars):', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20));
```

**Expected:** Should show your values, not undefined

### Test 3: Direct Supabase Test

```javascript
// In browser console (on your app page)
import { supabase } from './src/integrations/supabase/client';

// Test connection
supabase.from('profiles').select('count').then(console.log);
```

---

## 📝 **Alternative: Manual API Key Retrieval**

If you can't access the dashboard:

### Via Supabase CLI:

```bash
# Get project details
supabase projects list

# Get API keys
supabase projects api-keys --project-ref cvdgfhkabzcpyxxzpvyc
```

---

## 🎯 **Quick Fix Checklist**

- [ ] ✅ Got anon/public API key from Supabase dashboard
- [ ] ✅ Updated `.env` file with correct key
- [ ] ✅ Restarted dev server (`npm run dev`)
- [ ] ✅ Hard refreshed browser (Cmd+Shift+R)
- [ ] ✅ Email provider is ENABLED in Supabase
- [ ] ✅ Localhost URLs added to redirect URLs
- [ ] ✅ Tried a different email format
- [ ] ✅ Disabled "Confirm email" in settings

---

## 🔥 **Nuclear Option: Use Google OAuth Instead**

If email signup keeps failing, use Google OAuth (it's more reliable):

1. **Enable Google OAuth:**
   https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc/auth/providers

2. **Click "Google" and follow setup**

3. **In your app, click "สมัครด้วย Google"**

4. **Upgrade to admin via SQL:**
   ```sql
   UPDATE user_roles SET role = 'admin'
   WHERE user_id = (
     SELECT user_id FROM profiles WHERE email = 'your-google@gmail.com'
   );
   ```

---

## 🛠️ **Still Not Working?**

### Check Supabase Service Status

Visit: https://status.supabase.com/

### View Auth Logs

https://cvdgfhkabzcpyxxzpvyc.supabase.co/project/cvdgfhkabzcpyxxzpvyc/logs/auth-logs

Look for recent failed signup attempts and error messages.

### Try Different Browser

Sometimes browser extensions block auth requests. Try:
- Incognito/Private mode
- Different browser
- Disable ad blockers

---

## 📞 **Contact Support**

If nothing works:

1. **Supabase Discord:** https://discord.supabase.com
2. **GitHub Issues:** https://github.com/supabase/supabase/issues

Provide:
- Your project ref: `cvdgfhkabzcpyxxzpvyc`
- Error screenshot
- Browser console logs

---

## 💡 **Most Common Cause**

**99% of 401 errors are due to:**

1. ❌ Wrong API key in `.env`
2. ❌ Server not restarted after changing `.env`
3. ❌ Browser cache not cleared
4. ❌ Email provider disabled in Supabase

**Double-check these first!**

---

Created: 2026-01-20  
Last Updated: 2026-01-20
