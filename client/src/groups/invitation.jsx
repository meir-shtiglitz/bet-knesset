import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGroups } from './context';
import Auth from '../components/auth';
import { rememberInvitation, clearInvitation } from './navigation';
export default function Invitation() {
    const { code } = useParams();
    const { token } = useSelector(s => s.user);
    const { api, refresh, select } = useGroups();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let cancelled = false;
        setError(''); setName('');
        if (!/^[a-f0-9]{64}$/.test(code)) { setError('הזמנה לא תקינה'); return; }
        rememberInvitation(code);
        (async () => {
            const preview = await api(`/invite/${code}`);
            if (cancelled) return;
            setName(preview.name);
            if (!token) return;
            const joined = await api(`/invite/${code}/join`, 'post', {});
            if (cancelled) return;
            await refresh();
            if (cancelled) return;
            select(joined.groupId);
            clearInvitation();
            navigate('/', { replace: true });
        })().catch(e => { if (!cancelled) setError(e.response?.data?.error || 'לא ניתן להצטרף כעת. נסו שוב.'); });
        return () => { cancelled = true; };
    }, [api, code, token, refresh, select, navigate, retry]);
    return <main className="container text-end" dir="rtl">
        <h1>{name ? `הזמנה לקבוצה: ${name}` : 'הזמנה לקבוצה'}</h1>
        {error ? <><p role="alert">{error}</p><button className="btn btn-secondary" onClick={() => setRetry(r => r + 1)}>נסו שוב</button></>
            : token ? <p>מצטרפים לקבוצה…</p> : name ? <><p>כניסה או הרשמה תצרף אותך לקבוצה אוטומטית.</p><Auth returnTo={`/join/${code}`} /></> : <p>טוענים הזמנה…</p>}
        <Link to="/" onClick={clearInvitation}>חזרה לאתר</Link>
    </main>;
}
