const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://cvdgfhkabzcpyxxzpvyc.supabase.co';
const SERVICE_KEY = 'sb_secret_i5nbcqbg74ktoNpf9kDDgg_62LUU8f6';

const options = {
    method: 'GET',
    headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(`${SUPABASE_URL}/auth/v1/admin/users`, options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const parsed = JSON.parse(data);
        fs.writeFileSync('users_output.json', JSON.stringify(parsed, null, 2));
        console.log("Wrote full output to users_output.json");
    });
});

req.end();
