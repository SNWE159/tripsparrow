// Supabase configuration
const SUPABASE_URL = 'https://wubuxdvluvpysvffdioe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YnV4ZHZsdXZweXN2ZmZkaW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MzQ3NzgsImV4cCI6MjA3MzQxMDc3OH0.2ylSrohGqLejj7Ldod_XS8JiRtbdcLDpGc7EhcyImSA';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        console.log('User signed in:', session.user);
        // Redirect to dashboard or update UI
        window.location.href = 'dashboard.html';
    } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        // Update UI for logged out state
    }
});

export { supabase };