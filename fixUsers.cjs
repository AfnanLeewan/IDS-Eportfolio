const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://cvdgfhkabzcpyxxzpvyc.supabase.co';
const SERVICE_KEY = 'sb_secret_i5nbcqbg74ktoNpf9kDDgg_62LUU8f6';

const options = {
    method: 'POST',
    headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    },
    body: JSON.stringify({
        query: "SELECT id, email, is_sso_user, raw_app_meta_data FROM auth.users ORDER BY created_at DESC LIMIT 10"
    })
};

// We can use the REST API to query the database directly using postgres functions if there's an RPC,
// but since we don't have psql, I will create an RPC to fix the users via SQL over REST.
