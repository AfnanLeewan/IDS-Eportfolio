const fs = require('fs');
const https = require('https');

const envFile = fs.readFileSync('.env', 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SERVICE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

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

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        const usersData = JSON.parse(data);
        if (!usersData.users) {
            console.log("No users found or error:", usersData);
            return;
        }
        const recent = usersData.users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
        console.log(JSON.stringify(recent, null, 2));
    });
});

req.on('error', (e) => {
    console.error(e);
});
req.end();
