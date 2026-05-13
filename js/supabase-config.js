// Supabase configuration
// 1) Create a project at https://supabase.com (no card required)
// 2) Project Settings → API → copy the URL and the "anon public" key
// 3) Paste below and commit. These two values are SAFE to expose in client-side code
//    because Row Level Security (RLS) gates writes — see schema SQL in chat.
//
// Leave both empty strings to fall back to localStorage mode.

window.SUPABASE_CONFIG = {
  url: 'https://qfcgbiecvklkojjrxswe.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmY2diaWVjdmtsa29qanJ4c3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Nzg0OTcsImV4cCI6MjA5NDE1NDQ5N30.tfWkkVcNpaAC0ZpKhn97e93ly1u7IO-vWPQ9T60s78M',
  // Storage bucket name for product images (create as Public in Supabase Storage UI)
  bucket: 'product-images',
};
