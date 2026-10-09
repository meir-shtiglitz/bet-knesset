const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['active', 'left', 'blocked'], required: true },
    joinedAt: { type: Date, required: true },
    excludedSessionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sessions' }]
}, { timestamps: true });
schema.index({ groupId: 1, userId: 1 }, { unique: true });
schema.index({ userId: 1, status: 1 });
module.exports = mongoose.model('GroupMembership', schema);
