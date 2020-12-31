/*
* Module Imports
* */
const mongoose = require('mongoose');
const pagination = require('mongoose-paginate');
const Schema = mongoose.Schema;

/**
 * Schema Definition
 */
const notificationSchema = new Schema(
    {
        isRead: {type: Schema.Types.Boolean},
        userType: {type: Schema.Types.String, enum: ['user', 'client']},
        userId: {type: Schema.Types.ObjectId},
        isDeleted: {type: Schema.Types.Boolean, default: false},
    },
    {timestamps: true},
);

notificationSchema.plugin(pagination);

/**
 * Export Schema
 */
module.exports = mongoose.model('notification', notificationSchema);
