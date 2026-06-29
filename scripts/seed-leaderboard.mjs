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

async function seedLeaderboard() {
  console.log('Seeding leaderboard_scores into Supabase at:', supabaseUrl);
  
  // Read leaderboard_scores.json
  const jsonPath = path.join(__dirname, '..', 'leaderboard_scores.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('leaderboard_scores.json file not found at:', jsonPath);
    process.exit(1);
  }
  
  const scoresData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`Loaded ${scoresData.length} records from leaderboard_scores.json`);
  
  // Clean up data for upsert
  const records = scoresData.map(item => ({
    user_id: item.user_id,
    display_name: item.display_name,
    category_id: item.category_id,
    difficulty: item.difficulty,
    score: item.score,
    correct_count: item.correct_count,
    total_questions: item.total_questions,
    best_streak: item.best_streak,
    accuracy_pct: item.accuracy_pct,
    played_at: item.played_at || new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('leaderboard_scores')
    .upsert(records, { onConflict: 'user_id,category_id,difficulty' });

  if (error) {
    console.error('Error inserting leaderboard scores:', error);
    process.exit(1);
  }

  console.log('Successfully upserted leaderboard scores!');
  
  // Fetch and display current leaderboard
  const { data: currentScores, error: fetchError } = await supabase
    .from('leaderboard_scores')
    .select('*');
    
  if (fetchError) {
    console.error('Error fetching scores:', fetchError);
  } else {
    console.log(`Current leaderboard_scores count: ${currentScores.length}`);
    console.table(currentScores.map(s => ({
      name: s.display_name,
      category: s.category_id,
      difficulty: s.difficulty,
      score: s.score,
      accuracy: s.accuracy_pct + '%'
    })));
  }
}

seedLeaderboard();
