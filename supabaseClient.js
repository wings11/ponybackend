import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in your environment variables or .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
