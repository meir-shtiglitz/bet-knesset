import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';

// Discard persistent credentials from older development builds without reading them.
export function clearLegacyCredentials() {
    for (const name of ['localStorage', 'sessionStorage']) {
        try { window[name].removeItem('token'); } catch (_) { /* Storage may be disabled. */ }
    }
}
export default function useAuthSession() {
    const dispatch = useDispatch();
    const { token, expiresAt } = useSelector(state => state.user);
    useEffect(() => { clearLegacyCredentials(); }, []);
    useEffect(() => {
        if (!token) return;
        const expire = () => dispatch({ type: 'SESSION_EXPIRED', token });
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) { expire(); return; }
        const timer = setTimeout(expire, expiresAt - Date.now());
        // A suspended/background tab may miss its timer until it regains focus.
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
