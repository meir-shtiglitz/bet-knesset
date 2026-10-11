const { ObjectId } = require('mongoose').Types;
const Session = require('../model/sessions');
const Party = require('../model/parties');
const Result = require('../model/results');
const Bet = require('../model/bets');
const partiesJson = require('./parties.json');

const addSession = async () => {
    const session = await new Session({
        slug: 'election26',
        name: 'בחירות לכנסת 26',
        description: '',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-10-26'),
        isClosed: false,
    })
    session.save();
}

const addParties = async () => {
    const sessionId = new ObjectId('6ac684c979defa29b119fac3');
    const partiesToInsert = partiesJson.map(p => ({ ...p, sessionId }));
    const parties = await Party.insertMany(partiesToInsert);
}

const addResults = async () => {
    const partiesResults =  []//TODO json??? form???
    const results = {
        sessionId: new ObjectId('6844a275a7adb82d81ea93cc'),
        results: partiesResults.map(pr => 
            ({
                partyId: new ObjectId(pr._id),
                actualSeats: pr.actualSeats
            })
        ),
        publishedAt: new Date('2022-11-01')
    }
    const addedResults = await Result.insertMany(results);

}

// Integer accuracy points plus a monotonic time bonus below half a point.
// Earlier submissions win accuracy ties, never overtake a better prediction,
// and receive the same score when the published results are recalculated.
const calculateWinnerScore = (predictions, results, createdAt, publishedAt) => {
    const submittedAt = new Date(createdAt).getTime();
    const publicationTime = new Date(publishedAt).getTime();
    const elapsed = publicationTime - submittedAt;
    if (!createdAt || !publishedAt || submittedAt < 0 || !Number.isSafeInteger(publicationTime) || !Number.isSafeInteger(elapsed) || elapsed < 0) {
        throw new Error('Prediction and publication dates must be valid and chronological');
    }
    const seatsByParty = new Map();
    for (const prediction of predictions) {
        const id = String(prediction.partyId);
        if (seatsByParty.has(id) || !Number.isInteger(prediction.predictedSeats) || prediction.predictedSeats < 0 || prediction.predictedSeats > 120) {
            throw new Error('Invalid or duplicate prediction');
        }
        seatsByParty.set(id, prediction.predictedSeats);
    }
    const resultIds = new Set();
    let score = 1000;
    for (const result of results) {
        const id = String(result.partyId);
        if (resultIds.has(id) || !Number.isInteger(result.actualSeats) || result.actualSeats < 0 || result.actualSeats > 120) {
            throw new Error('Invalid or duplicate result');
        }
        resultIds.add(id);
        const predicted = seatsByParty.get(id) || 0;
        if (predicted === result.actualSeats) score += 1;
        else score -= Math.abs(result.actualSeats - predicted);
    }
    if (!results.length || [...seatsByParty.keys()].some(id => !resultIds.has(id))) {
        throw new Error('Results must cover every predicted party');
    }
    return score + 0.5 * elapsed / (publicationTime + 1);
};

// Manual admin helper; deliberately not exposed through an HTTP route.
// The caller supplies the election ID and manages the database connection.
const calculateWinners = async (sessionId) => {
    if (!ObjectId.isValid(sessionId)) throw new Error('Invalid election ID');
    const session = await Session.findById(sessionId);
    if (!session) throw new Error('Election not found');
    const cutoff = new Date(session.endDate).getTime();
    if (!Number.isFinite(cutoff) || cutoff > Date.now()) throw new Error('Election has not ended');
    const result = await Result.findOne({ sessionId });
    if (!result || !result.publishedAt || new Date(result.publishedAt).getTime() < cutoff || new Date(result.publishedAt).getTime() > Date.now()) {
        throw new Error('Published election results are required');
    }
    const parties = await Party.find({ sessionId });
    const partyIds = new Set(parties.map(p => String(p._id)));
    if (!partyIds.size || result.results.length !== partyIds.size || result.results.some(r => !partyIds.has(String(r.partyId))) ||
        result.results.reduce((sum, r) => sum + r.actualSeats, 0) !== 120) {
        throw new Error('Results must cover all election parties and total 120 seats');
    }
    const bets = await Bet.find({ sessionId });
    // Validate the whole batch before writing scores, including empty elections.
    calculateWinnerScore([], result.results, result.publishedAt, result.publishedAt);
    const updates = bets.map(bet => {
        const submittedAt = new Date(bet.createdAt).getTime();
        if (!bet.createdAt || !Number.isFinite(submittedAt) || submittedAt >= cutoff ||
            bet.bets.reduce((sum, p) => sum + p.predictedSeats, 0) !== 120) {
            throw new Error('Invalid prediction allocation or submission date');
        }
        return { updateOne: { filter: { _id: bet._id, sessionId },
            update: { $set: { score: calculateWinnerScore(bet.bets, result.results, bet.createdAt, result.publishedAt) } } } };
    });
    if (updates.length) await Bet.bulkWrite(updates);
    return { sessionId: String(sessionId), scoredBets: updates.length };
};

module.exports.addSession = addSession;
module.exports.addParties = addParties;
module.exports.calculateWinnerScore = calculateWinnerScore;
module.exports.calculateWinners = calculateWinners;
// module.exports.addResults = addResults;
// module.exports.addBets = addBets;
