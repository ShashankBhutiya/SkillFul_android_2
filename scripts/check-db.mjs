import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  console.log('Connecting to Supabase at:', supabaseUrl);
  
  // Check leaderboard_scores
  const { data: scores, error: scoresError, count: scoresCount } = await supabase
    .from('leaderboard_scores')
    .select('*', { count: 'exact' });
    
  if (scoresError) {
    console.error('Error fetching leaderboard_scores:', scoresError);
  } else {
    console.log(`leaderboard_scores table has ${scoresCount} records.`);
    console.log('Sample records:', scores);
  }

  // Check profiles
  const { data: profiles, error: profilesError, count: profilesCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' });

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  } else {
    console.log(`profiles table has ${profilesCount} records.`);
    if (profilesCount > 0) {
      console.log('Sample profiles:', profiles.slice(0, 5));
    }
  }

  // Check user_progress
  const { data: progress, error: progressError, count: progressCount } = await supabase
    .from('user_progress')
    .select('*', { count: 'exact' });

  if (progressError) {
    console.error('Error fetching user_progress:', progressError);
  } else {
    console.log(`user_progress table has ${progressCount} records.`);
    if (progressCount > 0) {
      console.log('Sample user_progress:', progress.slice(0, 5));
    }
  }
}

checkDatabase();
