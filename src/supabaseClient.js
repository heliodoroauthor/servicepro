import { createClient } from '@supabase/supabase-js';

// Public client config — safe to ship to the browser.
// RLS protects the data; the secret service_role key NEVER goes here.
const SUPABASE_URL = 'https://ymodnqokpfnqesunxsiw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3ZqwlI7b8tITXom8A_XvZg_d_jkVHjd';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
