import axios from "axios";
import {useState} from "react";
import {toast} from "react-toastify";
import {ApiUrl} from "../apiUrl";
const Forgot_setMail = ({mailSet}) => {
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const send = async event => {
        event.preventDefault();
        setBusy(true);
        try {
            const result = await axios.post(`${ApiUrl}/user/forgot/validmail`, {email});
            toast.info(result.data.message);
            mailSet();
        } catch (error) { toast.error(error?.response?.data?.error || 'Request failed'); }
        finally { setBusy(false); }
    };
    return <form onSubmit={send}>
        <label>Email <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="form-control" /></label>
        <button disabled={busy} type="submit" className="btn btn-primary">Send reset code</button>
    </form>;
};
export default Forgot_setMail;
