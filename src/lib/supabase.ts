import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gaoguwecvtmwkuycbxym.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdhb2d1d2VjdnRtd2t1eWNieHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NjY1MjksImV4cCI6MjA3NzA0MjUyOX0.uyIDiQKNhOVmmytX2A3_ZZFWlxKKU1H6O4kz99tzoe4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
