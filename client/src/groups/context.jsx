import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { ApiUrl } from '../apiUrl';
const Context = createContext();
export const useGroups = () => useContext(Context);
export const readSetting = (key, fallback = '') => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
export const saveSetting = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
export function GroupsProvider({ children }) {
    const { token, user } = useSelector(s => s.user);
    const [groups, setGroups] = useState([]);
    const [selected, setSelected] = useState('all');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const identity = useRef(token); identity.current = token;
    const latestRefresh = useRef(0);
    const api = useCallback(async (path = '', method = 'get', data) => {
        const response = await axios({ url: `${ApiUrl}/groups${path}`, method, data,
            headers: token ? { Authorization: `Bearer ${token}` } : {}, timeout: 15000 });
        return response.data;
    }, [token]);
    const select = useCallback(value => {
        setSelected(value);
        if (user?._id) saveSetting(`group-selection:${user._id}`, value);
    }, [user?._id]);
    const refresh = useCallback(async () => {
        if (!token) return;
        const requestId = ++latestRefresh.current;
        const response = await api();
        if (identity.current !== token || requestId !== latestRefresh.current) return;
        setError('');
        setGroups(response.groups);
        setSelected(current => current === 'all' || response.groups.some(g => g._id === current) ? current : 'all');
        return response.groups;
    }, [api, token]);
    useEffect(() => {
        latestRefresh.current++;
        setGroups([]); setError('');
        setSelected(user?._id ? readSetting(`group-selection:${user._id}`, 'all') : 'all');
        if (!token) { setLoading(false); return; }
        setLoading(true);
        refresh().catch(() => { if (identity.current === token) setError('לא ניתן לטעון קבוצות. נסו שוב.'); })
            .finally(() => { if (identity.current === token) setLoading(false); });
    }, [refresh, token, user?._id]);
    return <Context.Provider value={{ groups, selected, select, api, refresh, error, loading }}>{children}</Context.Provider>;
}
