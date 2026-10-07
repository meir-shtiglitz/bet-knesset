const mongoose = require('mongoose');

const betsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sessions',
        required: true
    },
    bets: [
        {
            partyId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Parties',
                required: true
            },
            predictedSeats: { type: Number, required: true, min: 0, max: 120, validate: Number.isInteger }
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
}, { timestamps: true, autoIndex: true });
betsSchema.path('bets').validate(function(bets) {
    return bets.length > 0 && bets.length <= 120 &&
        bets.reduce((sum, bet) => sum + bet.predictedSeats, 0) === 120 &&
        new Set(bets.map(bet => String(bet.partyId))).size === bets.length;
}, 'Invalid prediction allocation');
betsSchema.index({ userId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model("Bets", betsSchema);