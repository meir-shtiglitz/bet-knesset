import React,{useEffect,useState} from 'react';
import {useSelector} from 'react-redux';
import axios from 'axios';
import {ApiUrl} from '../apiUrl';
import '../css/poll-competition.scss';
const dateLabel=value=>new Date(value).toLocaleDateString('he-IL',{timeZone:'UTC'});
const number=value=>Number(value.toFixed(1));
function Seats({value,color}) {
    return <div className="poll-seats"><span>{number(value)}</span><div className="poll-track" aria-hidden="true"><div style={{width:`${value/120*100}%`,backgroundColor:color}}/></div></div>;
}
export default function PollCompetition() {
    const {session,result}=useSelector(state=>state.user);
    return <Competition key={session?._id||'none'} sessionId={session?._id} resultVersion={JSON.stringify(result)}/>;
}
function Competition({sessionId,resultVersion}) {
    const [date,setDate]=useState('latest'),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[retry,setRetry]=useState(0);
    useEffect(()=>{
        let active=true;setData(null);setError('');
        if(!sessionId)return;
        setLoading(true);
        axios.get(`${ApiUrl}/polls/${sessionId}`,{params:{date}}).then(response=>{if(active)setData(response.data);})
            .catch(()=>{if(active)setError('לא ניתן לטעון את תחרות הסוקרים');}).finally(()=>{if(active)setLoading(false);});
        return()=>{active=false;};
    },[sessionId,date,retry,resultVersion]);
    if(!sessionId)return null;
    return <section className="poll-competition" dir="rtl" aria-labelledby="poll-competition-title">
        <div className="section-title"><h1 className="title" id="poll-competition-title">תחרות הסוקרים</h1><hr/></div>
        {loading&&<p role="status">טוענים סקרים…</p>}
        {error&&<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>נסו שוב</button></p>}
        {data&&<>
            {!data.result&&<p className="text-center">(חישוב הסוקרים המנצחים יוצג כאן לאחר הבחירות)</p>}
            <label className="d-block mb-3">תאריך הסקרים<select className="form-select" value={date} onChange={e=>setDate(e.target.value)}>
                <option value="latest">האחרונים — הסקר האחרון מכל עורך סקרים</option>
                {data.dates.map(day=><option key={day} value={day}>{dateLabel(day)}</option>)}
            </select></label>
            {!data.polls.length?<p>אין סקרים להצגה בתאריך שנבחר.</p>:<>
                <p>מספר המנדטים בכל סקר והממוצע בין הסקרים המוצגים, מתוך 120 מנדטים.</p>
                <div className="poll-table-wrap" tabIndex="0" role="region" aria-label="גרף השוואת הסקרים — ניתן לגלול לצדדים">
                    <table className="table poll-table"><caption>השוואת תחזיות הסוקרים לפי מפלגה</caption><thead><tr><th scope="col">מפלגה</th>
                        {data.polls.map(p=><th key={p._id} scope="col"><span className="poll-color" style={{backgroundColor:p.color}}/>{p.pollsterName}<small className="d-block">{dateLabel(p.pollDate)}</small></th>)}
                        <th scope="col">ממוצע הסקרים</th>{data.result&&<th scope="col">תוצאות אמת</th>}
                    </tr></thead><tbody>{data.parties.map(p=><tr key={p._id}><th scope="row">{p.name}</th>
                        {data.polls.map(poll=><td key={poll._id}><Seats value={poll.predictions.find(r=>r.partyId===p._id)?.predictedSeats||0} color={poll.color}/></td>)}
                        <td><Seats value={data.averages.find(r=>r.partyId===p._id)?.avg||0} color="#64748b"/></td>
                        {data.result&&<td><Seats value={data.result.results.find(r=>r.partyId===p._id)?.actualSeats||0} color="#111827"/></td>}
                    </tr>)}</tbody></table>
                </div>
                {data.result&&<div className="table-responsive mt-4"><h2>דירוג הסוקרים</h2><p>הדירוג מחושב בזמן הטעינה לפי הסקרים שנבחרו, מול תוצאות האמת. בשוויון בניקוד הדיוק, הסקר המוקדם יותר קודם.</p>
                    <table className="table table-striped"><thead><tr><th>מקום</th><th>עורך הסקר</th><th>תאריך</th><th>ניקוד</th></tr></thead><tbody>{data.ranking.map((p,i)=><tr key={p.pollId}><td>{i+1}</td><td>{p.pollsterName}</td><td>{dateLabel(p.pollDate)}</td><td>{p.score.toFixed(6)}</td></tr>)}</tbody></table>
                </div>}
            </>}
        </>}
    </section>;
}
