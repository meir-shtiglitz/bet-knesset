const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    sessionId: {type:mongoose.Schema.Types.ObjectId,ref:'Sessions',required:true},
    pollsterName: {type:String,trim:true,required:true,maxlength:100},
    pollsterKey: {type:String,select:false},
    pollDate: {type:Date,required:true},
    color: {type:String,required:true,match:/^#[0-9a-fA-F]{6}$/},
    completed: {type:Boolean,default:false},
    predictions: [{partyId:{type:mongoose.Schema.Types.ObjectId,ref:'Parties',required:true},predictedSeats:{type:Number,min:0,max:120,required:true,validate:Number.isInteger}}]
},{timestamps:true});
schema.plugin(require('./archive'));
schema.pre('validate',function(){this.pollsterKey=this.pollsterName?.trim().toLocaleLowerCase('he');});
schema.index({sessionId:1,pollsterName:1,pollDate:-1});
schema.index({sessionId:1,pollsterKey:1,pollDate:1},{unique:true,partialFilterExpression:{archived:false}});
module.exports=mongoose.model('Poll',schema);
