const KEY = 'bet-knesset-session';
export function clearSavedSession(token) {
    try {
        const current = JSON.parse(localStorage.getItem(KEY));
        if (!token || current?.token === token) localStorage.removeItem(KEY);
    } catch (_) { try { localStorage.removeItem(KEY); } catch (_) {} }
}
export function readSavedSession() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        if (typeof saved?.token === 'string' && saved.token.length <= 4096 &&
            saved.token.length > 0 && Number.isFinite(saved.expiresAt) && saved.expiresAt > Date.now()) return saved;
    } catch (_) {}
    clearSavedSession();
    return null;
}
export function saveSession(token, expiresAt) {
    try {
        if (token && Number.isFinite(expiresAt) && expiresAt > Date.now())
            localStorage.setItem(KEY, JSON.stringify({ token, expiresAt }));
        else clearSavedSession();
    } catch (_) { /* Login still works when browser storage is unavailable. */ }
}
