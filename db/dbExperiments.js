var client = require('./dbGeneral.js');
var squel = require("squel");
var tableProperties = require('../resources/tableProperties.js');

exports.getAllExperiments = function getAllExperiments(callback) {
    // create query
    var query = squel.select()
        .from(tableProperties.EXPERIMENTS_TABLE)
        .limit(100);
    // execute query
    client.executeQuery(query.toString(), callback);
}

exports.getExperimentInfo = function getExperimentInfo(experimentId, callback) {
    var query = squel.select()
        .from(tableProperties.EXPERIMENTS_TABLE)
        .where(client.equals_escape(tableProperties.EXPERIMENTS_ID, experimentId))
        .limit(1);
    client.executeQueryForObject(query.toString(), callback);
}

exports.updateExperiment = function updateExperiment(experimentObj, callback) {
    if(!experimentObj) {
        callback("Cannot update empty experiment obj", null);
        return;
    }
    var query = squel.update({usingValuePlaceholders: true})
        .table(tableProperties.EXPERIMENTS_TABLE)
        .set(tableProperties.EXPERIMENTS_NAME, "?")
        .set(tableProperties.EXPERIMENTS_VARIANTS, "?")
        .set(tableProperties.EXPERIMENTS_DESC, "?")
        .where(client.equals_escape(tableProperties.EXPERIMENTS_ID, experimentObj[tableProperties.EXPERIMENTS_ID]));

    var data = [
        experimentObj[tableProperties.EXPERIMENTS_NAME],
        experimentObj[tableProperties.EXPERIMENTS_VARIANTS],
        experimentObj[tableProperties.EXPERIMENTS_DESC]];

    client.executeQuery(query.toString(), data, callback);
}

exports.insertExperiment = function insertExperiment(experimentObj, callback)
{
    if(!experimentObj) {
        callback("Cannot insert empty Experiment", null);
        return;
    }
    var query = squel.insert({ usingValuePlaceholders: true })
        .into(tableProperties.EXPERIMENTS_TABLE)
        .set(tableProperties.EXPERIMENTS_NAME, "?")
        .set(tableProperties.EXPERIMENTS_VARIANTS, "?")
        .set(tableProperties.EXPERIMENTS_DESC, "?");

    var data = [
        experimentObj[tableProperties.EXPERIMENTS_NAME],
        experimentObj[tableProperties.EXPERIMENTS_VARIANTS],
        experimentObj[tableProperties.EXPERIMENTS_DESC]];

    client.executeQuery(query.toString(), data, callback);
}