import React from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import axios from 'axios';
import { user } from '../reducers/user';
import useAuthSession from './use-auth-session';
const Harness = () => { useAuthSession(); return null; };
const mount = store => render(<Provider store={store}><Harness /></Provider>);
const login = (store, token = 'synthetic-token', expiresAt = Date.now() + 10000) =>
    act(() => { store.dispatch({ type: 'LOGIN_SUCCESS', payload: { token, expiresAt, user: { name: 'Synthetic' } } }); });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); jest.useFakeTimers('modern'); });
afterEach(() => { cleanup(); jest.useRealTimers(); });
test('obsolete credentials are discarded; new login is saved until expiry', () => {
    localStorage.setItem('token', 'old-secret'); sessionStorage.setItem('token', 'old-secret');
    const store = createStore((state, action) => ({ user: user(state?.user, action) }));
    mount(store);
    expect(localStorage.getItem('token')).toBeNull(); expect(sessionStorage.getItem('token')).toBeNull();
    expect(store.getState().user.isAuthenticated).toBe(false);
    login(store);
    expect(store.getState().user.token).toBe('synthetic-token');
    expect(localStorage.getItem('token')).toBeNull();
    expect(JSON.parse(localStorage.getItem('bet-knesset-session')).token).toBe('synthetic-token');
    act(() => jest.advanceTimersByTime(10000));
    expect(store.getState().user.token).toBeNull(); expect(store.getState().user.user).toBeNull();
});
test('replacing a token cancels the old expiry timer', () => {
    const store = createStore((state, action) => ({ user: user(state?.user, action) })); mount(store);
    login(store, 'first', Date.now() + 1000); login(store, 'second', Date.now() + 10000);
    act(() => jest.advanceTimersByTime(1000)); expect(store.getState().user.token).toBe('second');
});
test('only a 401 on the current bearer token expires the session', async () => {
    let rejectResponse;
    const use = jest.spyOn(axios.interceptors.response, 'use').mockImplementation((_, reject) => { rejectResponse = reject; return 1; });
    const eject = jest.spyOn(axios.interceptors.response, 'eject').mockImplementation(() => {});
    const store = createStore((state, action) => ({ user: user(state?.user, action) })); mount(store); login(store);
    await act(async () => { await rejectResponse({ response: { status: 401 }, config: { headers: {} } }).catch(() => {}); });
    expect(store.getState().user.isAuthenticated).toBe(true);
    await act(async () => { await rejectResponse({ response: { status: 401 }, config: { headers: { Authorization: 'Bearer synthetic-token' } } }).catch(() => {}); });
    expect(store.getState().user.isAuthenticated).toBe(false);
    use.mockRestore(); eject.mockRestore();
});

test('a late 401 for a replaced token cannot clear the new session', async () => {
    const rejects = [];
    const use = jest.spyOn(axios.interceptors.response, 'use').mockImplementation((_, reject) => { rejects.push(reject); return rejects.length; });
    const eject = jest.spyOn(axios.interceptors.response, 'eject').mockImplementation(() => {});
    const store = createStore((state, action) => ({ user: user(state?.user, action) })); mount(store);
    login(store, 'old-token'); login(store, 'new-token');
    await act(async () => { await rejects[0]({ response: { status: 401 }, config: { headers: { Authorization: 'Bearer old-token' } } }).catch(() => {}); });
    expect(store.getState().user.token).toBe('new-token');
    use.mockRestore(); eject.mockRestore();
});

test('refresh restores saved login only after the server verifies it', async () => {
    const first = createStore((state, action) => ({ user: user(state?.user, action) }));
    const view = mount(first); login(first);
    const saved = JSON.parse(localStorage.getItem('bet-knesset-session'));
    view.unmount();
    let resolveRestore;
    const post = jest.spyOn(axios, 'post').mockImplementation(() => new Promise(resolve => { resolveRestore = resolve; }));
    const fresh = createStore((state, action) => ({ user: user(state?.user, action) }));
    mount(fresh);
    expect(fresh.getState().user.isAuthenticated).toBe(false);
    expect(post).toHaveBeenCalledWith(expect.stringContaining('/user/signbytoken'), { token: saved.token }, { timeout: 10000 });
    await act(async () => resolveRestore({ data: { ...saved, user: { _id: 'verified-user', name: 'Verified' } } }));
    expect(fresh.getState().user.isAuthenticated).toBe(true);
    expect(fresh.getState().user.user.name).toBe('Verified');
    expect(fresh.getState().user.expiresAt).toBe(saved.expiresAt);
    post.mockRestore();
});
test('logout and expiry remove the saved session', () => {
    const store = createStore((state, action) => ({ user: user(state?.user, action) }));
    mount(store); login(store);
    act(() => { store.dispatch({ type: 'LOGOUT' }); });
    expect(localStorage.getItem('bet-knesset-session')).toBeNull();
    login(store); act(() => jest.advanceTimersByTime(10000));
    expect(localStorage.getItem('bet-knesset-session')).toBeNull();
});
test('expired stored credentials are never sent to the server', () => {
    localStorage.setItem('bet-knesset-session', JSON.stringify({ token: 'expired', expiresAt: Date.now() - 1 }));
    const post = jest.spyOn(axios, 'post');
    const store = createStore((state, action) => ({ user: user(state?.user, action) }));
    mount(store);
    expect(post).not.toHaveBeenCalled();
    expect(localStorage.getItem('bet-knesset-session')).toBeNull();
    post.mockRestore();
});
test('server rejection clears stored login while temporary outages retain it', async () => {
    const saved = JSON.stringify({ token: 'saved', expiresAt: Date.now() + 10000 });
    const post = jest.spyOn(axios, 'post').mockRejectedValueOnce({ response: { status: 401 } }).mockRejectedValueOnce(new Error('offline'));
    localStorage.setItem('bet-knesset-session', saved);
    const first = createStore((state, action) => ({ user: user(state?.user, action) }));
    const view = mount(first);
    await act(async () => {});
    expect(localStorage.getItem('bet-knesset-session')).toBeNull();
    view.unmount();
    localStorage.setItem('bet-knesset-session', saved);
    const second = createStore((state, action) => ({ user: user(state?.user, action) }));
    mount(second); await act(async () => {});
    expect(second.getState().user.isAuthenticated).toBe(false);
    expect(localStorage.getItem('bet-knesset-session')).toBe(saved);
    post.mockRestore();
});
test.each(['LOGOUT', 'LOGIN_SUCCESS'])('late restoration cannot override %s', async type => {
    const saved = { token: 'old-session', expiresAt: Date.now() + 10000 };
    localStorage.setItem('bet-knesset-session', JSON.stringify(saved));
    let resolveRestore;
    const post = jest.spyOn(axios, 'post').mockImplementation(() => new Promise(resolve => { resolveRestore = resolve; }));
    const store = createStore((state, action) => ({ user: user(state?.user, action) }));
    mount(store);
    if (type === 'LOGOUT') act(() => { store.dispatch({ type }); });
    else login(store, 'new-session');
    await act(async () => resolveRestore({ data: { ...saved, user: { name: 'Old' } } }));
    expect(store.getState().user.token).toBe(type === 'LOGOUT' ? null : 'new-session');
    const stored = localStorage.getItem('bet-knesset-session');
    expect(stored ? JSON.parse(stored).token : null).toBe(type === 'LOGOUT' ? null : 'new-session');
    post.mockRestore();
});

test('a 60-day session survives timer limits and expires at the exact deadline', () => {
    const day = 24 * 60 * 60 * 1000;
    const store = createStore((state, action) => ({ user: user(state?.user, action) }));
    mount(store); login(store, 'long-session', Date.now() + 60 * day);
    act(() => jest.advanceTimersByTime(60 * day - 1));
    expect(store.getState().user.token).toBe('long-session');
    expect(JSON.parse(localStorage.getItem('bet-knesset-session')).token).toBe('long-session');
    act(() => jest.advanceTimersByTime(1));
    expect(store.getState().user.isAuthenticated).toBe(false);
    expect(localStorage.getItem('bet-knesset-session')).toBeNull();
});
