const { ObjectId } = require('mongoose').Types;
const Session = require('../model/sessions');
const Party = require('../model/parties');
const Result = require('../model/results');
const partiesJson = require('./parties.json');

const addSession = async () => {
    const session = await new Session({
        slug: 'election00',
        name: 'בחירות לכנסת בדיקה',
        description: '',
        startDate: new Date('2022-08-01'),
        endDate: new Date('2025-11-01'),
        isClosed: false,
    })
    session.save();
    console.log('new session:', session)
}

const addParties = async () => {
    const sessionId = new ObjectId('6862f8f52a42d279ba8f0b93');
    const partiesToInsert = partiesJson.map(p => ({ ...p, sessionId }));
    const parties = await Party.insertMany(partiesToInsert);
}

const addResults = async () => {
    const partiesResults =  []//TODO json??? form???
    const results = {
        sessionId: new ObjectId('6844a275a7adb82d81ea93cc'),
        results: partiesResults.map(pr => 
            ({
                partyId: new ObjectId(pr._id),
                actualSeats: pr.actualSeats
            })
        ),
        publishedAt: new Date('2022-11-01')
    }
    const addedResults = await Result.insertMany(results);

}

module.exports.addSession = addSession;
module.exports.addParties = addParties;
module.exports.addResults = addResults;
module.exports.addBets = addBets;