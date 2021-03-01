/*
 * Module Imports
 * */
const express = require('express');
const router = express.Router();
let mongoose = require('mongoose');
let Note = mongoose.model('note');
const ClientDebtor = mongoose.model('client-debtor');
const Application = mongoose.model('application');

/*
 * Local Imports
 * */
const Logger = require('./../services/logger');

/**
 * Get Note List
 */
router.get('/:entityId', async function (req, res) {
  if (!req.user || !req.user._id) {
    return res.status(401).send({
      status: 'ERROR',
      messageCode: 'UNAUTHORIZED',
      message: 'Please first login to get list.',
    });
  }
  if (
    !req.query.noteFor ||
    !req.params.entityId ||
    !mongoose.Types.ObjectId.isValid(req.params.entityId)
  ) {
    return res.status(400).send({
      status: 'ERROR',
      messageCode: 'REQUIRE_FIELD_MISSING',
      message: 'Require fields are missing',
    });
  }
  try {
    let query;
    let aggregationQuery = [];
    let sortingOptions = {};
    req.query.sortBy = req.query.sortBy || '_id';
    req.query.sortOrder = req.query.sortOrder || 'desc';
    req.query.limit = req.query.limit || 5;
    req.query.page = req.query.page || 1;
    sortingOptions[req.query.sortBy] = req.query.sortOrder === 'desc' ? -1 : 1;

    if (req.query.noteFor === 'application') {
      const application = await Application.findOne({
        _id: req.params.entityId,
      });
      query = {
        $and: [
          {
            noteFor: req.query.noteFor,
            entityId: mongoose.Types.ObjectId(req.params.entityId),
          },
          {
            $or: [
              {
                createdByType: 'client-user',
                createdById: mongoose.Types.ObjectId(application.clientId),
              },
              { createdByType: 'user', isPublic: true },
              {
                createdByType: 'user',
                createdById: mongoose.Types.ObjectId(req.user._id),
              },
            ],
          },
        ],
      };
    } else if (req.query.noteFor === 'debtor') {
      const [applications, debtor] = await Promise.all([
        Application.find({ debtorId: req.params.entityId }).lean(),
        ClientDebtor.findOne({ _id: req.params.entityId }).lean(),
      ]);
      const applicationIds = applications.map((i) => i._id);
      query = {
        $and: [
          {
            noteFor: req.query.noteFor,
            entityId: mongoose.Types.ObjectId(req.params.entityId),
          },
          {
            noteFor: 'application',
            entityId: { $in: applicationIds },
          },
          {
            $or: [
              {
                createdByType: 'client-user',
                createdById: mongoose.Types.ObjectId(debtor.clientId),
              },
              { createdByType: 'user', isPublic: true },
              {
                createdByType: 'user',
                createdById: mongoose.Types.ObjectId(req.user._id),
              },
            ],
          },
        ],
      };
    } else if (req.query.noteFor === 'client') {
      query = {
        $and: [
          {
            noteFor: req.query.noteFor,
            entityId: mongoose.Types.ObjectId(req.params.entityId),
          },
          {
            $or: [
              { createdByType: 'user', isPublic: true },
              {
                createdByType: 'user',
                createdById: mongoose.Types.ObjectId(req.user._id),
              },
            ],
          },
        ],
      };
    }

    aggregationQuery.push(
      {
        $addFields: {
          clientUserId: {
            $cond: [
              { $eq: ['$createdByType', 'client-user'] },
              '$createdById',
              null,
            ],
          },
          userId: {
            $cond: [{ $eq: ['$createdByType', 'user'] }, '$createdById', null],
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
        },
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientUserId',
          foreignField: '_id',
          as: 'clientUserId',
        },
      },
      {
        $addFields: {
          createdById: {
            $cond: [
              { $eq: ['$createdByType', 'client-user'] },
              '$clientUserId.name',
              '$userId.name',
            ],
          },
        },
      },
    );

    aggregationQuery.push({
      $project: {
        _id: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        createdById: 1,
      },
    });
    aggregationQuery.push({ $sort: sortingOptions });

    aggregationQuery.push({
      $skip: (parseInt(req.query.page) - 1) * parseInt(req.query.limit),
    });
    aggregationQuery.push({ $limit: parseInt(req.query.limit) });

    if (req.query.search) {
      query.description = { $regex: `${req.query.search}` };
    }
    aggregationQuery.unshift({ $match: query });

    const [notes, total] = await Promise.all([
      Note.aggregate(aggregationQuery).allowDiskUse(true),
      Note.countDocuments(query).lean(),
    ]);
    const headers = [
      {
        name: 'description',
        label: 'Description',
        type: 'string',
      },
      {
        name: 'createdAt',
        label: 'Created Date',
        type: 'Date',
      },
      {
        name: 'updatedAt',
        label: 'Modified Date',
        type: 'Date',
      },
      {
        name: 'createdById',
        label: 'CreatedBy',
        type: 'string',
      },
    ];
    notes.forEach((note) => {
      note.createdById =
        note.createdById && note.createdById[0] ? note.createdById[0] : '';
    });
    res.status(200).send({
      status: 'SUCCESS',
      data: {
        docs: notes,
        headers,
        total,
        page: parseInt(req.query.page),
        limit: parseInt(req.query.limit),
        pages: Math.ceil(total / parseInt(req.query.limit)),
      },
    });
  } catch (e) {
    Logger.log.error('Error occurred in get note list ', e);
    res.status(500).send({
      status: 'ERROR',
      message: e.message || 'Something went wrong, please try again later.',
    });
  }
});

/**
 * Create Note
 */
router.post('/', async function (req, res) {
  if (
    !req.body.noteFor ||
    !req.body.entityId ||
    !req.body.description ||
    !req.body.hasOwnProperty('isPublic')
  ) {
    return res.status(400).send({
      status: 'ERROR',
      messageCode: 'REQUIRE_FIELD_MISSING',
      message: 'Require fields are missing',
    });
  }
  try {
    const note = new Note({
      noteFor: req.body.noteFor,
      entityId: req.body.entityId,
      description: req.body.description,
      isPublic: req.body.isPublic,
      createdByType: 'user',
      createdById: req.user._id,
    });
    await note.save();
    res
      .status(200)
      .send({ status: 'SUCCESS', message: 'Note created successfully' });
  } catch (e) {
    Logger.log.error('Error occurred in create note ', e.message || e);
    res.status(500).send({
      status: 'ERROR',
      message: e.message || 'Something went wrong, please try again later.',
    });
  }
});

/**
 * Update Note
 */
router.put('/:noteId', async function (req, res) {
  if (
    !req.params.noteId ||
    !mongoose.Types.ObjectId.isValid(req.params.noteId) ||
    Object.keys(req.body).length === 0
  ) {
    return res.status(400).send({
      status: 'ERROR',
      messageCode: 'REQUIRE_FIELD_MISSING',
      message: 'Require fields are missing',
    });
  }
  try {
    let updateObj = {};
    if (req.body.description) updateObj.description = req.body.description;
    if (req.body.hasOwnProperty('isPublic'))
      updateObj.isPublic = req.body.isPublic;
    await Note.updateOne({ _id: req.params.noteId }, updateObj);
    res
      .status(200)
      .send({ status: 'SUCCESS', message: 'Note updated successfully' });
  } catch (e) {
    Logger.log.error('Error occurred in updating note ', e.message || e);
    res.status(500).send({
      status: 'ERROR',
      message: e.message || 'Something went wrong, please try again later.',
    });
  }
});

/**
 * Delete Note
 */
router.delete('/:noteId', async function (req, res) {
  if (
    !req.params.noteId ||
    !mongoose.Types.ObjectId.isValid(req.params.noteId)
  ) {
    return res.status(400).send({
      status: 'ERROR',
      messageCode: 'REQUIRE_FIELD_MISSING',
      message: 'Require fields are missing',
    });
  }
  try {
    await Note.updateOne({ _id: req.params.noteId }, { isDeleted: true });
    res
      .status(200)
      .send({ status: 'SUCCESS', message: 'Note deleted successfully' });
  } catch (e) {
    Logger.log.error('Error occurred while deleting note ', e.message || e);
    res.status(500).send({
      status: 'ERROR',
      message: e.message || 'Something went wrong, please try again later.',
    });
  }
});

/**
 * Export Router
 */
module.exports = router;
