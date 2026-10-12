const assert = require('assert').strict;
const http = require('http');
const express = require('express');
process.env.JWT_SECRET = 'synthetic-party-range-secret';
const Party = require('../model/parties');
const User = require('../model/user');
const Session = require('../model/sessions');
const Bet = require('../model/bets');
const { issueToken } = require('../security/tokens');
const { isWithinPartyRanges } = require('../security/predictions');
const sessionId = '000000000000000000000001';
const first = '000000000000000000000002';
const second = '000000000000000000000003';
const user = new User({_id:'000000000000000000000004',name:'Test',email:'test@example.com',hashPasword:'unused'});
let parties = [{_id:first,minPredictedSeats:20,maxPredictedSeats:40},{_id:second}];
let writes = 0;
User.findById = async () => user;
Session.findById = async () => ({isClosed:false,startDate:new Date(Date.now()-10000),endDate:new Date(Date.now()+60000)});
Party.find = filter => {
    assert.deepEqual(filter,{sessionId});
    return {select: async fields => { assert(fields.includes('minPredictedSeats') && fields.includes('maxPredictedSeats')); return parties; }};
};
Bet.init = async () => {};
Bet.findOneAndUpdate = async (filter, update) => {writes++;return {toObject:()=>({...filter,...update.$set})};};
const defaults = new Party();
assert.equal(defaults.minPredictedSeats,0);
assert.equal(defaults.maxPredictedSeats,120);
for (const range of [{minPredictedSeats:-1},{maxPredictedSeats:121},{minPredictedSeats:2.5},{maxPredictedSeats:4.5},{minPredictedSeats:40,maxPredictedSeats:20}]) {
    assert(new Party(range).validateSync());
}
assert(!new Party({minPredictedSeats:20,maxPredictedSeats:40}).validateSync());
assert.throws(()=>isWithinPartyRanges({},[{_id:first,minPredictedSeats:40,maxPredictedSeats:20}]));
const app=express();app.use(express.json());app.use('/api/bets',require('../routes/bets-route'));
let server;
function submit(bets) {
    return new Promise((resolve,reject)=>{
        const payload=JSON.stringify({sessionId,bets});
        const req=http.request({hostname:'127.0.0.1',port:server.address().port,path:'/api/bets/add',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload),Authorization:`Bearer ${issueToken(user)}`}},res=>{
            let data='';res.on('data',chunk=>data+=chunk);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(data)}));
        }); req.on('error',reject);req.end(payload);
    });
}
(async()=>{
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    for(const seats of [10,50,0]) {
        const response=await submit({[first]:seats,[second]:120-seats});
        assert.equal(response.status,400);assert.equal(response.body.code,'PREDICTION_OUT_OF_RANGE');
        assert.equal(response.body.error,'מצטערים ההימור שלך זוהה כפייק נסה שוב מאוחר יותר');
    }
    assert.equal((await submit({[second]:120})).status,400); // Omitted party is zero, below its minimum.
    assert.equal(writes,0);
    for(const seats of [20,30,40]) assert.equal((await submit({[first]:seats,[second]:120-seats})).status,200);
    assert.equal(writes,3);
    parties=[{_id:first},{_id:second}];
    assert.equal((await submit({[second]:120})).status,200); // Legacy documents stay compatible.
    parties=[{_id:first,minPredictedSeats:0,maxPredictedSeats:0},{_id:second}];
    assert.equal((await submit({[second]:120})).status,200);
    const before=writes;
    assert.equal((await submit({[first]:4,[second]:116})).status,400);
    assert.equal(writes,before);
    console.log('PASS: party range defaults/schema, inclusive bounds, omitted predictions, server rejection before writes, existing records');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server?.close());
