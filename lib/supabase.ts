import { createClient } from '@supabase/supabase-js';

// You will get these from your Supabase Dashboard -> Project Settings -> API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zvsvdltydzltohtgjvgw.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2c3ZkbHR5ZHpsdG9odGdqdmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4ODE2OTAsImV4cCI6MjA4ODQ1NzY5MH0.5P7S8sT8yZmtf_dAa1ATE5V3ghMJwDj56vH-0ScDhC4';

export const supabase = createClient(supabaseUrl, supabaseKey);