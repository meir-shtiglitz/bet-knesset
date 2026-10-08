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
beforeEach(() => jest.useFakeTimers());
afterEach(() => { cleanup(); jest.useRealTimers(); });
test('persistent credentials are discarded and never restored; login stays in memory', () => {
    localStorage.setItem('token', 'old-secret'); sessionStorage.setItem('token', 'old-secret');
    const store = createStore((state, action) => ({ user: user(state?.user, action) }));
    mount(store);
    expect(localStorage.getItem('token')).toBeNull(); expect(sessionStorage.getItem('token')).toBeNull();
    expect(store.getState().user.isAuthenticated).toBe(false);
    login(store);
    expect(store.getState().user.token).toBe('synthetic-token');
    expect(localStorage.getItem('token')).toBeNull();
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
