const mongoose = require('mongoose');

const sessionsSchema = new mongoose.Schema({
    slug: String,
    name: String,
    description: String,
    startDate: Date,
    endDate: Date,
    isClosed: Boolean,
}, { timestamps: true });

module.exports = mongoose.model("Sessions", sessionsSchema);

