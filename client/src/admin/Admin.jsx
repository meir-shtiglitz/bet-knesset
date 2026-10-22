import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ApiUrl } from '../apiUrl';

const titles = {sessions:'מערכות בחירות',parties:'מפלגות',users:'משתמשים',bets:'הימורים',groups:'קבוצות',memberships:'חברי קבוצה',results:'תוצאות אמת ודירוג',polls:'סקרים וסוקרים'};
const fields = {
    polls:[['pollsterName','שם עורך הסקר'],['pollDate','תאריך עריכת הסקר','date'],['color','צבע בגרף','color']],
    sessions:[['name','שם'],['slug','כתובת הבחירות'],['description','תיאור','textarea'],['startDate','פתיחת הימורים','datetime-local'],['endDate','סגירת הימורים','datetime-local'],['isClosed','סגור להימורים','checkbox']],
    parties:[['name','שם'],['chars','אותיות'],['subtext','תיאור','textarea'],['minPredictedSeats','מינימום מנדטים','number'],['maxPredictedSeats','מקסימום מנדטים','number']],
    users:[['name','שם'],['email','אימייל','email'],['role','סוג משתמש','role'],['disabled','משתמש חסום','checkbox']],
    groups:[['name','שם'],['description','תיאור','textarea'],['creatorId','יוצר הקבוצה']],
    memberships:[['userId','משתמש'],['status','מצב חברות','status']]
};
const initial = type => ({polls:{pollsterName:'',pollDate:localDate(new Date()).slice(0,10),color:'#1655a7'},sessions:{name:'',slug:'',description:'',startDate:'',endDate:'',isClosed:false},parties:{name:'',chars:'',subtext:'',minPredictedSeats:0,maxPredictedSeats:120},
    groups:{name:'',description:'',creatorId:''},memberships:{userId:'',status:'active'}}[type] || {});
const localDate = value => {
    if(!value) return '';
    const date=new Date(value);return new Date(+date-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
};
const identifier = value => value?._id || value || '';

function UserPicker({api,value,onChange,disabled,name}) {
    const [search,setSearch]=useState(''),[users,setUsers]=useState([]),[error,setError]=useState('');
    useEffect(()=>{
        let active=true;
        const timer=setTimeout(()=>api(`/users?q=${encodeURIComponent(search)}`).then(data=>{if(active){setUsers(data.items);setError('');}}).catch(()=>{if(active)setError('לא ניתן לטעון משתמשים');}),200);
        return()=>{active=false;clearTimeout(timer);};
    },[api,search]);
    return <span className="d-block">
        {!disabled&&<input className="form-control mb-1" aria-label="חיפוש משתמש לבחירה" placeholder="חיפוש לפי שם או אימייל" value={search} onChange={e=>setSearch(e.target.value)}/>}
        <select required aria-label="בחירת משתמש" className="form-select" disabled={disabled} value={value||''} onChange={e=>onChange(e.target.value)}>
            <option value="">בחר משתמש</option>
            {value&&!users.some(u=>u._id===value)&&<option value={value}>{name||'המשתמש שנבחר'}</option>}
            {users.map(u=><option key={u._id} value={u._id}>{u.name} — {u.email}</option>)}
        </select>{error&&<small role="alert">{error}</small>}
    </span>;
}

export default function Admin() {
    const {section='sessions'}=useParams();
    const {user,token,isAuthenticated}=useSelector(state=>state.user);
    if(!isAuthenticated || !token) return <Navigate to="/auth?mode=login" replace />;
    if(user?.role!==5) return <main className="container" dir="rtl"><p role="alert">אזור זה מיועד לסופר־אדמין בלבד.</p><Link to="/">חזרה לאתר</Link></main>;
    return <AdminWorkspace key={`${token}:${section}`} token={token} />;
}

function AdminWorkspace({token}) {
    const {section='sessions'}=useParams();
    const [searchParams,setSearchParams]=useSearchParams();
    const sessionId=searchParams.get('sessionId')||'';
    const userId=searchParams.get('userId')||'';
    const groupId=searchParams.get('groupId')||'';
    const [sessions,setSessions]=useState([]),[items,setItems]=useState([]),[page,setPage]=useState(1),[total,setTotal]=useState(0);
    const [search,setSearch]=useState(''),[archived,setArchived]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState({});
    const [parties,setParties]=useState([]),[resultForm,setResultForm]=useState({}),[publishedAt,setPublishedAt]=useState('');
    const [preview,setPreview]=useState(null);
    const [pollResults,setPollResults]=useState(null);
    const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[refresh,setRefresh]=useState(0);
    const api=useCallback(async(path,method='get',data)=>{
        const response=await axios({url:`${ApiUrl}/admin${path}`,method,data,headers:{Authorization:`Bearer ${token}`}});return response.data;
    },[token]);
    const all=useCallback(async(type,filters={})=>{
        let rows=[],current=1,response;
        do {response=await api(`/${type}?${new URLSearchParams({...filters,page:current})}`);rows=rows.concat(response.items);current++;} while(rows.length<response.total);
        return rows;
    },[api]);
    useEffect(()=>{let active=true;all('sessions').then(rows=>{if(active)setSessions(rows);}).catch(()=>{if(active)setError('לא ניתן לטעון מערכות בחירות');});return()=>{active=false;};},[all,refresh]);
    useEffect(()=>{setEditing(null);setPollResults(null);setPage(1);setSearch('');setArchived(false);setNotice('');setPreview(null);},[section,sessionId,userId,groupId]);
    useEffect(()=>{
        let active=true;setError('');setLoading(true);setItems([]);setParties([]);
        if(!titles[section]) {setError('מסך לא נמצא');setLoading(false);return;}
        const load=async()=>{
            if(section==='results') {
                if(!sessionId) return;
                const response=await api(`/sessions/${sessionId}/results`);
                if(active){setParties(response.parties);setResultForm(Object.fromEntries(response.parties.map(p=>[p._id,response.result?.results.find(r=>r.partyId===p._id)?.actualSeats ?? 0])));setPublishedAt(localDate(response.result?.publishedAt||new Date()));}
            } else {
                const query={page,q:search,archived:String(archived)};
                if(sessionId)query.sessionId=sessionId;
                if(userId&&section==='bets')query.userId=userId;
                if(groupId&&section==='memberships')query.groupId=groupId;
                const response=await api(`/${section}?${new URLSearchParams(query)}`);
                if(active){setItems(response.items);setTotal(response.total);}
            }
        };
        load().catch(e=>{if(active)setError(e.response?.data?.error||'לא ניתן לטעון נתונים');}).finally(()=>{if(active)setLoading(false);});
        return()=>{active=false;};
    },[api,section,page,search,archived,sessionId,userId,groupId,refresh]);
    async function run(action,message='הפעולה הושלמה',reload=true) {
        setBusy(true);setError('');setNotice('');
        try{await action();setNotice(message);if(reload)setRefresh(n=>n+1);}
        catch(e){setError(e.response?.data?.error||e.message||'הפעולה נכשלה');}
        finally{setBusy(false);}
    }
    async function edit(item) {
        setBusy(true);setError('');setNotice('');
        try {
            let value=initial(section);
            if(item){
                value=Object.fromEntries((fields[section]||[]).map(([key,,kind])=>[key,kind==='datetime-local'?localDate(item[key]):kind==='date'?new Date(item[key]).toISOString().slice(0,10):['creatorId','userId'].includes(key)?identifier(item[key]):item[key]??(kind==='checkbox'?false:'')]));
            }
            if(section==='bets') {
                const rows=await all('parties',{sessionId:identifier(item.sessionId)});setParties(rows);
                value={bets:Object.fromEntries(rows.map(p=>[p._id,item.bets.find(b=>identifier(b.partyId)===p._id)?.predictedSeats ?? 0]))};
            }
            setForm(value);setEditing(item||{_id:null});
        } catch(e) {setError(e.response?.data?.error||'לא ניתן לפתוח עריכה');}
        finally {setBusy(false);}
    }
    async function save(e) {
        e.preventDefault();
        await run(async()=>{
            const data={...form};
            if(section==='sessions'){data.startDate=new Date(data.startDate).toISOString();data.endDate=new Date(data.endDate).toISOString();}
            if(['parties','polls'].includes(section))data.sessionId=identifier(editing.sessionId)||sessionId;
            if(section==='memberships')data.groupId=groupId;
            await api(`/${section}${editing._id?`/${editing._id}`:''}`,editing._id?'patch':'post',data);setEditing(null);
        });
    }
    async function archive(item) {
        const question=item.archived?'לשחזר את הרשומה?':'לארכב את הרשומה? היא תוסתר מהאתר וניתן יהיה לשחזר אותה. נתונים קשורים יישמרו; ארכוב בחירות מסתיר גם את ההימורים והתוצאות שלהן מהאתר.';
        if(window.confirm(question))await run(()=>api(`/${section}/${item._id}/archive`,'post',{archived:!item.archived}));
    }
    const adminLink=(type,extra={})=>`/admin/${type}?${new URLSearchParams({...(sessionId?{sessionId}:{}),...extra})}`;
    const setSession=value=>{setPage(1);setEditing(null);setSearchParams({...Object.fromEntries(searchParams),sessionId:value});};
    const rowName=item=>item.name||item.pollsterName||item.userId?.name||item.userId?.email||item._id;
    return <main className="container text-end pb-5" dir="rtl">
        <h1>ניהול האתר</h1><Link to="/">חזרה לאתר</Link>
        <nav aria-label="ניהול האתר" className="d-flex flex-wrap gap-2 my-3">
            {['sessions','parties','users','bets','groups','results','polls'].map(type=><Link key={type} className={`btn ${section===type?'btn-primary':'btn-outline-primary'}`} to={adminLink(type)}>{titles[type]}</Link>)}
        </nav>
        <h2>{titles[section]||'מסך לא נמצא'}</h2>
        {error&&<p role="alert" className="text-danger">{error}</p>}{notice&&<p role="status" className="text-success">{notice}</p>}
        <label className="d-block my-3">מערכת בחירות
            <select className="form-select" value={sessionId} onChange={e=>setSession(e.target.value)}><option value="">כל מערכות הבחירות</option>{sessions.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}</select>
        </label>
        {section==='bets'&&<label className="d-block my-3">משתמש לצפייה בהימורים<UserPicker api={api} value={userId} onChange={value=>{const query=Object.fromEntries(searchParams);if(value)query.userId=value;else delete query.userId;setSearchParams(query);}}/></label>}
        {sessionId&&['users','groups','memberships'].includes(section)&&<p>מוצגים משתמשים שהגישו הימור בבחירות שנבחרו וקבוצות עם חברים משתתפים.</p>}
        {userId&&<p>הימורים של משתמש: <span dir="ltr">{userId}</span> <Link to={adminLink('bets')}>כל ההימורים</Link></p>}
        {section==='memberships'&&<p>קבוצה: <span dir="ltr">{groupId}</span> <Link to={adminLink('groups')}>חזרה לקבוצות</Link></p>}
        {loading&&<p>טוענים נתונים…</p>}
        {section==='results'&&sessionId&&!loading&&<section>
            <form onSubmit={e=>{e.preventDefault();run(()=>api(`/sessions/${sessionId}/results`,'put',{publishedAt:new Date(publishedAt).toISOString(),results:parties.map(p=>({partyId:p._id,actualSeats:Number(resultForm[p._id])}))}),'תוצאות נשמרו. יש לחשב מיקומים מחדש.');}}>
                <label className="d-block">מועד פרסום התוצאות<input required className="form-control" type="datetime-local" value={publishedAt} onChange={e=>{setPublishedAt(e.target.value);setPreview(null);}} /></label>
                {parties.map(p=><label key={p._id} className="d-block my-2">{p.name}<input required className="form-control" type="number" min="0" max="120" step="1" value={resultForm[p._id]??0} onChange={e=>setResultForm({...resultForm,[p._id]:e.target.value===''?'':e.target.valueAsNumber})}/></label>)}
                <p>סך הכול: {Object.values(resultForm).reduce((sum,n)=>sum+Number(n),0)} מתוך 120 מנדטים</p>
                <button disabled={busy||!parties.length||Object.values(resultForm).reduce((sum,n)=>sum+Number(n),0)!==120} className="btn btn-primary">שמירת תוצאות אמת</button>
            </form>
            <div className="d-flex flex-wrap gap-2 my-3">
                <button disabled={busy} className="btn btn-outline-primary" onClick={()=>run(async()=>setPreview((await api(`/sessions/${sessionId}/preview`,'post',{})).ranking),'תצוגה מקדימה בלבד — הניקוד לא נשמר',false)}>תצוגה מקדימה של הדירוג</button>
                <button disabled={busy} className="btn btn-success" onClick={()=>{if(window.confirm('לחשב ולשמור ניקוד חדש לכל ההימורים בבחירות אלו?'))run(()=>api(`/sessions/${sessionId}/calculate`,'post',{}),'המיקומים חושבו ונשמרו');}}>חישוב מיקומים</button>
                <button disabled={busy} className="btn btn-outline-danger" onClick={()=>{if(window.confirm('לארכב את התוצאות ולנקות את הדירוג?'))run(()=>api(`/sessions/${sessionId}/results`,'delete'));}}>ארכוב תוצאות</button>
                <button disabled={busy} className="btn btn-outline-secondary" onClick={()=>run(()=>api(`/sessions/${sessionId}/results/restore`,'post',{}))}>שחזור תוצאות מארכיון</button>
            </div><Link to={`/admin/bets?sessionId=${sessionId}`}>צפייה בהימורים ובניקוד</Link>
            {preview&&<div className="table-responsive mt-3"><h3>תצוגה מקדימה לפי התוצאות השמורות</h3><table className="table"><thead><tr><th>מקום</th><th>משתתף</th><th>ניקוד</th></tr></thead><tbody>{preview.map((row,i)=><tr key={row.betId}><td>{i+1}</td><td>{row.name}</td><td>{row.score}</td></tr>)}</tbody></table></div>}
        </section>}
        {section!=='results'&&<>
            <div className="d-flex flex-wrap gap-2 align-items-end my-3">
                {['sessions','parties','users','groups','polls'].includes(section)&&<label>חיפוש<input className="form-control" value={search} onChange={e=>{setPage(1);setSearch(e.target.value);}}/></label>}
                <label><input type="checkbox" checked={archived} onChange={e=>{setArchived(e.target.checked);setPage(1);setEditing(null);}}/> הצגת ארכיון</label>
                {section==='bets'&&<button disabled={busy} className="btn btn-outline-secondary" onClick={()=>run(async()=>{
                    const query=new URLSearchParams({archived:String(archived),...(sessionId?{sessionId}:{}),...(userId?{userId}:{})});
                    const csv=await api(`/export/bets?${query}`),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
                    const link=document.createElement('a');link.href=url;link.download='predictions.csv';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
                },'הייצוא הוכן להורדה',false)}>ייצוא CSV</button>}
                {['sessions','parties','groups','memberships','polls'].includes(section)&&<button className="btn btn-primary" disabled={busy||(['parties','polls'].includes(section)&&!sessionId)||(section==='memberships'&&!groupId)} onClick={()=>edit(null)}>{section==='polls'?'הוספת סקר':'הוספת רשומה'}</button>}
            </div>
            {section==='polls'&&pollResults&&<form className="border rounded p-3 mb-3" onSubmit={e=>{e.preventDefault();run(async()=>{
                await api(`/polls/${pollResults.poll._id}/results`,'put',{predictions:pollResults.parties.map(p=>({partyId:p._id,predictedSeats:Number(pollResults.values[p._id])}))});setPollResults(null);
            },'תוצאות הסקר נשמרו ויוצגו בתחרות הסוקרים');}}>
                <h3>תוצאות הסקר — {pollResults.poll.pollsterName} ({new Date(pollResults.poll.pollDate).toLocaleDateString('he-IL',{timeZone:'UTC'})})</h3>
                <p>מערכת בחירות: {sessions.find(s=>s._id===identifier(pollResults.poll.sessionId))?.name||'הבחירות המשויכות לסקר'}</p>
                {pollResults.parties.map(p=><label key={p._id} className="d-block my-2">{p.name}<input required className="form-control" type="number" min="0" max="120" step="1" value={pollResults.values[p._id]??0} onChange={e=>setPollResults({...pollResults,values:{...pollResults.values,[p._id]:e.target.value===''?'':e.target.valueAsNumber}})}/></label>)}
                <p>סך הכול: {Object.values(pollResults.values).reduce((sum,n)=>sum+Number(n),0)} / 120</p>
                <button className="btn btn-primary" disabled={busy||!pollResults.parties.length||Object.values(pollResults.values).reduce((sum,n)=>sum+Number(n),0)!==120}>שמירת תוצאות הסקר</button>{' '}
                <button type="button" className="btn btn-secondary" onClick={()=>setPollResults(null)}>ביטול</button>
            </form>}
            {editing&&<form onSubmit={save} className="border rounded p-3 mb-3">
                <h3>{editing._id?'עריכת רשומה':'רשומה חדשה'}</h3>
                {(fields[section]||[]).map(([key,label,kind='text'])=><label key={key} className="d-block my-2">{label}
                    {['creatorId','userId'].includes(key)?<UserPicker api={api} value={form[key]} name={editing[key]?.name} disabled={section==='memberships'&&!!editing._id} onChange={value=>setForm({...form,[key]:value})}/>:
                    kind==='textarea'?<textarea className="form-control" value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})}/>:
                        ['role','status'].includes(kind)?<select className="form-select" value={form[key]} onChange={e=>setForm({...form,[key]:kind==='role'?Number(e.target.value):e.target.value})}>
                            {(kind==='role'?[[0,'משתתף'],[1,'אדמין'],[5,'סופר־אדמין']]:[['active','פעיל'],['left','עזב'],['blocked','חסום']]).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select>:
                        <input className={kind==='checkbox'?'mx-2':'form-control'} type={kind} required={!['checkbox','chars'].includes(kind)} min={kind==='number'?0:undefined} max={kind==='number'?120:undefined} step={kind==='number'?1:undefined}
                            disabled={section==='memberships'&&key==='userId'&&!!editing._id} checked={kind==='checkbox'?!!form[key]:undefined} value={kind==='checkbox'?undefined:form[key]??''}
                            onChange={e=>setForm({...form,[key]:kind==='checkbox'?e.target.checked:kind==='number'?e.target.valueAsNumber:e.target.value})}/>}
                </label>)}
                {section==='bets'&&<><p>אפשר לתקן הימור גם לאחר הסגירה. התיקון ינקה את הדירוג עד לחישוב מחדש.</p>{parties.map(p=><label key={p._id} className="d-block my-2">{p.name}<input required className="form-control" type="number" min="0" max="120" step="1" value={form.bets?.[p._id]??0} onChange={e=>setForm({bets:{...form.bets,[p._id]:e.target.valueAsNumber}})}/></label>)}<p>סך הכול: {Object.values(form.bets||{}).reduce((sum,n)=>sum+n,0)} / 120</p></>}
                <button disabled={busy} className="btn btn-primary">שמירה</button> <button type="button" className="btn btn-secondary" onClick={()=>setEditing(null)}>ביטול</button>
            </form>}
            <div className="table-responsive"><table className="table table-striped"><thead><tr><th>רשומה</th><th>פרטים</th><th>פעולות</th></tr></thead><tbody>
                {items.map(item=><tr key={item._id}><td>{rowName(item)}<small className="d-block" dir="ltr">{item._id}</small></td><td>
                    {section==='users'&&<>{item.email}<br/>תפקיד: {item.role}{item.disabled?' · חסום':''}</>}
                    {section==='sessions'&&<>{item.slug}<br/>{item.isClosed?'סגור':'פתוח'} · {new Date(item.endDate).toLocaleString('he-IL')}</>}
                    {section==='parties'&&<>טווח: {item.minPredictedSeats??0}–{item.maxPredictedSeats??120}</>}
                    {section==='polls'&&<><span style={{display:'inline-block',width:20,height:20,backgroundColor:item.color,border:'1px solid #777'}}/> {new Date(item.pollDate).toLocaleDateString('he-IL',{timeZone:'UTC'})}<br/>{item.completed?'תוצאות הוזנו':'ממתין להזנת תוצאות'}</>}
                    {section==='bets'&&<>{item.sessionId?.name}<br/>ניקוד: {item.score??'טרם חושב'}<br/>הוגש: {new Date(item.createdAt).toLocaleString('he-IL')}<details><summary>צפייה בהימור</summary><ul>{item.bets.map(b=><li key={identifier(b.partyId)}>{b.partyId?.name||identifier(b.partyId)}: {b.predictedSeats} מנדטים</li>)}</ul></details></>}
                    {section==='groups'&&<>יוצר: {item.creatorId?.name||identifier(item.creatorId)}</>}
                    {section==='memberships'&&<>{item.userId?.email}<br/>{({active:'פעיל',left:'עזב',blocked:'חסום'})[item.status]}</>}
                </td><td><div className="d-flex flex-wrap gap-2">
                    {!item.archived&&<button disabled={busy} className="btn btn-outline-primary btn-sm" onClick={()=>edit(item)}>עריכה</button>}
                    <button disabled={busy} className="btn btn-outline-danger btn-sm" onClick={()=>archive(item)}>{item.archived?'שחזור':'מחיקה / ארכוב'}</button>
                    {section==='polls'&&!item.archived&&<button disabled={busy} className="btn btn-outline-primary btn-sm" onClick={()=>run(async()=>{
                        const data=await api(`/polls/${item._id}/results`);setEditing(null);setPollResults({...data,values:Object.fromEntries(data.parties.map(p=>[p._id,data.poll.predictions.find(r=>r.partyId===p._id)?.predictedSeats??0]))});
                    },'',false)}>הזנת תוצאות הסקר</button>}
                    {section==='users'&&<Link className="btn btn-outline-secondary btn-sm" to={adminLink('bets',{userId:item._id})}>הימורים</Link>}
                    {section==='groups'&&<Link className="btn btn-outline-secondary btn-sm" to={adminLink('memberships',{groupId:item._id})}>חברי הקבוצה</Link>}
                    {section==='sessions'&&<Link className="btn btn-outline-secondary btn-sm" to={`/admin/results?sessionId=${item._id}`}>תוצאות ודירוג</Link>}
                </div></td></tr>)}
            </tbody></table></div>
            {!loading&&!items.length&&<p>אין רשומות להצגה</p>}
            <div className="d-flex gap-2 align-items-center"><button className="btn btn-outline-secondary" disabled={page<=1||loading} onClick={()=>setPage(page-1)}>הקודם</button><span>עמוד {page} מתוך {Math.max(1,Math.ceil(total/25))} · {total} רשומות</span><button className="btn btn-outline-secondary" disabled={page*25>=total||loading} onClick={()=>setPage(page+1)}>הבא</button></div>
        </>}
    </main>;
}
