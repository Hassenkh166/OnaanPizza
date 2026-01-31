// Idempotent Supabase client initialization (never re-declare)
if (!window.__supabaseInitialized) {
  if (!window.supabase || typeof window.supabase.auth !== 'object') {
    window.supabase = window.supabase?.createClient
      ? window.supabase.createClient(
          'https://ecgujuutpxebpjwdwhcy.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ3VqdXV0cHhlYnBqd2R3aGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDk5MjUsImV4cCI6MjA4MzU4NTkyNX0.oLTY0FHaDVIQUFQqZYPunh4yn3JpGGRHoxW_NXaYNgE'
        )
      : undefined;
  }
  window.__supabaseInitialized = true;
}
