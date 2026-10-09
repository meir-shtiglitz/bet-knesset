import React from 'react';
import PartyGraph from './party-graph';
import '../css/parties-graph.scss';
import { useSelector } from 'react-redux';
const FAKE_BETS_NUM_TO_ADD = 347;

function PartiesChart({ chartData }) {
    const { bets, parties } = useSelector(state => state.user);
    const count = chartData ? chartData.participantCount : bets.length;
    const displayCount = chartData ? chartData.participantCount : bets.length + FAKE_BETS_NUM_TO_ADD;
    const values = {};
    if (chartData) chartData.averages.forEach(p => { values[p.partyId] = p.avg; });
    else if (count) bets.forEach(b => Object.entries(b.betsMap || {}).forEach(([id, seats]) => {
        values[id] = (values[id] || 0) + Number(seats) / count;
    }));
    const averaged = parties.map(p => ({ ...p, avg: (values[p._id] || 0).toFixed(1).replace('.0', '') }));
    return <div>
        <p className="text-end">שיקלול ממוצע מנדטים מ <span className="bets-num">{displayCount}</span> המהמרים עד כה</p>
        {!count ? <p className="text-center">עדיין אין הימורים בבחירות אלו</p> :
            <table className={`graph ${!parties.length ? 'avg-table' : ''}`}><tbody>
                {averaged.sort((a, b) => b.avg - a.avg).map(p => <PartyGraph key={p._id} party={p} />)}
            </tbody></table>}
    </div>;
}
export default PartiesChart;
