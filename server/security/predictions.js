const Joi = require('joi');
const objectId = Joi.string().pattern(/^[a-f0-9]{24}$/);
const predictionSchema = Joi.object({
    sessionId: objectId.required(),
    bets: Joi.object().pattern(/^[a-f0-9]{24}$/, Joi.number().integer().min(0).max(120)).min(1).max(120).required()
}).required();
function validatePrediction(body) {
    const { error, value } = predictionSchema.validate(body, { convert: false });
    if (error || Object.values(value.bets).reduce((sum, seats) => sum + seats, 0) !== 120) return null;
    return value;
}
function isOpen(session, now = Date.now()) {
    if (!session || session.isClosed !== false || !session.startDate || !session.endDate) return false;
    const start = new Date(session.startDate).getTime();
    const end = new Date(session.endDate).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && start < end && start <= now && now < end;
}
module.exports = { validatePrediction, isOpen };
