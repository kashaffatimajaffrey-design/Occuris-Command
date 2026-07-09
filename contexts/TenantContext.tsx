import { useMemo } from 'react';
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
 * IMPORTANT: selectedTenant is wrapped in useMemo so it keeps the SAME
 * object reference across re-renders as long as tenantId/tenantName
 * haven't actually changed. Without this, components that do
 * useEffect(() => {...}, [selectedTenant]) (like InventoryTable) would
 * see a "new" tenant object on every render and re-fetch forever —
 * which is exactly what caused the ERR_INSUFFICIENT_RESOURCES crash.
 */
export function useTenant() {
  const { tenantId, tenantName } = useAuth();

  const selectedTenant: Tenant = useMemo(
    () => ({
      id: tenantId || '',
      name: tenantName || 'Loading...',
      region: '',
    }),
    [tenantId, tenantName]
  );

  return {
    selectedTenant,
    setSelectedTenant: () => {},
  };
}