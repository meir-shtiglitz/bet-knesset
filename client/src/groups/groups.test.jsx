import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { GroupsProvider, useGroups } from './context';
import Invitation from './invitation';
import { pendingInvitation } from './navigation';
import Home from '../components/home';
import PartiesChart from '../components/parties-chart';
import Winner from '../components/winner';
jest.mock('axios', () => jest.fn());
jest.mock('../components/auth', () => () => <p>Sign in or register</p>);
jest.mock('../components/voted', () => () => <p>Prediction editor</p>);
jest.mock('../components/date-counter', () => () => null);
jest.mock('../components/party-graph', () => ({ party }) => <tr><td>{party.name}: {party.avg}</td></tr>);
jest.mock('../components/winner-graph', () => ({ party }) => <tr><td>{party.name}: winner {party.winner}</td></tr>);
jest.mock('../actions/user', () => ({ getAllBets: () => ({ type: 'NOOP' }) }));
const group = { _id: 'group-1', name: 'Friends', creatorId: 'u1' };
const base = { token: 'token-1', user: { _id: 'u1', name: 'Me' }, isAuthenticated: true,
    session: { _id: 's1' }, selectedSessionSlug: 'election', parties: [{ _id: 'p1', name: 'Party' }],
    bets: [{ _id: 'b1', userId: { _id: 'u1', name: 'Me' }, score: 10, betsMap: { p1: 40 } }],
    result: { results: [{ partyId: 'p1', actualSeats: 42 }] } };
function storeFor(overrides = {}) {
    return createStore((state = { user: { ...base, ...overrides } }, action) =>
        action.type === 'SET_USER' ? { user: { ...state.user, ...action.payload } } : state);
}
function mount(element, store = storeFor(), entry = '/') {
    return { store, ...render(<Provider store={store}><MemoryRouter initialEntries={[entry]}><GroupsProvider>{element}</GroupsProvider></MemoryRouter></Provider>) };
}
function GroupState() {
    const { groups, selected, refresh } = useGroups();
    return <><p>Selected: {selected}</p><p>Groups: {groups.map(g => g.name).join(',')}</p><button onClick={refresh}>Refresh groups</button></>;
}
beforeEach(() => { axios.mockReset(); localStorage.clear(); sessionStorage.clear(); axios.mockResolvedValue({ data: { groups: [group] } }); });

test('one selector updates the average and winner charts without changing the prediction editor', async () => {
    axios.mockImplementation(({ url }) => Promise.resolve({ data: url.includes('/charts/') ? {
        participantCount: 2, averages: [{ partyId: 'p1', avg: 55 }], winnersReady: true,
        winners: [{ _id: 'b2', userId: { _id: 'u2', name: 'Group winner' }, score: 11, bets: [{ partyId: 'p1', predictedSeats: 60 }] }]
    } : { groups: [group] } }));
    mount(<Home />);
    expect(screen.getByText('Party: 40')).toBeInTheDocument();
    await screen.findByRole('option', { name: 'Friends' });
    fireEvent.change(screen.getByLabelText('הצגת גרפים עבור:'), { target: { value: group._id } });
    await screen.findByText('Party: 55');
    expect(screen.getByText('Group winner')).toBeInTheDocument();
    expect(screen.getByText('Prediction editor')).toBeInTheDocument();
    expect(localStorage.getItem('group-selection:u1')).toBe(group._id);
    fireEvent.change(screen.getByLabelText('הצגת גרפים עבור:'), { target: { value: 'all' } });
    expect(screen.getByText('Party: 40')).toBeInTheDocument();
    expect(screen.queryByText('Group winner')).not.toBeInTheDocument();
});

test('empty group averages show zero participants and no NaN chart', async () => {
    mount(<PartiesChart chartData={{ participantCount: 0, averages: [{ partyId: 'p1', avg: 0 }] }} />);
    await act(async () => {});
    expect(screen.getByText('עדיין אין הימורים בבחירות אלו')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
});

test('winner names stay hidden until results and scores are ready', async () => {
    const view = mount(<Winner />, storeFor({ bets: [{ ...base.bets[0], score: undefined }] }));
    await act(async () => {});
    expect(screen.getByText('המנצחים מחושבים כעת')).toBeInTheDocument();
    expect(screen.queryByText('Me')).not.toBeInTheDocument();
    act(() => { view.store.dispatch({ type: 'SET_USER', payload: { result: null } }); });
    expect(screen.getByText('המנצחים הגדולים יוכרזו לאחר תוצאות האמת')).toBeInTheDocument();
});

test('ranking keeps current tie behavior and does not sort Redux predictions in place', async () => {
    const bets = Object.freeze([
        { ...base.bets[0], _id: 'lower', score: 2 },
        { ...base.bets[0], _id: 'higher', userId: { _id: 'u2', name: 'Winner' }, score: 3 }
    ]);
    mount(<Winner />, storeFor({ bets }));
    await act(async () => {});
    expect(screen.getByText('Winner')).toBeInTheDocument();
    expect(bets[0]._id).toBe('lower');
});

test('invitation previews only the name, then automatically joins after authentication and selects the group', async () => {
    const code = 'a'.repeat(64);
    axios.mockImplementation(({ url }) => Promise.resolve({ data:
        url.endsWith('/join') ? { groupId: group._id, name: group.name } :
        url.includes('/invite/') ? { name: group.name } : { groups: [group] }
    }));
    const view = mount(<Routes>
        <Route path="/join/:code" element={<Invitation />} />
        <Route path="/" element={<GroupState />} />
    </Routes>, storeFor({ token: null, user: null, isAuthenticated: false }), `/join/${code}`);
    await screen.findByText('Sign in or register');
    expect(pendingInvitation()).toBe(code);
    expect(axios.mock.calls.some(([config]) => config.method === 'post')).toBe(false);
    act(() => { view.store.dispatch({ type: 'SET_USER', payload: { token: 'new-token', user: base.user, isAuthenticated: true } }); });
    await screen.findByText(`Selected: ${group._id}`);
    expect(pendingInvitation()).toBeNull();
    const join = axios.mock.calls.find(([config]) => config.url.endsWith('/join'))[0];
    expect(join.headers.Authorization).toBe('Bearer new-token');
});

test('a late group response from the previous account cannot restore its memberships after logout', async () => {
    let resolve;
    axios.mockImplementation(() => new Promise(r => { resolve = r; }));
    const view = mount(<GroupState />);
    await waitFor(() => expect(axios).toHaveBeenCalled());
    act(() => { view.store.dispatch({ type: 'SET_USER', payload: { token: null, user: null } }); });
    await act(async () => resolve({ data: { groups: [group] } }));
    expect(screen.getByText('Groups:')).toBeInTheDocument();
    expect(screen.getByText('Selected: all')).toBeInTheDocument();
});

test('newer membership refresh wins over an older delayed response', async () => {
    const resolves = [];
    axios.mockImplementation(() => new Promise(r => resolves.push(r)));
    mount(<GroupState />);
    await waitFor(() => expect(resolves).toHaveLength(1));
    fireEvent.click(screen.getByText('Refresh groups'));
    await act(async () => resolves[1]({ data: { groups: [group] } }));
    expect(screen.getByText('Groups: Friends')).toBeInTheDocument();
    await act(async () => resolves[0]({ data: { groups: [] } }));
    expect(screen.getByText('Groups: Friends')).toBeInTheDocument();
});
