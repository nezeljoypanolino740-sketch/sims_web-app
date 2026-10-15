// Supabase Edge Function: create-user  (Deno runtime)
//
// Creates a login on the server so that privileged accounts are never made
// from the browser. The caller must be an active `administrator` or `admin`:
//   * administrator may create administrator, admin or user (student) accounts
//   * admin may create student ('user') accounts only
// The service role key is read from the function's own environment and is
// never sent to the frontend.
import { createClient } from 'npm:@supabase/supabase-js@2';

type Role = 'administrator' | 'admin' | 'user';

interface RequestBody {
  email?: unknown;
  password?: unknown;
  full_name?: unknown;
  role?: unknown;
  student_id?: unknown;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'Server is not configured' }, 500);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Sign in to continue' }, 401);

  // 1. Who is calling? Verify the JWT with Supabase Auth.
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Your session has expired. Sign in again.' }, 401);

  // 2. What may they do? Read their role with the service client (bypasses RLS).
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: caller } = await admin
    .from('profiles')
    .select('role, account_status')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!caller || caller.account_status !== 'active' || (caller.role !== 'administrator' && caller.role !== 'admin')) {
    return json({ error: 'You do not have permission to create accounts' }, 403);
  }

  // 3. Validate the request body.
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const role = body.role as Role;
  const studentId = typeof body.student_id === 'string' && body.student_id ? body.student_id : null;

  if (!EMAIL_PATTERN.test(email) || email.length > 254) return json({ error: 'Enter a valid email address' }, 400);
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return json({ error: 'Password must be 8-72 characters with a letter and a number' }, 400);
  }
  if (fullName.length < 2 || fullName.length > 100) return json({ error: 'Enter the full name' }, 400);
  if (role !== 'administrator' && role !== 'admin' && role !== 'user') return json({ error: 'Invalid role' }, 400);
  if (studentId !== null && !UUID_PATTERN.test(studentId)) return json({ error: 'Invalid student record' }, 400);

  if (caller.role === 'admin' && role !== 'user') {
    return json({ error: 'Only an administrator can create admin or administrator accounts' }, 403);
  }
  if (studentId !== null && role !== 'user') {
    return json({ error: 'Only student accounts can be linked to a student record' }, 400);
  }

  // 4. If linking to a student record, make sure it is free and its email matches.
  if (studentId !== null) {
    const { data: student } = await admin
      .from('students')
      .select('id, email, profile_id')
      .eq('id', studentId)
      .maybeSingle();
    if (!student) return json({ error: 'Student record not found' }, 404);
    if (student.profile_id) return json({ error: 'That student record already has an account' }, 409);
    if (String(student.email).toLowerCase() !== email) {
      return json({ error: 'The email must match the email on the student record' }, 400);
    }
  }

  // 5. Create the auth user (a database trigger creates the profile as role 'user', status 'pending').
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError || !created.user) {
    const message = createError?.message.toLowerCase() ?? '';
    if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
      return json({ error: 'An account with this email already exists' }, 409);
    }
    return json({ error: 'The account could not be created' }, 500);
  }

  const newId = created.user.id;
  const rollback = async () => {
    await admin.auth.admin.deleteUser(newId);
  };

  // 6. Promote to the requested role and activate (service role: allowed by the profile guard trigger).
  const { error: profileError } = await admin
    .from('profiles')
    .update({ role, account_status: 'active', full_name: fullName })
    .eq('id', newId);
  if (profileError) {
    await rollback();
    return json({ error: 'The account could not be set up' }, 500);
  }

  // 7. Link to the student record, if requested.
  if (studentId !== null) {
    const { error: linkError } = await admin.from('students').update({ profile_id: newId }).eq('id', studentId);
    if (linkError) {
      await rollback();
      return json({ error: 'The account could not be linked to the student record' }, 500);
    }
  }

  return json({ id: newId, email, role }, 201);
});
