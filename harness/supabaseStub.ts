// Dev harness only: a Supabase client that starts SIGNED OUT and becomes
// signed in when signInWithPassword is called, so the login -> app transition
// can be exercised without a live account.
const SESSION = {
  access_token: 'harness-token',
  user: { id: '00000000-0000-0000-0000-000000000001', email: 'harness@example.com' },
};

let current: any = null;
const listeners: any[] = [];

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
    getSession: async () => ({ data: { session: current } }),
    onAuthStateChange: (cb: any) => {
      listeners.push(cb);
      return { data: { subscription: { unsubscribe() {} } } };
    },
    signOut: async () => {
      current = null;
      listeners.forEach((cb) => cb('SIGNED_OUT', null));
      return { error: null };
    },
    signUp: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => {
      current = SESSION;
      listeners.forEach((cb) => cb('SIGNED_IN', SESSION));
      return { data: { session: SESSION }, error: null };
    },
  },
  from: () => query(),
};
