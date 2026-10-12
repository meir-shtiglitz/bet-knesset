// Integration validation against a uniquely named local test DB only.
// Run explicitly: node server/test/admin-management.js (requires local MongoDB).
const assert=require('assert').strict;
const http=require('http');
const crypto=require('crypto');
const mongoose=require('mongoose');
const User=require('../model/user');
const Session=require('../model/sessions');
const Party=require('../model/parties');
const Bet=require('../model/bets');
const Group=require('../model/group');
const Membership=require('../model/group-membership');
const Result=require('../model/results');
const {issueToken}=require('../security/tokens');
process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');
const {createApp}=require('../app');
const database=`bet_knesset_admin_test_${crypto.randomBytes(8).toString('hex')}`;
let server,checks=0;
function call(path,method='GET',data,token) {
    return new Promise((resolve,reject)=>{
        const payload=data===undefined?undefined:JSON.stringify(data);
        const req=http.request({hostname:'127.0.0.1',port:server.address().port,path,method,headers:{...(payload?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{}),...(token?{Authorization:`Bearer ${token}`}:{})}},res=>{
            let text='';res.on('data',c=>text+=c);res.on('end',()=>{let body;try{body=JSON.parse(text);}catch(_){body=text;}resolve({status:res.statusCode,body});});
        });req.on('error',reject);req.end(payload);
    });
}
async function expect(path,method,data,token,status=200) {
    const response=await call(path,method,data,token);assert.equal(response.status,status,JSON.stringify(response));checks++;return response.body;
}
(async()=>{
    await mongoose.connect(`mongodb://127.0.0.1:27017/${database}`,{useNewUrlParser:true,useUnifiedTopology:true,useFindAndModify:false});
    await Promise.all([User,Session,Party,Bet,Group,Membership,Result].map(m=>m.init()));
    const accounts=await User.create([0,1,5].map(role=>({name:`Role ${role}`,email:`role${role}@example.com`,role,hashPasword:'unused-test-hash'})));
    const [participant,admin,superAdmin]=accounts;
    const token=issueToken(superAdmin);
    server=await new Promise(resolve=>{const s=createApp().listen(0,'127.0.0.1',()=>resolve(s));});
    await expect('/api/admin/users','GET',undefined,undefined,401);
    for(const account of [participant,admin]) {
        const deniedToken=issueToken(account);
        for(const route of ['/users','/sessions','/parties','/bets','/groups','/memberships']) await expect(`/api/admin${route}`,'GET',undefined,deniedToken,403);
        await expect('/api/admin/sessions','POST',{},deniedToken,403);
    }
    await expect('/api/admin/users?q=%2E%2A','GET',undefined,token).then(data=>assert.equal(data.total,0));
    const userList=await expect('/api/admin/users','GET',undefined,token);
    assert(!JSON.stringify(userList).includes('hashPasword'));assert(!JSON.stringify(userList).includes('tokenVersion'));checks+=2;
    const fields={name:'Synthetic election',slug:'synthetic',description:'Test only',startDate:'2026-01-01T00:00:00.000Z',endDate:'2026-01-02T00:00:00.000Z',isClosed:true};
    const session=(await expect('/api/admin/sessions','POST',fields,token,201)).item;
    await expect('/api/admin/sessions','POST',fields,token,409);
    await expect(`/api/admin/sessions/${session._id}`,'PATCH',{...fields,startDate:fields.endDate},token,400);
    const parties=[];
    for(const name of ['First','Second']) parties.push((await expect('/api/admin/parties','POST',{sessionId:session._id,name,chars:name[0],subtext:'',minPredictedSeats:0,maxPredictedSeats:120},token,201)).item);
    await expect(`/api/admin/parties/${parties[0]._id}`,'PATCH',{sessionId:session._id,name:'First',minPredictedSeats:50,maxPredictedSeats:40},token,400);
    const predictions=parties.map(p=>({partyId:p._id,predictedSeats:60}));
    const bet=await Bet.create({userId:participant._id,sessionId:session._id,bets:predictions,createdAt:new Date('2026-01-01T12:00:00Z')});
    await expect(`/api/admin/bets?userId=${participant._id}&sessionId=${session._id}`,'GET',undefined,token).then(data=>assert.equal(data.items.length,1));
    const actual={publishedAt:'2026-01-03T00:00:00Z',results:parties.map(p=>({partyId:p._id,actualSeats:60}))};
    await expect(`/api/admin/sessions/${session._id}/results`,'PUT',{...actual,results:[{partyId:parties[0]._id,actualSeats:120}]},token,400);
    await expect(`/api/admin/sessions/${session._id}/results`,'PUT',actual,token);
    const preview=await expect(`/api/admin/sessions/${session._id}/preview`,'POST',{},token);
    assert.equal(preview.ranking.length,1);assert.equal(preview.ranking[0].name,participant.name);assert.equal((await Bet.findById(bet._id)).score,undefined);checks+=3;
    await expect(`/api/admin/sessions/${session._id}/calculate`,'POST',{},token);
    assert(Number.isFinite((await Bet.findById(bet._id)).score));checks++;
    await expect(`/api/admin/bets/${bet._id}`,'PATCH',{bets:{[parties[0]._id]:65,[parties[1]._id]:55}},token);
    assert.equal((await Bet.findById(bet._id)).score,undefined);checks++;
    await expect(`/api/admin/sessions/${session._id}/calculate`,'POST',{},token);
    assert((await Bet.findById(bet._id)).score<1000);checks++;
    participant.name='=1+1';await participant.save();
    const csv=await expect(`/api/admin/export/bets?sessionId=${session._id}`,'GET',undefined,token);
    assert(csv.includes("'=1+1"));assert(!csv.includes('hashPasword'));checks+=2;
    await expect(`/api/admin/parties/${parties[0]._id}/archive`,'POST',{archived:true},token,409);
    await expect(`/api/admin/sessions/${session._id}/results`,'DELETE',undefined,token);
    assert.equal(await Result.findOne({sessionId:session._id}),null);assert.equal((await Bet.findById(bet._id)).score,undefined);checks+=2;
    await expect(`/api/admin/sessions/${session._id}/results/restore`,'POST',{},token);
    assert(await Result.findOne({sessionId:session._id}));checks++;
    await expect(`/api/admin/sessions/${session._id}/archive`,'POST',{archived:true},token);
    assert.equal(await Session.findById(session._id),null);checks++;
    await expect('/api/bets/get/synthetic','GET',undefined,undefined,404);
    await expect('/api/admin/sessions?archived=true','GET',undefined,token).then(data=>assert.equal(data.total,1));
    await expect(`/api/admin/sessions/${session._id}/archive`,'POST',{archived:false},token);
    await expect('/api/bets/get/synthetic','GET',undefined,undefined);
    await expect(`/api/admin/bets/${bet._id}/archive`,'POST',{archived:true},token);
    assert.equal(await Bet.findById(bet._id),null);checks++;
    await expect(`/api/admin/bets/${bet._id}/archive`,'POST',{archived:false},token);
    assert(await Bet.findById(bet._id));checks++;
    const group=(await expect('/api/admin/groups','POST',{name:'Synthetic group',description:'',creatorId:String(participant._id)},token,201)).item;
    const creatorMembership=await Membership.findOne({groupId:group._id,userId:participant._id});assert(creatorMembership);checks++;
    await expect(`/api/admin/memberships/${creatorMembership._id}/archive`,'POST',{archived:true},token,400);
    const member=(await expect('/api/admin/memberships','POST',{groupId:group._id,userId:String(admin._id),status:'active'},token,201)).item;
    await expect(`/api/admin/memberships/${member._id}`,'PATCH',{groupId:group._id,userId:String(admin._id),status:'blocked'},token);
    await expect(`/api/admin/groups/${group._id}/archive`,'POST',{archived:true},token);
    assert.equal(await Group.findById(group._id),null);assert(await Membership.findById(member._id));checks+=2;
    await expect(`/api/admin/groups/${group._id}/archive`,'POST',{archived:false},token);
    await expect(`/api/admin/users/${superAdmin._id}`,'PATCH',{name:superAdmin.name,email:superAdmin.email,role:0,disabled:false},token,400);
    await expect(`/api/admin/users/${superAdmin._id}/archive`,'POST',{archived:true},token,400);
    await expect(`/api/admin/users/${participant._id}`,'PATCH',{name:participant.name,email:participant.email,role:0,disabled:true},token);
    await expect('/api/admin/users','GET',undefined,issueToken(participant),401);
    await expect(`/api/admin/users/${admin._id}/archive`,'POST',{archived:true},token);
    assert.equal(await User.findById(admin._id),null);checks++;
    await expect(`/api/admin/users/${admin._id}/archive`,'POST',{archived:false},token);
    assert(await User.findById(admin._id));checks++;
    await User.insertMany(Array.from({length:27},(_,i)=>({name:`Pagination ${i}`,email:`page${i}@example.com`,hashPasword:'unused'})));
    const page1=await expect('/api/admin/users','GET',undefined,token),page2=await expect('/api/admin/users?page=2','GET',undefined,token);
    assert.equal(page1.items.length,25);assert.equal(page2.items.length,5);assert.equal(page1.total,30);checks+=3;
    await expect('/api/admin/users?page=-1','GET',undefined,token,400);
    await expect(`/api/admin/users/${admin._id}`,'PATCH',{name:'Test',email:admin.email,role:1,disabled:false,hashPasword:'injected'},token,400);
    // Removing access in the database invalidates an already-issued admin token.
    superAdmin.role=0;await superAdmin.save();
    await expect('/api/admin/users','GET',undefined,token,403);
    console.log(`PASS: ${checks} superAdmin integration assertions (real local MongoDB; synthetic data; archive, permissions, CRUD, groups, results, scoring, pagination)`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
    if(server) await new Promise(resolve=>server.close(resolve));
    if(mongoose.connection.readyState===1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});
