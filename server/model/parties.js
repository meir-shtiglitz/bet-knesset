const mongoose = require('mongoose');

const partiesSchema = new mongoose.Schema({
    sessionId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        require: true
    },
    name: String,
    chars: String,
    subtext: String
}, { timestamps: true });

module.exports = mongoose.model("Parties", partiesSchema);