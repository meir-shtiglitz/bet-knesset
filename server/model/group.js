const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 500 },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    inviteHash: { type: String, required: true, select: false },
    inviteCode: { type: String, required: true, select: false },
    deleted: { type: Boolean, default: false }
}, { timestamps: true });
schema.index({ inviteHash: 1 }, { unique: true });
module.exports = mongoose.model('Group', schema);
