const mongoose = require('mongoose');

const betsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        require: true,
        unique: true
    },
    bets: Object,
    place: {
        type: Number,
    },
    score: {
        type: Number
    }
}, { timestamps: true });

module.exports = mongoose.model("Bets", betsSchema);