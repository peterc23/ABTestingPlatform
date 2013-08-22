var client = require('./dbGeneral.js');
var squel = require("squel");
var tableProperties = require('../resources/tableProperties.js');

exports.getActiveExperiments = function getAllExperiments(callback) {
    // create query
    var query = squel.select()
        .from(tableProperties.ACTIVEEXPERIMENTS_TABLE, "a")
        .left_join(tableProperties.EXPERIMENTS_TABLE, "b", "a."+tableProperties.ACTIVEEXPERIMENTS_EXPERIMENTID +
            " = b."+tableProperties.EXPERIMENTS_ID)
        .limit(100);
    // execute query
    client.executeQuery(query.toString(), callback);
}

exports.getActiveExperimentInfo = function getActiveExperimentInfo(experimentId, callback) {
    var query = squel.select()
        .from(tableProperties.ACTIVEEXPERIMENTS_TABLE)
        .where(client.equals_escape(tableProperties.ACTIVEEXPERIMENTS_ID, experimentId))
        .limit(1);
    client.executeQueryForObject(query.toString(), callback);
}

exports.insertActiveExperiment = function insertExperiment(experimentObj, callback)
{
    if(!experimentObj) {
        callback("Cannot insert empty Experiment", null);
        return;
    }
    var query = squel.insert({ usingValuePlaceholders: true })
        .into(tableProperties.ACTIVEEXPERIMENTS_TABLE)
        .set(tableProperties.ACTIVEEXPERIMENTS_EXPERIMENTID, "?")
        .set(tableProperties.ACTIVEEXPERIMENTS_VARIANT, "?")
        .set(tableProperties.ACTIVEEXPERIMENTS_HASH, "?")
        .set(tableProperties.ACTIVEEXPERIMENTS_PERCENT, "?");

    var data = [
        experimentObj[tableProperties.ACTIVEEXPERIMENTS_EXPERIMENTID],
        experimentObj[tableProperties.ACTIVEEXPERIMENTS_VARIANT],
        experimentObj[tableProperties.ACTIVEEXPERIMENTS_HASH],
        experimentObj[tableProperties.ACTIVEEXPERIMENTS_PERCENT]];

    client.executeQuery(query.toString(), data, callback);
}

exports.updateActiveExperiment = function updateExperiment(experimentObj, callback) {
    if(!experimentObj) {
        callback("Cannot update empty experiment obj", null);
        return;
    }
    var query = squel.update({usingValuePlaceholders: true})
        .table(tableProperties.ACTIVEEXPERIMENTS_TABLE)
        .set(tableProperties.ACTIVEEXPERIMENTS_EXPERIMENTID, "?")
        .set(tableProperties.ACTIVEEXPERIMENTS_VARIANT, "?")
        .set(tableProperties.ACTIVEEXPERIMENTS_HASH, "?")
        .set(tableProperties.ACTIVEEXPERIMENTS_PERCENT, "?")
        .where(client.equals_escape(tableProperties.ACTIVEEXPERIMENTS_ID, experimentObj[tableProperties.ACTIVEEXPERIMENTS_ID]));

    var data = [
        experimentObj[tableProperties.ACTIVEEXPERIMENTS_EXPERIMENTID],
        experimentObj[tableProperties.ACTIVEEXPERIMENTS_VARIANT],
        experimentObj[tableProperties.ACTIVEEXPERIMENTS_HASH],
        experimentObj[tableProperties.ACTIVEEXPERIMENTS_PERCENT]];

    client.executeQuery(query.toString(), data, callback);
}
