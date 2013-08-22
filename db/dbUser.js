var client = require('./dbGeneral.js');
var squel = require("squel");
var tableProperties = require('../resources/tableProperties.js');
var async = require('async');

exports.getWhitelistedUsers = function getWhitelistedUsers(activeExperimentId, callback) {
    if (!activeExperimentId) {
        callback("CANNOT insert whitelist due to null experiment", null);
        return;
    }
    var query = squel.select()
        .from(tableProperties.USER_TABLE)
        .where(client.equals_escape(tableProperties.USER_ACTIVEEXPERIMENTID, activeExperimentId));
    client.executeQuery(query.toString(), function (err, result) {
        if (err || !result) {
            callback(null, "");
            return;
        }

        if (result.length > 0) {
            var returnString = result[0][tableProperties.USER_ID];
            for (var i = 1; i < result.length; i++) {
                returnString = returnString + ',' + result[i][tableProperties.USER_ID];
            }
        }
        callback(null, returnString);
    });
}

exports.getAllUsersForExperiment = function getAllUsersForExperiment(experimentId, callback) {
    if (experimentId == null || typeof experimentId == undefined) {
        callback("cannot find users for null exerpiment Id", null);
        return;
    }
    var query = squel.select()
        .from(tableProperties.USER_TABLE)
        .where(client.equals_escape(tableProperties.USER_EXPERIMENTID, experimentId));
    client.executeQuery(query.toString(), callback);
}

exports.getUserExperiments = function getUserExperiments(userId, callback) {
    if (!userId) {
        callback ("Cannot find user exriment info with null userID", null);
        return;
    }
    var query = squel.select()
        .from(tableProperties.USER_TABLE, "a")
        .left_join(tableProperties.EXPERIMENTS_TABLE, "b", "a."+tableProperties.USER_EXPERIMENTID +
            " = b."+tableProperties.EXPERIMENTS_ID)
        .where(client.equals_escape("a."+tableProperties.USER_ID, userId));
    client.executeQuery(query.toString(), callback);
}

/**
 * Insert white listed users into db.
 * @param experimentObj
 * @param callback
 */
exports.insertUserWhiteList = function insertUserWhiteList(experimentObj, callback)
{
    if(!experimentObj) {
        callback("Cannot insert empty Experiment");
        return;
    }
    var whitelist = experimentObj.whitelist;
    if (!whitelist) {
        callback(null);
        return;
    }

    var whitelistArray = experimentObj.whitelist.split(',');
    if (whitelistArray.length < 1) {
        callback(null);
        return;
    }

    for (var i = 0; i < whitelistArray.length; i++) {
        exports.insertUserIntoExperiment(whitelistArray[i],
            experimentObj[tableProperties.ACTIVEEXPERIMENTS_EXPERIMENTID],
            experimentObj[tableProperties.ACTIVEEXPERIMENTS_VARIANT],
            experimentObj[tableProperties.ACTIVEEXPERIMENTS_ID], function(err, info) {

            });
    }
    callback(null);
}

/**
 * should only be able to add. should never remove people from whitelist because of rollback issues.
 * Currently using ActiveExperiment ID to track whether someone is whitelisted or not.
 * Normal users will have NULL next to active Experiment Id.
 * @param experimentId
 * @param callback
 */
exports.updateUserWhiteList = function getExperimentInfo(experimentObj, callback) {
    if(!experimentObj) {
        callback("Cannot insert empty Experiment");
        return;
    }
    exports.deleteWhiteList(experimentObj[tableProperties.ACTIVEEXPERIMENTS_ID], function (err, result) {
        exports.insertUserWhiteList(experimentObj, function (err, result) {

        });
    });
    callback(null);
}

exports.deleteWhiteList = function deleteWhiteList (activeExperimentId, callback) {
    var query = squel.delete()
        .from(tableProperties.USER_TABLE)
        .where(tableProperties.USER_ACTIVEEXPERIMENTID + ' = ' + activeExperimentId);
    client.executeQuery(query.toString(), callback);
}

/**
 * This function inserts a user into a new experiment variant.
 * @param user
 * @param experiment
 * @param variant
 * @param activeExperiment
 * @param callback
 */
exports.insertUserIntoExperiment = function insertIntoExperimentVariant (user, experiment, variant, activeExperiment, callback) {
    var query = squel.delete()
        .from(tableProperties.USER_TABLE)
        .where(tableProperties.USER_EXPERIMENTID + ' = ' + experiment + ' and ' + tableProperties.USER_ID + ' = ' + user);
    client.executeQuery(query.toString(), function(err, result) {
        var query = squel.insert({ usingValuePlaceholders: true })
            .into(tableProperties.USER_TABLE)
            .set(tableProperties.USER_ID, "?")
            .set(tableProperties.USER_EXPERIMENTID, "?")
            .set(tableProperties.USER_VARIANT, "?")
            .set(tableProperties.USER_ACTIVEEXPERIMENTID, "?");

        var data = [
            user, experiment, variant, activeExperiment];

        client.executeQuery(query.toString(), data, callback);
    });
}