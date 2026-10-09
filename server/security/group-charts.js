function eligible(membership, session) {
    let cutoff = new Date(session.endDate).getTime();
    return membership.status === 'active' && new Date(membership.joinedAt).getTime() < cutoff &&
        !(membership.excludedSessionIds || []).some(id => String(id) === String(session._id));
}
function charts(bets, memberships, session, parties, result) {
    const active = new Map(memberships.filter(m => m.status === 'active').map(m => [String(m.userId), m]));
    const included = bets.filter(b => active.has(String(b.userId?._id || b.userId)));
    const sums = {};
    included.forEach(b => b.bets.forEach(p => { sums[String(p.partyId)] = (sums[String(p.partyId)] || 0) + p.predictedSeats; }));
    const ranked = included.filter(b => eligible(active.get(String(b.userId?._id || b.userId)), session));
    const ready = !!result?.results?.length && ranked.every(b => Number.isFinite(b.score));
    return {
        participantCount: included.length,
        averages: parties.map(p => ({ partyId: p._id, avg: included.length ? (sums[String(p._id)] || 0) / included.length : 0 })),
        winnersReady: ready,
        // Reuse the global score and stable score-descending ranking.
        winners: ready ? [...ranked].sort((a, b) => b.score - a.score).slice(0, 10).map(b => ({
            _id: b._id, userId: b.userId, score: b.score, bets: b.bets
        })) : []
    };
}
module.exports = { eligible, charts };
