import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

export const supabase = createClient(
  'https://onvdroagzgqlecxcgzxh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udmRyb2FnemdxbGVjeGNnenhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1ODM0NjIsImV4cCI6MjA2MjE1OTQ2Mn0.gYPjyKBTkfvLFqr2Pyix0tcgG7wOcMF0c0zKOXrGBB4'
);