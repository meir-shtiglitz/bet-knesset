const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const SHA256 = require("crypto-js/sha256");

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    email:{
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
        unique: true
    },
    hashPasword:{
        type: String,
        required: true,
    },
    salt: String,
    role: {
        type:Number,
        default: 0
    }
},{timestamps:true})

userSchema.virtual('password').set(function(password) {
    this.salt=uuidv4();
    this.hashPasword = this.encryptPassword(password)
}).get( function() {
    // return password
})
userSchema.methods = {
    checkPassword: function(password){
        return this.encryptPassword(password) == this.hashPasword;
    },
    encryptPassword: function(password){
        if (!password) return '';
        try{
            return SHA256(password,this.salt);
        } catch (err){
            return err
        }
    }
}
// userSchema.virtual('password').set(function(password){
//     this._password=password;
//     this.salt=uuidv4();
//     this.hashed_password = this.encryptPassword(password)
// }).get(function(){
//     return this._password
// })

// userSchema.methods = {
//     encryptPassword: function(password){
//         if (!password) return '';
//         try{
//             return SHA256.createHmac('sha1',this.salt).update(password).digset('hex')
//         } catch (err){
//             return err
//         }
//     }
// }

module.exports = mongoose.model("User", userSchema)