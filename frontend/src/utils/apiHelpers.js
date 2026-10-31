/**
 * Helper to determine if an API failure is due to the backend being offline
 * (Network Error, ERR_CONNECTION_REFUSED) or an endpoint not yet implemented (404/501).
 * Allows the frontend to seamlessly operate in offline preview mode without failing.
 */
export const isOfflineOrUnimplemented = (error) => {
  if (!error) return true;
  if (!error.status) return true;
  if (error.status === 404 || error.status === 501) return true;
  if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') return true;
  return false;
};
