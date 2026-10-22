const express = require('express');
const Joi = require('joi');
const crypto = require('crypto');
const Session = require('../model/sessions');
const Party = require('../model/parties');
const User = require('../model/user');
const Bet = require('../model/bets');
const Group = require('../model/group');
const Membership = require('../model/group-membership');
const Result = require('../model/results');
const Poll = require('../model/poll');
const {complete:completePoll}=require('../security/polls');
const { isLoged, isSuperAdmin } = require('../middlewears/user');
const { rateLimit } = require('../security/rate-limit');
const { validatePrediction, isWithinPartyRanges } = require('../security/predictions');
const { calculateWinners } = require('../admin');
const router = express.Router();
router.use(isLoged, isSuperAdmin, rateLimit({ limit: 300 }));
const id = Joi.string().pattern(/^[a-f0-9]{24}$/).required();
const seats = Joi.number().integer().min(0).max(120).required();
const schemas = {
    polls:Joi.object({sessionId:id,pollsterName:Joi.string().trim().min(1).max(100).required(),pollDate:Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),color:Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).required()}).required(),
    sessions: Joi.object({ name: Joi.string().trim().min(1).max(100).required(), slug: Joi.string().max(100).pattern(/^[\p{L}\p{N}_-]+$/u).required(),
        description: Joi.string().allow('').max(2000).default(''), startDate: Joi.string().isoDate().required(), endDate: Joi.string().isoDate().required(), isClosed: Joi.boolean().required() }).required(),
    parties: Joi.object({ sessionId: id, name: Joi.string().trim().min(1).max(100).required(), chars: Joi.string().allow('').max(20).default(''), subtext: Joi.string().allow('').max(500).default(''),
        minPredictedSeats: seats, maxPredictedSeats: seats }).required(),
    users: Joi.object({name:Joi.string().trim().min(1).max(50).required(),email:Joi.string().email().max(100).required(),role:Joi.number().valid(0,1,5).required(),disabled:Joi.boolean().required()}).required(),
    groups: Joi.object({name:Joi.string().trim().min(1).max(80).required(),description:Joi.string().allow('').max(500).default(''),creatorId:id}).required(),
    bets: Joi.object({bets:Joi.object().pattern(/^[a-f0-9]{24}$/, seats).min(1).max(120).required()}).required(),
    memberships: Joi.object({groupId:id,userId:id,status:Joi.string().valid('active','left','blocked').required()}).required()
};
const models = {sessions:Session,parties:Party,users:User,bets:Bet,groups:Group,memberships:Membership,polls:Poll};
const projections = {
    polls:'sessionId pollsterName pollDate color completed predictions archived',
    sessions:'name slug description startDate endDate isClosed archived',
    parties:'sessionId name chars subtext minPredictedSeats maxPredictedSeats archived',
    users:'name email role disabled archived createdAt',
    bets:'userId sessionId bets score createdAt updatedAt archived',
    groups:'name description creatorId deleted archived',
    memberships:'groupId userId status joinedAt archived'
};
const fail = (status, message) => { const e=new Error(message);e.status=status;throw e; };
function validate(schema, data) {
    const check=schema.validate(data,{convert:false});
    if(check.error) fail(400,'שדות לא תקינים');
    return check.value;
}
const safe = fn => async(req,res) => {
    try { await fn(req,res); }
    catch(e) { res.status(e.status || (e.code===11000?409:e.name==='ValidationError'?400:503)).json({error:e.status?e.message:e.code===11000?'הרשומה כבר קיימת':e.name==='ValidationError'?'שדות לא תקינים':'לא ניתן להשלים את הפעולה'}); }
};
async function find(Model, recordId) {
    validate(id,recordId);
    const doc=await Model.findById(recordId).withArchived();
    if(!doc) fail(404,'הרשומה לא נמצאה');
    return doc;
}
async function invalidate(sessionId) {
    await Bet.updateMany({sessionId},{$unset:{score:1,place:1}}).withArchived();
}
function view(type, doc) {
    const object=doc.toObject();
    return Object.fromEntries(['_id',...projections[type].split(' ')].filter(k=>object[k]!==undefined).map(k=>[k,object[k]]));
}
const listSchema=Joi.object({page:Joi.string().pattern(/^[1-9]\d{0,5}$/).default('1'),q:Joi.string().max(100).allow('').default(''),
    sessionId:id.optional(),userId:id.optional(),groupId:id.optional(),archived:Joi.string().valid('true','false').default('false')});
router.get('/:type',safe(async(req,res)=>{
    const {type}=req.params, Model=models[type];if(!Model) fail(404,'מסך לא נמצא');
    const query=validate(listSchema,req.query);
    const filter={archived:query.archived==='true'?true:{$ne:true}};
    if(query.sessionId && ['parties','bets','polls'].includes(type)) filter.sessionId=query.sessionId;
    if(query.sessionId && type==='sessions') filter._id=query.sessionId;
    if(query.sessionId && ['users','groups','memberships'].includes(type)) {
        const participants=await Bet.find({sessionId:query.sessionId}).select('userId');
        const userIds=[...new Set(participants.map(b=>String(b.userId)))];
        if(type==='users') filter._id={$in:userIds};
        if(type==='memberships') filter.userId={$in:userIds};
        if(type==='groups') {
            const memberships=await Membership.find({userId:{$in:userIds},status:'active'}).select('groupId');
            filter._id={$in:memberships.map(m=>m.groupId)};
        }
    }
    if(query.userId && ['bets','memberships'].includes(type)) {
        if(type==='memberships'&&query.sessionId) filter.$and=[{userId:query.userId}];
        else filter.userId=query.userId;
    }
    if(query.groupId && type==='memberships') filter.groupId=query.groupId;
    if(query.q && ['sessions','parties','users','groups','polls'].includes(type)) {
        const regex=new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');
        filter.$or=(type==='users'?['name','email']:type==='polls'?['pollsterName']:['name']).map(field=>({[field]:regex}));
    }
    const page=Number(query.page),pageSize=25;
    const total=await Model.countDocuments(filter).withArchived();
    let cursor=Model.find(filter).withArchived().select(projections[type]).sort({_id:1}).skip((page-1)*pageSize).limit(pageSize);
    if(type==='bets') cursor=cursor.populate({path:'userId',select:'name email',options:{includeArchived:true}}).populate({path:'sessionId',select:'name',options:{includeArchived:true}}).populate({path:'bets.partyId',select:'name',options:{includeArchived:true}});
    if(type==='memberships') cursor=cursor.populate({path:'userId',select:'name email',options:{includeArchived:true}});
    if(type==='groups') cursor=cursor.populate({path:'creatorId',select:'name email',options:{includeArchived:true}});
    res.json({items:await cursor,total,page,pageSize});
}));
router.get('/export/bets',safe(async(req,res)=>{
    const query=validate(Joi.object({sessionId:id.optional(),userId:id.optional(),archived:Joi.string().valid('true','false').default('false')}),req.query);
    const filter={archived:query.archived==='true'?true:{$ne:true}};
    if(query.sessionId) filter.sessionId=query.sessionId;
    if(query.userId) filter.userId=query.userId;
    const bets=await Bet.find(filter).withArchived().select('userId sessionId score bets createdAt')
        .populate({path:'userId',select:'name email',options:{includeArchived:true}}).populate({path:'sessionId',select:'name',options:{includeArchived:true}}).sort({score:-1,_id:1}).limit(10001);
    if(bets.length>10000) fail(413,'הייצוא מוגבל ל־10,000 רשומות. יש לסנן לפי מערכת בחירות או משתמש');
    const cell=value=>{
        let text=value==null?'':String(value);
        if(typeof value==='string'&&/^[\s]*[=+@-]/.test(text))text="'"+text;
        return '"'+text.replace(/"/g,'""')+'"';
    };
    const rows=[['מזהה הימור','שם','אימייל','בחירות','ניקוד','מועד הגשה','הימור'],...bets.map(b=>[b._id,b.userId?.name,b.userId?.email,b.sessionId?.name,b.score,b.createdAt?.toISOString(),JSON.stringify(b.bets.map(p=>({partyId:p.partyId,predictedSeats:p.predictedSeats})))])];
    res.type('text/csv').set('Content-Disposition','attachment; filename="predictions.csv"').send('\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n'));
}));
async function update(type, doc, data, req, creating) {
    if(type==='polls') {
        const session=await Session.findById(data.sessionId);
        const date=new Date(data.pollDate+'T00:00:00.000Z');
        if(!session || !Number.isFinite(+date) || date.toISOString().slice(0,10)!==data.pollDate || date>new Date() || date>new Date(session.endDate))fail(400,'תאריך הסקר חייב להיות תקין, לא בעתיד ולא לאחר סגירת הבחירות');
        if(!creating && String(doc.sessionId)!==data.sessionId)fail(400,'לא ניתן להעביר סקר למערכת בחירות אחרת');
        if(await Poll.findOne({sessionId:data.sessionId,pollsterName:data.pollsterName,pollDate:date,_id:{$ne:doc._id}}))fail(409,'כבר קיים סקר של עורך זה בתאריך שנבחר');
        Object.assign(doc,{...data,pollDate:date});await doc.save();
    } else if(type==='sessions') {
        if(new Date(data.startDate)>=new Date(data.endDate)) fail(400,'מועד הפתיחה חייב להיות לפני הסגירה');
        if(await Session.findOne({slug:data.slug,_id:{$ne:doc._id}}).withArchived()) fail(409,'כתובת הבחירות כבר קיימת');
        Object.assign(doc,data);await doc.validate();await invalidate(doc._id);await doc.save();
    } else if(type==='parties') {
        if(data.minPredictedSeats>data.maxPredictedSeats) fail(400,'המינימום חייב להיות קטן או שווה למקסימום');
        if(!await Session.findById(data.sessionId)) fail(400,'מערכת הבחירות אינה זמינה');
        if(!creating && String(doc.sessionId)!==data.sessionId) fail(400,'לא ניתן להעביר מפלגה למערכת בחירות אחרת');
        Object.assign(doc,data);await doc.validate();await invalidate(doc.sessionId);await doc.save();
    } else if(type==='users') {
        if(String(doc._id)===req.tokenId && (data.role!==5 || data.disabled)) fail(400,'לא ניתן לשלול מעצמך הרשאות או לחסום את עצמך');
        const revoke=doc.role!==data.role || doc.disabled!==data.disabled || doc.email!==data.email;
        Object.assign(doc,data);if(revoke) doc.tokenVersion=(doc.tokenVersion||0)+1;
        await doc.save();
    } else if(type==='groups') {
        if(!await User.findById(data.creatorId)) fail(400,'היוצר אינו משתמש פעיל');
        if(creating) {doc.inviteCode=crypto.randomBytes(32).toString('hex');doc.inviteHash=crypto.createHash('sha256').update(doc.inviteCode).digest('hex');}
        Object.assign(doc,data);await doc.save();
        const closed=await Session.find({isClosed:true}).select('_id');
        await Membership.findOneAndUpdate({groupId:doc._id,userId:data.creatorId},{$set:{status:'active',archived:false},$setOnInsert:{joinedAt:new Date(),excludedSessionIds:closed.map(s=>s._id)}},{upsert:true,runValidators:true}).withArchived();
    } else if(type==='bets') {
        const valid=validatePrediction({sessionId:String(doc.sessionId),bets:data.bets});
        if(!valid) fail(400,'יש לחלק בדיוק 120 מנדטים שלמים');
        const parties=await Party.find({sessionId:doc.sessionId});
        const allowed=new Set(parties.map(p=>String(p._id)));
        if(Object.keys(data.bets).some(key=>!allowed.has(key)) || !isWithinPartyRanges(data.bets,parties) || Object.values(data.bets).some(n=>n>0&&n<4)) fail(400,'ההימור אינו עומד בטווחי המפלגות');
        doc.bets=Object.entries(data.bets).map(([partyId,predictedSeats])=>({partyId,predictedSeats}));
        doc.score=undefined;doc.place=undefined;await doc.validate();await invalidate(doc.sessionId);await doc.save();
    } else if(type==='memberships') {
        const group=await Group.findById(data.groupId);
        if(!group || group.deleted || !await User.findById(data.userId)) fail(400,'קבוצה או משתמש אינם זמינים');
        if(!creating && (String(doc.groupId)!==data.groupId || String(doc.userId)!==data.userId)) fail(400,'לא ניתן להעביר חברות לקבוצה או משתמש אחרים');
        if(String(group.creatorId)===data.userId && data.status!=='active') fail(400,'יוצר הקבוצה חייב להישאר חבר פעיל');
        if(creating || (data.status==='active'&&doc.status!=='active')) {
            doc.joinedAt=new Date();doc.excludedSessionIds=(await Session.find({isClosed:true}).select('_id')).map(s=>s._id);
        }
        Object.assign(doc,data);await doc.save();
    }
}
router.post('/:type',safe(async(req,res)=>{
    const {type}=req.params;
    if(!['sessions','parties','groups','memberships','polls'].includes(type)) fail(400,'יצירה אינה זמינה למסך זה');
    const data=validate(schemas[type],req.body),doc=new models[type]();
    await update(type,doc,data,req,true);res.status(201).json({item:view(type,doc)});
}));
router.patch('/:type/:id',safe(async(req,res)=>{
    const {type}=req.params;if(!models[type]) fail(404,'מסך לא נמצא');
    const data=validate(schemas[type],req.body),doc=await find(models[type],req.params.id);
    if(doc.archived) fail(400,'יש לשחזר את הרשומה לפני עריכה');
    await update(type,doc,data,req,false);res.json({item:view(type,doc)});
}));
router.post('/:type/:id/archive',safe(async(req,res)=>{
    const {type}=req.params;if(!models[type]) fail(404,'מסך לא נמצא');
    const {archived}=validate(Joi.object({archived:Joi.boolean().required()}).required(),req.body);
    const doc=await find(models[type],req.params.id);
    if(type==='users'&&String(doc._id)===req.tokenId) fail(400,'לא ניתן לארכב את המשתמש שלך');
    if(type==='memberships'&&archived) {
        const group=await Group.findById(doc.groupId).withArchived();
        if(group&&String(group.creatorId)===String(doc.userId)) fail(400,'יש לשנות את יוצר הקבוצה לפני הסרתו');
    }
    if(type==='parties'&&archived&&(await Bet.exists({sessionId:doc.sessionId,'bets.partyId':doc._id}) || await Result.exists({sessionId:doc.sessionId,'results.partyId':doc._id}) || await Poll.exists({sessionId:doc.sessionId,'predictions.partyId':doc._id}))) fail(409,'המפלגה משויכת להימורים, סקרים או תוצאות. ניתן לארכב את מערכת הבחירות כולה');
    doc.archived=archived;
    if(type==='users') doc.tokenVersion=(doc.tokenVersion||0)+1;
    if(type==='groups'&&!archived) doc.deleted=false;
    if(type==='bets') {doc.score=undefined;doc.place=undefined;}
    if(type==='sessions') await invalidate(doc._id);
    if(['parties','bets'].includes(type)) await invalidate(doc.sessionId);
    if(archived) {
        const changes={archived:true};
        if(type==='users')changes.tokenVersion=doc.tokenVersion;
        await models[type].updateOne({_id:doc._id},{$set:changes}).withArchived();
    } else await doc.save();
    res.json({archived});
}));
router.get('/sessions/:id/results',safe(async(req,res)=>{
    const session=await find(Session,req.params.id);
    res.json({result:await Result.findOne({sessionId:session._id}),parties:await Party.find({sessionId:session._id}).select('name chars')});
}));
router.get('/polls/:id/results',safe(async(req,res)=>{
    const poll=await find(Poll,req.params.id);
    res.json({poll:view('polls',poll),parties:await Party.find({sessionId:poll.sessionId}).select('name chars')});
}));
router.put('/polls/:id/results',safe(async(req,res)=>{
    const poll=await find(Poll,req.params.id);
    if(poll.archived||!await Session.findById(poll.sessionId))fail(400,'הסקר או מערכת הבחירות בארכיון');
    const data=validate(Joi.object({predictions:Joi.array().items(Joi.object({partyId:id,predictedSeats:seats})).min(1).max(120).required()}).required(),req.body);
    const parties=await Party.find({sessionId:poll.sessionId});
    if(!completePoll(data.predictions,parties))fail(400,'יש להזין את כל המפלגות ובסך הכול 120 מנדטים');
    poll.predictions=data.predictions;poll.completed=true;await poll.save();res.json({saved:true});
}));
router.put('/sessions/:id/results',safe(async(req,res)=>{
    const session=await find(Session,req.params.id);
    if(session.archived || new Date(session.endDate)>new Date()) fail(400,'ניתן להזין תוצאות רק לאחר סיום הבחירות');
    const data=validate(Joi.object({publishedAt:Joi.string().isoDate().required(),results:Joi.array().items(Joi.object({partyId:id,actualSeats:seats})).min(1).max(120).required()}).required(),req.body);
    const date=new Date(data.publishedAt);
    if(date<new Date(session.endDate)||date>new Date()) fail(400,'מועד הפרסום חייב להיות לאחר סגירת הבחירות ולא בעתיד');
    const parties=await Party.find({sessionId:session._id});
    const ids=new Set(parties.map(p=>String(p._id)));
    if(data.results.length!==ids.size || new Set(data.results.map(r=>r.partyId)).size!==ids.size || data.results.some(r=>!ids.has(r.partyId)) || data.results.reduce((sum,r)=>sum+r.actualSeats,0)!==120) fail(400,'התוצאות חייבות לכלול את כל המפלגות ולהסתכם ב־120 מנדטים');
    let result=await Result.findOne({sessionId:session._id});
    if(!result) result=new Result({sessionId:session._id});
    Object.assign(result,data);await result.validate();await invalidate(session._id);await result.save();res.json({saved:true});
}));
router.delete('/sessions/:id/results',safe(async(req,res)=>{
    const session=await find(Session,req.params.id);
    await invalidate(session._id);await Result.updateMany({sessionId:session._id},{$set:{archived:true}});res.json({archived:true});
}));
router.post('/sessions/:id/results/restore',safe(async(req,res)=>{
    const session=await find(Session,req.params.id);
    if(session.archived) fail(400,'יש לשחזר את מערכת הבחירות תחילה');
    if(await Result.findOne({sessionId:session._id})) fail(409,'כבר קיימות תוצאות פעילות');
    const result=await Result.findOne({sessionId:session._id,archived:true}).withArchived().sort({updatedAt:-1});
    if(!result) fail(404,'אין תוצאות בארכיון');
    result.archived=false;await result.validate();await invalidate(session._id);await result.save();res.json({restored:true});
}));
router.post('/sessions/:id/calculate',safe(async(req,res)=>{
    validate(id,req.params.id);
    try {res.json(await calculateWinners(req.params.id));}
    catch(e) {fail(400,'החישוב נכשל: יש לוודא שהבחירות הסתיימו, שהתוצאות מלאות ושכל ההימורים תקינים');}
}));
router.post('/sessions/:id/preview',safe(async(req,res)=>{
    validate(id,req.params.id);
    let preview;
    try {preview=await calculateWinners(req.params.id,{preview:true});}
    catch(e) {fail(400,'התצוגה המקדימה אינה זמינה. יש לבדוק את התוצאות וההימורים');}
    const users=await User.find({_id:{$in:preview.ranking.map(row=>row.userId)}}).withArchived().select('name');
    const names=new Map(users.map(u=>[String(u._id),u.name]));
    preview.ranking=preview.ranking.map(row=>({...row,name:names.get(row.userId)||'משתמש בארכיון'}));res.json(preview);
}));
module.exports=router;
