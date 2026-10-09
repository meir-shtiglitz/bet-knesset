const KEY = 'pending-group-invitation';
export function pendingInvitation() { try { return sessionStorage.getItem(KEY); } catch { return null; } }
export function rememberInvitation(code) { try { sessionStorage.setItem(KEY, code); } catch {} }
export function clearInvitation() { try { sessionStorage.removeItem(KEY); } catch {} }
