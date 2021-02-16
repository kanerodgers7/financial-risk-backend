/*
* Module Imports
* */
const axios = require('axios');
const mongoose = require('mongoose');
const Organization = mongoose.model('organization');
const Insurer = mongoose.model('insurer');
const Policy = mongoose.model('policy');
const InsurerUser = mongoose.model('insurer-user');

/*
* Local Imports
* */
const Logger = require('../services/logger');

let getClients = ({searchKeyword}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let url = 'https://apiv4.reallysimplesystems.com/accounts';
            let query = {
                "name": {
                    "$con": searchKeyword
                },
                "type": "Client"
            };
            let organization = await Organization.findOne({isDeleted: false}).select({'integration.rss': 1});
            // console.log('ORG::', organization);
            let options = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: 'Bearer ' + organization.integration.rss.accessToken,
                },
                params: {
                    q: query,
                    limit: 100
                }
            };
            // console.log('options::', JSON.stringify(options, null, 2));
            let {data} = await axios(options);
            let clients = data.list.map(client => client.record);
            // console.log('DATA::', JSON.stringify(clients, null, 3));
            Logger.log.info("Successfully retrieved clients from RSS");
            return resolve(clients);
        } catch (err) {
            Logger.log.error("Error in getting clients from RSS");
            Logger.log.error(err.message || err);
            return reject(err);
        }
    });
};

let getInsurers = ({searchKeyword}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let url = 'https://apiv4.reallysimplesystems.com/accounts';
            let query = {
                "name": {
                    "$con": searchKeyword
                },
                "type": "Underwriter"
            };
            let organization = await Organization.findOne({isDeleted: false}).select({'integration.rss': 1});
            // console.log('ORG::', organization);
            let options = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: 'Bearer ' + organization.integration.rss.accessToken,
                },
                params: {
                    q: query,
                    limit: 100
                }
            };
            // console.log('options::', JSON.stringify(options, null, 2));
            let {data} = await axios(options);
            let insurers = data.list.map(insurer => insurer.record);
            console.log('DATA::', JSON.stringify(insurers, null, 3));
            Logger.log.info("Successfully retrieved insurers from RSS");
            return resolve(insurers);
        } catch (err) {
            Logger.log.error("Error in getting insurers from RSS");
            Logger.log.error(err.message || err);
            return reject(err);
        }
    });
};

let getClientById = ({clientId}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let url = 'https://apiv4.reallysimplesystems.com/accounts/' + clientId;
            let organization = await Organization.findOne({isDeleted: false}).select({'integration.rss': 1});
            let options = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: 'Bearer ' + organization.integration.rss.accessToken,
                },
            };
            let {data} = await axios(options);
            let client = {
                crmClientId: data.record['id'],
                name: data.record['name'],
                address: {
                    addressLine: data.record['addressline'],
                    city: data.record['addresscity'],
                    state: data.record['addresscounty/state'],
                    country: data.record['addresscountry'],
                    zipCode: data.record['addresspostcode/zip'],
                },
                crmNote: data.record['notes'],
                contactNumber: data.record['phone'],
                website: data.record['website'],
                abn: data.record['abn'],
                acn: data.record['acn'],
                sector: data.record['sector'],
                salesPerson: data.record['salesperson'],
                underWriter:data.record['underwriter'],
            };
            console.log('client::', JSON.stringify(client, null, 2));
            Logger.log.info("Successfully retrieved client from RSS");
            return resolve(client);
        } catch (err) {
            Logger.log.error("Error in getting client from RSS");
            Logger.log.error(err.message || err);
            return reject(err);
        }
    });
};

let getInsurerById = ({insurerId}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let url = 'https://apiv4.reallysimplesystems.com/accounts/' + insurerId;
            let organization = await Organization.findOne({isDeleted: false}).select({'integration.rss': 1});
            let options = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: 'Bearer ' + organization.integration.rss.accessToken,
                },
            };
            // console.log('options::', JSON.stringify(options, null, 2));
            let {data} = await axios(options);
            let insurer = data.record;
            console.log('insurer::', JSON.stringify(insurer, null, 2));
            Logger.log.info("Successfully retrieved insurer from RSS");
            return resolve(insurer);
        } catch (err) {
            Logger.log.error("Error in getting insurer from RSS");
            Logger.log.error(err.message || err);
            return reject(err);
        }
    });
};

let getPolicyById = ({policyId}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let url = 'https://apiv4.reallysimplesystems.com/policies/' + policyId;
            let organization = await Organization.findOne({isDeleted: false}).select({'integration.rss': 1});
            let options = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: 'Bearer ' + organization.integration.rss.accessToken,
                },
            };
            let {data} = await axios(options);
            Logger.log.info("Successfully retrieved policy from RSS");
            return resolve(data.record);
        } catch (err) {
            Logger.log.error("Error in getting policy from RSS");
            Logger.log.error(err.message || err);
            return reject(err);
        }
    });
};

let getClientContacts = ({clientId}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let url = 'https://apiv4.reallysimplesystems.com/accounts/' + clientId + '/contacts';
            let organization = await Organization.findOne({isDeleted: false}).select({'integration.rss': 1});
            let options = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: 'Bearer ' + organization.integration.rss.accessToken,
                },
            };
            let {data} = await axios(options);
            let contacts = [];
            data.list.forEach(crmContact => {
                let contact = {
                    firstName: crmContact.record['first'],
                    lastName: crmContact.record['last'],
                    jobTitle: crmContact.record['jobtitle'],
                    crmContactId: crmContact.record['id'],
                    email: crmContact.record['email'],
                    contactNumber: crmContact.record['phone'] ? crmContact.record['phone']: (crmContact.record['mobile'] ? crmContact.record['mobile'] :crmContact.record['direct'] ),
                    department: crmContact.record['department'],
                    hasLeftCompany: crmContact.record['leftcompany'],
                    isDecisionMaker: crmContact.record['decisionmaker'],
                };
                contacts.push(contact);
            });
            Logger.log.info("Successfully retrieved contacts from RSS");
            return resolve(contacts);
        } catch (err) {
            Logger.log.error("Error in getting contacts from RSS");
            Logger.log.error(err.message || err);
            return reject(err);
        }
    });
};

let getClientPolicies = ({clientId,insurerId,crmClientId,query={}}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const url = 'https://apiv4.reallysimplesystems.com/accounts/' + crmClientId + '/policies';
            const organization = await Organization.findOne({isDeleted: false}).select({'integration.rss': 1});
            const options = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: 'Bearer ' + organization.integration.rss.accessToken,
                },
            };
            if(query && Object.keys(query).length !== 0){
                options.params = {
                    q: query
                }
            }
            const {data} = await axios(options);
            let clientPolicies = [];
            data.list.forEach(crmPolicy => {
                clientPolicies.push({
                    insurerId:insurerId,
                    clientId:clientId,
                    crmPolicyId: crmPolicy.record['id'],
                    inceptionDate: crmPolicy.record['inceptiondate'],
                    expiryDate: crmPolicy.record['expirydate'],
                    product: crmPolicy.record['product'],
                    policyPeriod: crmPolicy.record['policyperiod'],
                    policyCurrency: crmPolicy.record['policycurrency'],
                });
            });
            Logger.log.info("Successfully retrieved policies from RSS");
            return resolve(clientPolicies);
        } catch (err) {
            Logger.log.error("Error in getting policies from RSS");
            Logger.log.error (err);
            return reject(err);
        }
    });
};

let getInsurerContacts = ({crmInsurerId,insurerId,page,limit,contacts = []}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let url = 'https://apiv4.reallysimplesystems.com/accounts/' + crmInsurerId + '/contacts?limit='+limit+'&page='+page;
            let organization = await Organization.findOne({isDeleted: false}).select({'integration.rss': 1});
            let options = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: 'Bearer ' + organization.integration.rss.accessToken,
                },
            };
            let {data} = await axios(options);
            data.list.forEach(crmContact => {
                let contact = {
                    insurerId:insurerId,
                    firstName: crmContact.record['first'],
                    lastName: crmContact.record['last'],
                    jobTitle: crmContact.record['jobtitle'],
                    crmContactId: crmContact.record['id'],
                    email: crmContact.record['email'],
                    contactNumber: crmContact.record['mobile'],
                    direct: crmContact.record['direct'],
                };
                contacts.push(contact);
            });
            if(data.metadata['has_more']){
                Logger.log.info('Fetch more records : ',contacts.length);
                await getInsurerContacts({crmInsurerId,insurerId,page:page+1,limit,contacts})
            }
            Logger.log.info("Successfully retrieved insurer contacts from RSS");
            return resolve(contacts);
        } catch (err) {
            Logger.log.error("Error in getting insurer contacts from RSS");
            Logger.log.error(err);
            return reject(err);
        }
    });
};

let fetchInsurerDetails = ({underwriterName,crmClientId,clientId}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let insurer = await Insurer.findOne({name : underwriterName});
            if(insurer){
                //TODO get client policies
                const policies = await Policy.find({clientId:clientId}).lean();
                if (policies && policies.length !== 0) {
                    return resolve(insurer)
                } else {
                    const clientPolicies = await getClientPolicies({insurerId:insurer._id,crmClientId,clientId});
                    let promiseArr = [];
                    clientPolicies.forEach(policy => {
                        const clientPolicy = new Policy(policy);
                        promiseArr.push(clientPolicy.save());
                    });
                    await Promise.all(promiseArr);
                }
                return resolve(insurer)
            } else {
                const data = await getInsurers({searchKeyword:underwriterName});
                const insurerData = {
                    crmInsurerId: data[0]['id'],
                    name: data[0]['name'],
                    address: {
                        addressLine: data[0]['addressline'],
                        city: data[0]['addresscity'],
                        state: data[0]['addresscounty/state'],
                        country: data[0]['addresscountry'],
                        zipCode: data[0]['addresspostcode/zip'],
                    },
                    contactNumber: data[0]['phone'],
                    website: data[0]['website'],
                };
                insurer = new Insurer(insurerData);
                await insurer.save();
                const clientPolicies = await getClientPolicies({insurerId:insurer._id,crmClientId,clientId});
                let promiseArr = [];
                clientPolicies.forEach(policy => {
                    const clientPolicy = new Policy(policy);
                    promiseArr.push(clientPolicy.save());
                });
                const insurerContacts = await getInsurerContacts({crmInsurerId:insurer.crmInsurerId,insurerId:insurer._id,contacts:[],page:1,limit:50});
                let promises = [];
                insurerContacts.forEach(contact => {
                    const insurerContact = new InsurerUser(contact);
                    promises.push(insurerContact.save());
                });
                await Promise.all(promiseArr);
                await Promise.all(promises);
                return resolve(insurer);
            }
        } catch (err) {
            Logger.log.error("Error in fetch insurers details ");
            Logger.log.error(err.message || err);
            return reject(err);
        }
    });
};

// getClientContacts({clientId: 9});

module.exports = {
    getClients, getInsurers, getClientById, getPolicyById, getClientContacts, getClientPolicies, fetchInsurerDetails, getInsurerContacts
};
