/*
* Module Imports
* */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('user');
const Policy = mongoose.model('policy');
const Client = mongoose.model('client');
const AuditLog = mongoose.model('audit-log');
const {getClientPolicies} = require('./../helper/rss.helper');

/*
* Local Imports
* */
const Logger = require('./../services/logger');
const StaticFile = require('./../static-files/moduleColumn');

/**
 * Get Column Names
 */
router.get('/column-name',async function (req,res) {
    if (!req.user || !req.user._id) {
        return res.status(401).send({status: 'ERROR', messageCode:'UNAUTHORIZED', message: 'Please first login to get columns.'});
    }
    if (!req.query.columnFor) {
        return res.status(400).send({status: 'ERROR',  messageCode:'REQUIRE_FIELD_MISSING', message: 'Require field is missing.'});
    }
    try {
        const module = StaticFile.modules.find(i => i.name === req.query.columnFor);
        const policyColumn = req.user.manageColumns.find(i => i.moduleName === req.query.columnFor);
        if(!module || !module.manageColumns || module.manageColumns.length === 0){
            return res.status(400).send({status: 'ERROR',  messageCode:'BAD_REQUEST', message: 'Please pass correct fields'});
        }
        let customFields = [];
        let defaultFields = [];
        for (let i = 0; i < module.manageColumns.length; i++) {
            if(policyColumn && policyColumn.columns.includes(module.manageColumns[i].name)){
                if(module.defaultColumns.includes(module.manageColumns[i].name)){
                    defaultFields.push({name:module.manageColumns[i].name,label:module.manageColumns[i].label,isChecked:true});
                } else {
                    customFields.push({name:module.manageColumns[i].name,label:module.manageColumns[i].label,isChecked:true});
                }
            } else {
                if(module.defaultColumns.includes(module.manageColumns[i].name)){
                    defaultFields.push({name:module.manageColumns[i].name,label:module.manageColumns[i].label,isChecked:false});
                } else {
                    customFields.push({name:module.manageColumns[i].name,label:module.manageColumns[i].label,isChecked:false});
                }
            }
        }
        res.status(200).send({status: 'SUCCESS', data: {defaultFields,customFields}});
    } catch (e) {
        Logger.log.error('Error occurred in get debtor column names', e.message || e);
        res.status(500).send({status: 'ERROR', message: e.message || 'Something went wrong, please try again later.'});
    }
});

/**
 * List Client Policies
 */
router.get('/client/:clientId',async function (req,res) {
    if (!req.user || !req.user._id) {
        return res.status(401).send({status: 'ERROR', messageCode:'UNAUTHORIZED', message: 'Please first login to get list.'});
    }
    if (!req.params.clientId) {
        Logger.log.error('Client id not found.');
        return res.status(400).send({status: 'ERROR',  messageCode:'REQUIRE_FIELD_MISSING', message: 'Please pass client id.'});
    }
    try {
        const module = StaticFile.modules.find(i => i.name === 'policy');
        const policyColumn = req.user.manageColumns.find(i => i.moduleName === 'policy');
        let queryFilter = {
            isDeleted: false,
            clientId:req.params.clientId
        };
        let sortingOptions = {};
        if(req.query.sortBy && req.query.sortOrder){
            sortingOptions[req.query.sortBy] = req.query.sortOrder
        }
        if (req.query.search) queryFilter.name = {$regex: req.query.search, $options: 'i'};
        let option = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 5,
        };
        option.select = policyColumn.columns.toString().replace(/,/g, ' ');
        option.sort = sortingOptions;
        option.lean = true;
        let responseObj = await Policy.paginate(queryFilter, option);
        responseObj.headers = [];
        for (let i = 0; i < module.manageColumns.length; i++) {
            if(policyColumn.columns.includes(module.manageColumns[i].name)){
                responseObj.headers.push(module.manageColumns[i])
            }
        }
        res.status(200).send({status: 'SUCCESS', data: responseObj});
    } catch (e) {
        Logger.log.error('Error occurred in get insurer list ', e.message || e);
        res.status(500).send({status: 'ERROR', message: e.message || 'Something went wrong, please try again later.'});
    }
});

/**
 * List CI Policies
 */
router.get('/:insurerId',async function (req,res) {
    if (!req.params.insurerId) {
        Logger.log.error('Insurer id not found.');
        return res.status(400).send({status: 'ERROR',  messageCode:'REQUIRE_FIELD_MISSING', message: 'Please pass insurer id.'});
    }
    try {
        let queryFilter = {
            isDeleted: false,
            insurerId:req.params.insurerId
        };
        switch (req.query.columnFor) {
            case 'insurer-policy':
                queryFilter.product = {$regex:'.*Credit Insurance.*'};
                break;
            case 'insurer-matrix':
                queryFilter.product = {$regex:'.*Risk Management Package.*'};
                break;
            default:
                return res.status(400).send({status: 'ERROR',  messageCode:'BAD_REQUEST', message: 'Please pass correct fields'});
        }
        const module = StaticFile.modules.find(i => i.name === req.query.columnFor);
        const policyColumn = req.user.manageColumns.find(i => i.moduleName === req.query.columnFor);
        let sortingOptions = {};
        if(req.query.sortBy && req.query.sortOrder){
            sortingOptions[req.query.sortBy] = req.query.sortOrder
        }
        if (req.query.search) queryFilter.name = {$regex: req.query.search, $options: 'i'};
        let option = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 5,
        };
        option.select = policyColumn.columns.toString().replace(/,/g, ' ');
        option.sort = sortingOptions;
        option.lean = true;
        let responseObj = await Policy.paginate(queryFilter, option);
        responseObj.headers = [];
        for (let i = 0; i < module.manageColumns.length; i++) {
            if(policyColumn.columns.includes(module.manageColumns[i].name)){
                responseObj.headers.push(module.manageColumns[i])
            }
        }
        res.status(200).send({status: 'SUCCESS', data: responseObj});
    } catch (e) {
        Logger.log.error('Error occurred in get insurer list ', e.message || e);
        res.status(500).send({status: 'ERROR', message: e.message || 'Something went wrong, please try again later.'});
    }
});

/**
 * List RMP Policies
 */
router.get('/rmp/:insurerId',async function (req,res) {
    if (!req.params.insurerId) {
        Logger.log.error('Insurer id not found.');
        return res.status(400).send({status: 'ERROR',  messageCode:'REQUIRE_FIELD_MISSING', message: 'Please pass insurer id.'});
    }
    try {
        const module = StaticFile.modules.find(i => i.name === 'policy');
        const policyColumn = req.user.manageColumns.find(i => i.moduleName === 'policy');
        let queryFilter = {
            isDeleted: false,
            product:{$regex:'.*Risk Management Package.*'},
            insurerId:req.params.insurerId
        };
        let sortingOptions = {};
        if(req.query.sortBy && req.query.sortOrder){
            sortingOptions[req.query.sortBy] = req.query.sortOrder
        }
        if (req.query.search) queryFilter.name = {$regex: req.query.search, $options: 'i'};
        let option = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 5,
        };
        option.select = policyColumn.columns.toString().replace(/,/g, ' ');
        option.sort = sortingOptions;
        option.lean = true;
        let responseObj = await Policy.paginate(queryFilter, option);
        responseObj.headers = [];
        for (let i = 0; i < module.manageColumns.length; i++) {
            if(policyColumn.columns.includes(module.manageColumns[i].name)){
                responseObj.headers.push(module.manageColumns[i])
            }
        }
        res.status(200).send({status: 'SUCCESS', data: responseObj});
    } catch (e) {
        Logger.log.error('Error occurred in get insurer list ', e.message || e);
        res.status(500).send({status: 'ERROR', message: e.message || 'Something went wrong, please try again later.'});
    }
});

/**
 * Update Column Names
 */
router.put('/column-name',async function (req,res) {
    if (!req.user || !req.user._id) {
        Logger.log.error('User data not found in req');
        return res.status(401).send({status: 'ERROR', messageCode:'UNAUTHORIZED', message: 'Please first login to update columns.'});
    }
    if (!req.body.hasOwnProperty('isReset') || !req.body.columns || !req.body.columnFor) {
        Logger.log.error('Require fields are missing');
        return res.status(400).send({status: 'ERROR', messageCode:'REQUIRE_FIELD_MISSING', message: 'Something went wrong, please try again.'});
    }
    try {
        let updateColumns = [];
        let module;
        switch (req.body.columnFor) {
            case 'insurer-policy':
                if(req.body.isReset){
                    module = StaticFile.modules.find(i => i.name === req.body.columnFor);
                    updateColumns = module.defaultColumns;
                } else {
                    updateColumns = req.body.columns;
                }
                break;
            case 'insurer-matrix':
                if(req.body.isReset){
                    module = StaticFile.modules.find(i => i.name === req.body.columnFor);
                    updateColumns = module.defaultColumns;
                } else {
                    updateColumns = req.body.columns;
                }
                break;
            case 'client-policy':
                if(req.body.isReset){
                    module = StaticFile.modules.find(i => i.name === req.body.columnFor);
                    updateColumns = module.defaultColumns;
                } else {
                    updateColumns = req.body.columns;
                }
                break;
            default:
                return res.status(400).send({status: 'ERROR',  messageCode:'BAD_REQUEST', message: 'Please pass correct fields'});
        }
        await User.updateOne({_id:req.user._id,'manageColumns.moduleName':req.body.columnFor},{$set:{'manageColumns.$.columns':updateColumns}});
        res.status(200).send({status: 'SUCCESS', message:'Columns updated successfully'});
    } catch (e) {
        Logger.log.error('Error occurred in update column names', e.message || e);
        res.status(500).send({status: 'ERROR', message: e.message || 'Something went wrong, please try again later.'});
    }
});

/**
 * Sync Policies from RSS - Update
 */
router.put('/sync-from-crm/:insurerId', async function (req, res) {
    if (!req.params.insurerId || !req.query.columnFor) {
        Logger.log.error('Insurer id not found.');
        return res.status(400).send({status: 'ERROR',  messageCode:'REQUIRE_FIELD_MISSING', message: 'Require fields are missing'});
    }
    try {
        let query;
        switch (req.query.columnFor) {
            case 'insurer-policy':
                query = {"product": {"$con": "Credit Insurance"}};
                break;
            case 'insurer-matrix':
                query = {"product": {"$con": "Risk Management Package"}};
                break;
            default:
                return res.status(400).send({status: 'ERROR',  messageCode:'BAD_REQUEST', message: 'Please pass correct fields'});
        }
        const policies = await Policy.aggregate([
            {$match: {insurerId: mongoose.Types.ObjectId(req.params.insurerId)}},
            {
                $lookup: {
                    from: 'clients',
                    localField: 'clientId',
                    foreignField: '_id',
                    as: 'client',
                },
            },
            {$group:{_id:'$clientId',crmClientId:{$first:'$client.crmClientId'}}}]).allowDiskUse(true);
        if(!policies || policies.length === 0){
            Logger.log.error('No Policies found', req.params.insurerId);
            return res.status(400).send({status: 'ERROR', messageCode:'POLICY_NOT_FOUND', message: 'Policies not found.'});
        }
        console.log('Total Clients : ',policies.length);
        let policiesFromCrm;
        let promiseArr = [];
        for (let i = 0; i < policies.length; i++) {
            policiesFromCrm = await getClientPolicies({clientId:policies[i]._id,crmClientId:policies[i].crmClientId[0],insurerId:req.params.insurerId,query:query});
            policiesFromCrm.forEach(crmPolicy => {
                promiseArr.push(Policy.updateOne({crmPolicyId: crmPolicy.crmPolicyId, isDeleted: false}, crmPolicy, {upsert: true}));
            });
        }
        await Promise.all(promiseArr);
        await AuditLog.create({
            entityType: 'policy',
            entityRefId: req.params.insurerId,
            userType: 'user',
            userRefId: req.user._id,
            actionType: 'sync',
            logDescription: req.query.columnFor === 'insurer-policy' ? 'Insurer policies synced successfully.': 'Insurer matrix synced successfully.'
        });
        res.status(200).send({status: 'SUCCESS', message: 'Policies synced successfully'});
    } catch (e) {
        Logger.log.error('Error occurred in sync insurer policies ', e.message || e);
        res.status(500).send({status: 'ERROR', message: e.message || 'Something went wrong, please try again later.'});
    }
});

/**
 * Sync Clients Policies from RSS - Update
 */
router.put('/client/sync-from-crm/:clientId', async function (req, res) {
    try {
        if (!req.params.clientId) {
            return res.status(400).send({status: 'ERROR',  messageCode:'REQUIRE_FIELD_MISSING', message: 'Please pass client id.'});
        }
        const policies = await Policy.aggregate([
            {$match: {clientId: mongoose.Types.ObjectId(req.params.clientId)}},
            {
                $lookup: {
                    from: 'clients',
                    localField: 'clientId',
                    foreignField: '_id',
                    as: 'client',
                },
            },
            {$group:{_id:'$clientId',crmClientId:{$first:'$client.crmClientId'}}}]).allowDiskUse(true);
        console.log('policies : ',policies);
        if(!policies || policies.length === 0){
            Logger.log.error('No Policies found', req.params.insurerId);
            return res.status(400).send({status: 'ERROR', messageCode:'POLICY_NOT_FOUND', message: 'Policies not found.'});
        }
        console.log('Total Policies : ',policies.length);
        let policiesFromCrm;
        let promiseArr = [];
        for (let i = 0; i < policies.length; i++) {
            policiesFromCrm = await getClientPolicies({clientId:policies[i]._id,crmClientId:policies[i].crmClientId[0],insurerId:req.params.insurerId});
            policiesFromCrm.forEach(crmPolicy => {
                promiseArr.push(Policy.updateOne({crmPolicyId: crmPolicy.crmPolicyId, isDeleted: false}, crmPolicy, {upsert: true}));
            });
        }
        await Promise.all(promiseArr);
        await AuditLog.create({
            entityType: 'policy',
            entityRefId: req.params.clientId,
            userType: 'user',
            userRefId: req.user._id,
            actionType: 'sync',
            logDescription: 'Client policies synced successfully.'
        });
        res.status(200).send({status: 'SUCCESS', message: 'Policies synced successfully'});
    } catch (e) {
        Logger.log.error('Error occurred in sync insurer contacts ', e.message || e);
        res.status(500).send({status: 'ERROR', message: e.message || 'Something went wrong, please try again later.'});
    }
});

/**
 * Export Router
 */
module.exports = router;
