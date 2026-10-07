const mongoose = require('mongoose');
const { hashPassword, verifyPassword } = require('../security/passwords');

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
    tokenVersion: { type: Number, default: 0 },
    disabled: { type: Boolean, default: false },
    resetTokenHash: { type: String, select: false },
    resetExpiresAt: { type: Date, select: false },
    resetRequestedAt: { type: Date, select: false },
    role: {
        type:Number,
        default: 0
    }
},{timestamps:true})

userSchema.methods.setPassword = async function(password) {
    this.hashPasword = await hashPassword(password);
};
userSchema.methods.checkPassword = function(password) {
    return verifyPassword(password, this.hashPasword);
};

module.exports = mongoose.model("User", userSchema);
