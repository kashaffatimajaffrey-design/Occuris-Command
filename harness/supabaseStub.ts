// Dev harness only: a fake signed-in Supabase client, so the real App shell
// can be mounted without a live login while diagnosing a post-login crash.
const SESSION = {
  access_token: 'harness-token',
  user: { id: '00000000-0000-0000-0000-000000000001', email: 'harness@example.com' },
};

function query() {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: { tenant_id: 't-1', tenants: { name: 'Harness Co' } }, error: null }),
    then: (r: any) => r({ data: [], error: null }),
  };
  return chain;
}

export const supabase: any = {
  auth: {
    getSession: async () => ({ data: { session: SESSION } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
    signUp: async () => ({ data: { session: SESSION }, error: null }),
    signInWithPassword: async () => ({ data: { session: SESSION }, error: null }),
  },
  from: () => query(),
};
