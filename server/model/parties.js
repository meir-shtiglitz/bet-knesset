const mongoose = require('mongoose');

const partiesSchema = new mongoose.Schema({
    sessionId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        require: true
    },
    name: String,
    chars: String,
    subtext: String,
    minPredictedSeats: {
        type: Number, default: 0, min: 0, max: 120, validate: Number.isInteger
    },
    maxPredictedSeats: {
        type: Number, default: 120, min: 0, max: 120,
        validate: [
            { validator: Number.isInteger, message: 'Maximum must be an integer' },
            { validator: function(value) { return value >= this.minPredictedSeats; }, message: 'Maximum must not be below minimum' }
        ]
    }
}, { timestamps: true });

module.exports = mongoose.model("Parties", partiesSchema);
