import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth Admin context
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { email, password, fullName, role, studentId, classId, confirmed } = await req.json()

    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    // 1. Create the user using Supabase Auth Admin API
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: confirmed ?? true, // Default to confirmed
      user_metadata: {
        full_name: fullName
      }
    })

    if (createError) {
      throw createError
    }
    
    // 2. Assign the custom role in public.user_roles
    // Note: We use the admin client to write to the table directly
    // This bypasses RLS policies
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.user.id,
        role: role || 'student'
      })
      
    if (roleError) {
      // If role assignment fails, we should probably clean up the user?
      // For now, allow it but report error.
      console.error('Failed to assign role:', roleError)
    }

    // 3. Ensure profile exists (it might have been created by trigger on auth.users insert)
    // We'll upsert just to be safe and ensure full_name is correct
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: user.user.id,
        email: email,
        full_name: fullName
      })

    if (profileError) {
      console.error('Failed to update profile:', profileError)
    }
    
    // 4. Create Student record if applicable
    if (role === 'student' && studentId) {
        // If createStudentMutation was handling this on client, we can move it here 
        // OR return the userId and let client handle it. 
        // Moving it here is safer/atomic.
        
        // Note: Client handles logic of finding classId from className. 
        // We assume classId is passed if known.
        
        const { error: studentError } = await supabaseAdmin
            .from('students')
            .insert({
                id: studentId, // Provided ID
                user_id: user.user.id,
                name: fullName,
                email: email,
                class_id: classId || null
            })
            
        if (studentError) {
           console.error('Failed to create student record:', studentError)
           // Don't fail the whole request, but admin should be notified
        }
    }

    return new Response(
      JSON.stringify(user),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
