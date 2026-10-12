// Archived documents remain recoverable but disappear from public queries.
module.exports = function archive(schema) {
    schema.add({ archived: { type: Boolean, default: false } });
    schema.query.withArchived = function() { this.options.includeArchived = true; return this; };
    for (const operation of ['find', 'findOne', 'countDocuments', 'findOneAndUpdate', 'updateOne', 'updateMany']) {
        schema.pre(operation, function() {
            const include = this.getOptions().includeArchived;
            delete this.options.includeArchived;
            if (!include) this.where({ archived: { $ne: true } });
        });
    }
};
