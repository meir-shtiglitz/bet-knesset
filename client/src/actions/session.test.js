import axios from 'axios';
import { toast } from 'react-toastify';
import { signout } from './user';
jest.mock('axios');
jest.mock('react-toastify', () => ({ toast: { error: jest.fn() } }));
test('logout clears local auth before revocation and uses the original bearer', async () => {
    const dispatch = jest.fn();
    axios.post.mockImplementation(async (url, body, config) => {
        expect(dispatch).toHaveBeenCalledWith({ type: 'LOGOUT' });
        expect(config.headers.Authorization).toBe('Bearer synthetic-token');
    });
    await signout()(dispatch, () => ({ user: { token: 'synthetic-token' } }));
    expect(axios.post).toHaveBeenCalledTimes(1);
});
test('failed server revocation still leaves local auth cleared and reports failure', async () => {
    const dispatch = jest.fn(); axios.post.mockRejectedValueOnce(new Error('synthetic outage'));
    await signout()(dispatch, () => ({ user: { token: 'synthetic-token' } }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'LOGOUT' }); expect(toast.error).toHaveBeenCalled();
});
