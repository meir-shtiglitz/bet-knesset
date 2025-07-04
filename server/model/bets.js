const mongoose = require('mongoose');

const betsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        require: true
    },
    sessionId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        require: true
    },
    bets: [
        {
            partyId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Parties',
                require: true
            },
            predictedSeats: Number
        }
    ],
    place: {
        type: Number,
    },
    score: {
        type: Number
    },
    createdAt: Date,
    updatedAt: Date
}, { timestamps: true });

module.exports = mongoose.model("Bets", betsSchema);