const mongoose = require('mongoose');

const mailsSchema = new mongoose.Schema({
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        trim: true,
        require: true,
    },
    name: {
        type: String,
        trim: true,
        require: true
    },
    emails: [
        {email: {
            type: String,
            trim: true,
            unique: true
        }}
    ]
},{timestamps: true});

module.exports = mongoose.model("Mails", mailsSchema);