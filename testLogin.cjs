const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const match = line.match(/^([A-Za-z0-9_]+)="?([^"\r\n]+)"?/);
    if (match) {
        acc[match[1]] = match[2].trim();
    }
    return acc;
}, {});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const ANON_KEY = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

async function testLogin() {
    console.log("Attempting login to", SUPABASE_URL);
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'apikey': ANON_KEY,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({
            email: 'john@example.com',
            password: 'password123'
        })
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log(JSON.stringify(data, null, 2));
}

testLogin().catch(console.error);
