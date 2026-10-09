import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGroups } from './context';
export default function GroupManagement() {
    const { user, token } = useSelector(s => s.user);
    const { groups, api, refresh, select, error: loadError, loading } = useGroups();
    const [active, setActive] = useState('');
    const [detail, setDetail] = useState(null);
    const [fields, setFields] = useState({ name: '', description: '' });
    const [link, setLink] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const admin = detail?.group.creatorId === user?._id;
    useEffect(() => {
        let cancelled = false;
        setDetail(null); setLink(''); setError('');
        if (!active || !token) return;
        api(`/${active}`).then(async data => {
            if (cancelled) return;
            setDetail(data); setFields({ name: data.group.name, description: data.group.description || '' });
            if (data.group.creatorId === user?._id) {
                const invite = await api(`/${active}/invite`);
                if (!cancelled) setLink(`${window.location.origin}/join/${invite.inviteCode}`);
            }
        }).catch(e => { if (!cancelled) setError(e.response?.data?.error || 'לא ניתן לטעון קבוצה'); });
        return () => { cancelled = true; };
    }, [active, api, token, user?._id]);
    async function run(action) {
        setBusy(true); setError('');
        try { await action(); await refresh(); }
        catch (e) { setError(e.response?.data?.error || 'הפעולה נכשלה. נסו שוב.'); }
        finally { setBusy(false); }
    }
    async function updateMember(member, action) {
        if (action === 'remove' && !window.confirm(`להסיר את ${member.userId?.name || 'המשתמש'} ולחסום הצטרפות מחדש?`)) return;
        await api(`/${active}/members/${member.userId._id}/${action}`, 'post', {});
        setDetail(await api(`/${active}`));
    }
    if (!token) return <main className="container text-end" dir="rtl"><p>יש להיכנס כדי לנהל קבוצות.</p><Link to="/auth">כניסה / הרשמה</Link></main>;
    return <main className="container text-end pb-5" dir="rtl">
        <h1>הקבוצות שלי</h1><Link to="/">חזרה לגרפים</Link>
        {(error || loadError) && <p role="alert">{error || loadError}</p>}
        {loading && <p>טוענים קבוצות…</p>}
        <div className="my-3 d-flex flex-wrap" style={{ gap: 8 }}>
            <button disabled={busy} className="btn btn-primary" onClick={() => { setActive(''); setFields({ name: '', description: '' }); }}>קבוצה חדשה</button>
            {groups.map(g => <button disabled={busy} className={`btn ${active === g._id ? 'btn-primary' : 'btn-outline-primary'}`} key={g._id} onClick={() => setActive(g._id)}>{g.name}</button>)}
        </div>
        {(!active || (detail && admin)) && <form onSubmit={e => {
            e.preventDefault(); run(async () => {
                if (active) { await api(`/${active}`, 'patch', fields); setDetail(await api(`/${active}`)); }
                else { const created = await api('', 'post', fields); setActive(created.groupId); select(created.groupId); }
            });
        }}>
            <h2>{active ? 'עריכת קבוצה' : 'יצירת קבוצה'}</h2>
            <label className="d-block">שם הקבוצה<input required maxLength={80} className="form-control" value={fields.name} onChange={e => setFields({ ...fields, name: e.target.value })} /></label>
            <label className="d-block mt-2">תיאור (לא חובה)<textarea maxLength={500} className="form-control" value={fields.description} onChange={e => setFields({ ...fields, description: e.target.value })} /></label>
            <button disabled={busy} className="btn btn-primary my-3">{active ? 'שמירה' : 'יצירת קבוצה'}</button>
        </form>}
        {active && detail && <>
            {!admin && <><h2>{detail.group.name}</h2><p>{detail.group.description}</p></>}
            <Link to="/" onClick={() => select(active)} className="btn btn-outline-primary mb-3">הצגת גרפי הקבוצה</Link>
            {admin && <section><h2>הזמנה לקבוצה</h2>
                <input className="form-control" aria-label="קישור הזמנה" readOnly value={link} dir="ltr" />
                <button disabled={busy || !link} className="btn btn-secondary my-2" onClick={() => run(() => navigator.clipboard.writeText(link))}>העתקת קישור</button>{' '}
                <button disabled={busy} className="btn btn-outline-secondary" onClick={() => {
                    if (window.confirm('להחליף את הקישור? הקישור הישן יפסיק לעבוד.')) run(async () => {
                        const invite = await api(`/${active}/invite/reset`, 'post', {}); setLink(`${window.location.origin}/join/${invite.inviteCode}`);
                    });
                }}>החלפת קישור הזמנה</button>
            </section>}
            <h2>חברי הקבוצה</h2>
            <ul className="list-group mb-3">{detail.members.map(m => <li className="list-group-item d-flex justify-content-between" key={m._id}>
                <span>{m.userId?.name || 'משתמש לא זמין'} {m.userId?._id === detail.group.creatorId && '(מנהל)'} {m.status === 'blocked' && '(חסום)'}</span>
                {admin && m.userId && m.userId._id !== user._id && <button disabled={busy} className="btn btn-sm btn-outline-danger" onClick={() => run(() => updateMember(m, m.status === 'blocked' ? 'unblock' : 'remove'))}>{m.status === 'blocked' ? 'ביטול חסימה' : 'הסרה'}</button>}
            </li>)}</ul>
            <button disabled={busy} className="btn btn-danger" onClick={() => {
                if (window.confirm(admin ? 'למחוק את הקבוצה וכל החברויות? ההימורים יישמרו.' : 'לעזוב את הקבוצה? ההימור יפסיק להיכלל בגרפי הקבוצה.')) run(async () => {
                    await api(`/${active}${admin ? '' : '/leave'}`, admin ? 'delete' : 'post', {}); setActive(''); setFields({ name: '', description: '' });
                });
            }}>{admin ? 'מחיקת קבוצה' : 'עזיבת קבוצה'}</button>
        </>}
    </main>;
}
