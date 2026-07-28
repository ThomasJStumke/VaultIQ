import { createClient } from '@supabase/supabase-js';

// A tab opened for "View as user" (Platform Setup > Users) carries
// ?impersonate=<profileId> and must never read or write the admin's own
// session in localStorage -- it gets its own sessionStorage-scoped session
// instead, so closing the tab (or a normal login in another tab) can't cross
//-contaminate the two. See App.tsx's impersonation bootstrap effect.
export const isImpersonationTab =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('impersonate');

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  isImpersonationTab ? { auth: { storage: window.sessionStorage } } : undefined
);
