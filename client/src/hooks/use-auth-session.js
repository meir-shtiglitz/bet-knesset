import { useEffect, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import axios from 'axios';
import { ApiUrl } from '../apiUrl';
import { readSavedSession, saveSession, clearSavedSession } from '../utils/auth-storage';

// Remove credentials saved by older builds under the obsolete key.
export function clearLegacyCredentials() {
    for (const name of ['localStorage', 'sessionStorage']) {
        try { window[name].removeItem('token'); } catch (_) {}
    }
}
export default function useAuthSession() {
    const dispatch = useDispatch();
    const store = useStore();
    const restoring = useRef(true);
    const { token, expiresAt, authRevision } = useSelector(state => state.user);
    useEffect(() => {
        clearLegacyCredentials();
        const saved = readSavedSession();
        if (!saved || store.getState().user.token) { restoring.current = false; return; }
        const revision = store.getState().user.authRevision || 0;
        let active = true;
        axios.post(`${ApiUrl}/user/signbytoken`, { token: saved.token }, { timeout: 10000 })
            .then(({ data }) => {
                if (!active) return;
                if (data.token !== saved.token || !Number.isFinite(data.expiresAt) ||
                    data.expiresAt <= Date.now() || !data.user) {
                    clearSavedSession(saved.token);
                    return;
                }
                dispatch({ type: 'RESTORE_SUCCESS', payload: data, revision });
            })
            .catch(error => {
                if (active && [400, 401, 403].includes(error?.response?.status))
                    clearSavedSession(saved.token);
                // Keep the saved session on a network outage so refresh can retry.
            })
            .finally(() => { if (active) restoring.current = false; });
        return () => { active = false; };
    }, [dispatch, store]);
    useEffect(() => {
        if (token) saveSession(token, expiresAt);
        else if (!restoring.current || authRevision > 0) clearSavedSession();
    }, [token, expiresAt, authRevision]);
    useEffect(() => {
        if (!token) return;
        const expire = () => dispatch({ type: 'SESSION_EXPIRED', token });
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) { expire(); return; }
        const timer = setTimeout(expire, expiresAt - Date.now());
        const check = () => { if (Date.now() >= expiresAt) expire(); };
        window.addEventListener('focus', check);
        document.addEventListener('visibilitychange', check);
        const interceptor = axios.interceptors.response.use(response => response, error => {
            const headers = error?.config?.headers;
            const authorization = headers?.Authorization || headers?.authorization;
            if (error?.response?.status === 401 && authorization === `Bearer ${token}`) expire();
            return Promise.reject(error);
        });
        return () => {
            clearTimeout(timer);
            window.removeEventListener('focus', check);
            document.removeEventListener('visibilitychange', check);
            axios.interceptors.response.eject(interceptor);
        };
    }, [token, expiresAt, dispatch]);
}
