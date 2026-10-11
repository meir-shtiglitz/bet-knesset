const assert = require('assert').strict;
const { calculateWinnerScore, calculateWinners } = require('../admin');
const Session = require('../model/sessions');
const Party = require('../model/parties');
const Result = require('../model/results');
const Bet = require('../model/bets');
const submitted = new Date('2026-01-01T00:00:00Z');
const published = new Date(+submitted + 123456);
const prediction = (a, b) => [{ partyId: 'a', predictedSeats: a }, { partyId: 'b', predictedSeats: b }];
const results = (a, b) => [{ partyId: 'a', actualSeats: a }, { partyId: 'b', actualSeats: b }];
const bonus = 0.5 * (+published - +submitted) / (+published + 1);
assert.equal(calculateWinnerScore(prediction(60, 60), results(60, 60), submitted, published), 1002 + bonus);
assert.equal(calculateWinnerScore(prediction(58, 62), results(60, 60), submitted, published), 996 + bonus);
assert.equal(calculateWinnerScore(prediction(0, 120), results(4, 116), submitted, published), 992 + bonus);
assert.equal(calculateWinnerScore(prediction(4, 116), results(0, 120), submitted, published), 992 + bonus);
assert.equal(calculateWinnerScore(prediction(0, 120), results(2, 118), submitted, published), 996 + bonus);
assert.equal(calculateWinnerScore([{partyId:'b',predictedSeats:120}], results(0, 120), submitted, published), 1002 + bonus);
assert.equal(calculateWinnerScore(prediction(60, 60), results(60, 60), submitted, published), calculateWinnerScore(prediction(60, 60), results(60, 60), submitted, published));
assert.throws(() => calculateWinnerScore(prediction(60, 60), results(60, 60), published, submitted));
assert.throws(() => calculateWinnerScore(prediction(60, 60), results(60, 60), 'invalid', published));
assert.throws(() => calculateWinnerScore(prediction(60, 60), results(60, 60.5), submitted, published));
assert.throws(() => calculateWinnerScore(prediction(60, 60), [results(60, 60)[0]], submitted, published));
assert.throws(() => calculateWinnerScore(prediction(60, 60), [results(60, 60)[0], results(60, 60)[0]], submitted, published));

// Regression: digit-length changes must not reverse chronological priority.
const at = elapsed => new Date(+published - elapsed);
const perfectAt = elapsed => calculateWinnerScore(prediction(60,60), results(60,60), at(elapsed), published);
assert(perfectAt(100) > perfectAt(99));
assert(perfectAt(1000) > perfectAt(999));
assert(perfectAt(100000) > perfectAt(99999));
assert(perfectAt(123456) > perfectAt(1));
assert.equal(calculateWinnerScore(prediction(60,60), results(60,60), published, published), 1002);
// Earlier submissions cannot overtake an extra whole point of accuracy.
assert(calculateWinnerScore(prediction(60,60), results(60,60), published, published) >
    calculateWinnerScore(prediction(59,61), results(60,60), new Date(1), published));
// Exact zero also earns one point; an unmatched zero loses the full error.
assert.equal(calculateWinnerScore(prediction(0,120), results(0,120), published, published), 1002);
assert.equal(calculateWinnerScore(prediction(0,120), results(4,116), published, published), 992);
assert.throws(() => calculateWinnerScore(prediction(60,60), results(60,60), new Date(-1), published));

(async () => {
    const sessionId = '000000000000000000000001';
    const endDate = new Date(+submitted + 100000);
    let records = [{_id:'prediction',createdAt:submitted,bets:prediction(60,60)}];
    let writes = [];
    let actual = { publishedAt:published, results:results(60,60) };
    Session.findById = async id => { assert.equal(id,sessionId); return {endDate}; };
    Party.find = async filter => { assert.deepEqual(filter,{sessionId}); return [{_id:'a'},{_id:'b'}]; };
    Result.findOne = async filter => { assert.deepEqual(filter,{sessionId}); return actual; };
    Bet.find = async filter => { assert.deepEqual(filter,{sessionId}); return records; };
    Bet.bulkWrite = async updates => { writes.push(updates); };
    assert.deepEqual(await calculateWinners(sessionId), {sessionId,scoredBets:1});
    assert.deepEqual(writes[0][0],{updateOne:{filter:{_id:'prediction',sessionId},update:{$set:{score:1002+bonus}}}});
    await calculateWinners(sessionId);
    assert.deepEqual(writes[0],writes[1]);
    records.push({_id:'late',createdAt:endDate,bets:prediction(60,60)});
    await assert.rejects(calculateWinners(sessionId), /submission date/);
    assert.equal(writes.length,2); // Invalid later records never partially update the batch.
    actual = null;
    await assert.rejects(calculateWinners(sessionId), /Published/);
    await assert.rejects(calculateWinners('invalid'), /Invalid election/);
    console.log('PASS: whole-point accuracy, absolute errors including zero, chronological tie bonus, scoped writes, repeatability, invalid-input rejection');
})().catch(error => {console.error(error);process.exit(1)});
