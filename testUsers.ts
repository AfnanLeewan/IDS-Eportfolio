import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const envVars = envFile.split('\n').reduce((acc: any, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const supabase = createClient(
    envVars.VITE_SUPABASE_URL,
    envVars.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('Error:', error);
        return;
    }

    const recent = data.users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
    console.log(JSON.stringify(recent, null, 2));
}

checkUsers();
