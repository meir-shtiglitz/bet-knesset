import React from 'react';
import { useSelector } from 'react-redux';
import '../css/winner.scss';
import PartyWinnerGraph from './winner-graph';

function Winner({ scopedBets, ready }) {
    const { bets, user, result, parties } = useSelector(state => state.user);
    const source = scopedBets === undefined ? bets : scopedBets;
    if (!result?.results?.length) return <div className="text-center"><h3>המנצחים הגדולים יוכרזו לאחר תוצאות האמת</h3></div>;
    if (ready === false || (ready === undefined && !source.every(b => Number.isFinite(b.score)))) {
        return <p className="text-center">המנצחים מחושבים כעת</p>;
    }
    if (!source.length) return <p className="text-center">אין משתתפים זכאים לדירוג בבחירות אלו</p>;
    const betsByPlace = [...source].sort((a, b) => b.score - a.score);
    const winner = betsByPlace[0];
    const own = bets.find(b => b.userId?._id === user?._id)?.betsMap;
    const results = Object.fromEntries(result.results.map(p => [p.partyId, p.actualSeats]));
    const merged = parties.map(p => ({ ...p, final: results[p._id] || 0,
        winner: winner.betsMap?.[p._id] || 0, userBet: own?.[p._id] || 0 }));
    return <div className="winner-section">
        <h1 className="text-end"><span className="team-blue">מקום ראשון: </span>{winner.userId?.name}</h1>
        <div className="winner-legends">
            <div className="winner-legend">תוצאות אמת <span className="legend-rect bg-team-blue" /></div>
            <div className="winner-legend">ההימור המנצח <span className="legend-rect bg-success" /></div>
            {own && <div className="winner-legend">ההימור שלי <span className="legend-rect bg-danger" /></div>}
        </div>
        <div className="winner-head">
            <div className="winners-list">{betsByPlace.slice(1, 10).map((b, i) => <p key={b._id}>מקום {i + 2}: {b.userId?.name}</p>)}</div>
            <table className="graph winner-graph"><tbody>
                {merged.filter(p => p.winner || p.final || p.userBet).sort((a, b) => b.final - a.final)
                    .map(p => <PartyWinnerGraph key={p._id} party={p} isUserBet={!!own} />)}
            </tbody></table>
        </div>
    </div>;
}
export default Winner;
