// src/services/supabase.js
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase URL and Anon Key from Project Settings -> API
const supabaseUrl = 'https://cglspaicsncbbnymdavp.supabase.co';
const supabaseAnonKey = 'sb_publishable_uJnFmDSNOi7tTgZ7olMX4g_UUjhVmrx';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);