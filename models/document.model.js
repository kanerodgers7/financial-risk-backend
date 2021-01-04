/*
* Module Imports
* */
const mongoose = require('mongoose');
const pagination = require('mongoose-paginate');
const Schema = mongoose.Schema;

/**
 * Schema Definition
 */
const documentSchema = new Schema(
    {
        documentTypeId: {type: Schema.Types.ObjectId, ref: 'document-type'},
        description: {type: Schema.Types.String},
        fileName: {type: Schema.Types.String},
        uploadByType: {type: Schema.Types.String, enum: ['user', 'client']},
        uploadById: {type: Schema.Types.ObjectId},
        isDeleted: {type: Schema.Types.Boolean, default: false},
    },
    {timestamps: true},
);

documentSchema.plugin(pagination);

/**
 * Export Schema
 */
module.exports = mongoose.model('document', documentSchema);