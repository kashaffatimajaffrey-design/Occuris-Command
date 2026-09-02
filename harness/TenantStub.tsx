// Dev harness only. Supplies the tenant that AuthContext would normally
// provide after login, so protected components can be rendered without a
// Supabase session. Nothing else is stubbed: the component under test, its
// api.ts calls, and the backend responses are all real.
//
// The tenant object is module-level and therefore reference-stable across
// renders. The real useTenant() uses useMemo for the same reason — a fresh
// object each render makes InventoryTable's useEffect([selectedTenant])
// re-fetch forever.
const SELECTED_TENANT = { id: 'global-semi-01', name: 'Harness Tenant', region: '' };

export function useTenant() {
  return { selectedTenant: SELECTED_TENANT, setSelectedTenant: () => {} };
}
