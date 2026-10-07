import {useState} from "react";
import {useDispatch} from "react-redux";
import {Link} from "react-router-dom";
import {toast} from "react-toastify";
import {newPassword} from "../actions/user";
const Forgot_newPassword = () => {
    const dispatch = useDispatch();
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const send = async event => {
        event.preventDefault();
        if (password !== confirm) return toast.error('Passwords do not match');
        setBusy(true);
        try { if (await dispatch(newPassword({token: token.trim(), password}))) setDone(true); }
        finally { setBusy(false); }
    };
    if (done) return <p>Password changed. <Link to="/login">Sign in</Link></p>;
    return <form onSubmit={send}>
        <p>If your account exists, enter the code sent to your email. It expires in 15 minutes.</p>
        <label>Reset code <input required autoComplete="off" value={token} onChange={e => setToken(e.target.value)} className="form-control" /></label>
        <label>New password <input required type="password" minLength={6} maxLength={256} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="form-control" /></label>
        <label>Confirm password <input required type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className="form-control" /></label>
        <button disabled={busy} type="submit" className="btn btn-primary">Change password</button>
    </form>;
};
export default Forgot_newPassword;
