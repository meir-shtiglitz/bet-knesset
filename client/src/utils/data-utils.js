export const mapBetsByParty = (bets) => {
    const map = {}
    bets.forEach(b => {map[b.partyId] = b.predictedSeats})
    return map
}