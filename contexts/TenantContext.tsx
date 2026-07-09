import { useAuth } from './AuthContext';
import { Tenant } from '../types';

/**
 * COMPATIBILITY LAYER
 *
 * This used to be a standalone context with its own Provider and a
 * hardcoded tenant list. It's been replaced by real auth (AuthContext),
 * where the tenant is derived from the logged-in user's session —
 * not picked from a dropdown.
 *
 * Rather than editing every component that called useTenant()
 * (BomIntake, CommandDeck, InventoryTable), this file keeps the same
 * useTenant() interface they already expect, but sources the data
 * from AuthContext underneath. No <TenantProvider> wrapper needed
 * anymore — this hook works directly off <AuthProvider>.
 */
export function useTenant() {
  const { tenantId, tenantName } = useAuth();

  const selectedTenant: Tenant = {
    id: tenantId || '',
    name: tenantName || 'Loading...',
    region: '',
  };

  return {
    selectedTenant,
    // No-op: which tenant you're in is now determined by who you're
    // logged in as, not something the UI lets you switch client-side.
    setSelectedTenant: () => {},
  };
}