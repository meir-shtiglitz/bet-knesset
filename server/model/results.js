const mongoose = require('mongoose');

const resultsSchema = new mongoose.Schema({
    sessionId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        require: true
    },
    results: [
        {
            partyId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Parties',
                require: true
            },
            actualSeats: Number
        }
    ],
    publishedAt: Date
}, { timestamps: true });

module.exports = mongoose.model("Results", resultsSchema);