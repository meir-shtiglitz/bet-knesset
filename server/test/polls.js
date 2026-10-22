const assert=require('assert').strict;
const {competition,complete}=require('../security/polls');
const parties=[{_id:'a'},{_id:'b'}];
const predictions=(a,b)=>[{partyId:'a',predictedSeats:a},{partyId:'b',predictedSeats:b}];
const polls=[
    {_id:'1',pollsterName:'First',pollDate:'2026-01-01',color:'#ff0000',predictions:predictions(60,60)},
    {_id:'2',pollsterName:'First',pollDate:'2026-01-02',color:'#ff0000',predictions:predictions(62,58)},
    {_id:'3',pollsterName:'Second',pollDate:'2026-01-01',color:'#00ff00',predictions:predictions(60,60)}
];
const original=JSON.stringify(polls);
let data=competition(polls,parties,null);
assert.deepEqual(data.polls.map(p=>p._id),['2','3']);assert.deepEqual(data.dates,['2026-01-02','2026-01-01']);
assert.equal(data.averages[0].avg,61);assert.equal(data.averages[1].avg,59);assert.equal(data.result,null);assert.deepEqual(data.ranking,[]);
const result={publishedAt:'2026-01-03',results:[{partyId:'a',actualSeats:60},{partyId:'b',actualSeats:60}]};
data=competition(polls,parties,result,'2026-01-01');
assert.equal(data.polls.length,2);assert.equal(data.averages[0].avg,60);assert.equal(data.ranking[0].score,data.ranking[1].score);
data=competition(polls,parties,result);
assert.equal(data.ranking[0].pollsterName,'Second');assert(data.ranking[0].score>data.ranking[1].score);
const ties=[{...polls[0],_id:'older'},{...polls[0],_id:'newer',pollsterName:'Third',pollDate:'2026-01-02'}];
assert.equal(competition(ties,parties,result).ranking[0].pollId,'older');
assert.equal(competition(polls,parties,result,'2026-01-04').polls.length,0);
assert.equal(competition(polls,parties,{results:[{partyId:'a',actualSeats:120}],publishedAt:'2026-01-03'}).result,null);
assert.equal(competition([...polls,{...polls[0],_id:'invalid',predictions:predictions(50,50)}],parties,null).polls.length,2);
assert(!complete([{partyId:'a',predictedSeats:60},{partyId:'a',predictedSeats:60}],parties));
assert.equal(JSON.stringify(polls),original);assert(!polls.some(p=>Object.hasOwnProperty.call(p,'score')));
assert.equal(competition([],parties,null).averages[0].avg,0);
console.log('PASS: latest per pollster, date selection, selected averages, dynamic accuracy/tie scoring, invalid data, no score persistence');
