const express=require('express');
const Joi=require('joi');
const Session=require('../model/sessions');
const Party=require('../model/parties');
const Poll=require('../model/poll');
const Result=require('../model/results');
const {competition}=require('../security/polls');
const {rateLimit}=require('../security/rate-limit');
const router=express.Router();
router.get('/:sessionId',rateLimit({limit:120}),async(req,res)=>{
    const input=Joi.object({sessionId:Joi.string().pattern(/^[a-f0-9]{24}$/).required(),date:Joi.string().pattern(/^(latest|\d{4}-\d{2}-\d{2})$/).default('latest')}).validate({...req.query,sessionId:req.params.sessionId},{convert:false});
    if(input.error)return res.status(400).json({error:'בקשת סקרים לא תקינה'});
    try {
        const session=await Session.findById(input.value.sessionId);
        if(!session)return res.status(404).json({error:'מערכת הבחירות לא נמצאה'});
        const parties=await Party.find({sessionId:input.value.sessionId}).select('name chars').sort({_id:1}).limit(121);
        const polls=await Poll.find({sessionId:input.value.sessionId,completed:true}).select('pollsterName pollDate color predictions').sort({pollDate:-1,_id:-1}).limit(1001).lean();
        if(parties.length>120||polls.length>1000)return res.status(503).json({error:'כמות הסקרים גדולה מדי להצגה'});
        let result=await Result.findOne({sessionId:input.value.sessionId}).select('results publishedAt');
        if(result&&(!(new Date(result.publishedAt)>=new Date(session.endDate))||new Date(result.publishedAt)>new Date()))result=null;
        const data=competition(polls,parties,result,input.value.date);
        res.json({parties,...data});
    }catch(e){res.status(503).json({error:'לא ניתן לטעון את תחרות הסוקרים'});}
});
module.exports=router;
