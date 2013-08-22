var async = require('async');
var log = require('../resources/logging.js');
var dbExperiments = require('../db/dbExperiments.js');
var dbActiveExperiments = require('../db/dbActiveExperiments.js');
var dbUser = require('../db/dbUser.js');
var tP = require('../resources/tableProperties.js');

exports.userLoginRequest = function(req, res)
{
    /**
     * req.body should contain
     * {method:'email', fbToken:'token', username:'userId', password:'password', platform:'platform'}
     */

    var userId = req.params.userId;
    if (!userId) {
        res.send("Cannot retrieve experiments with null unique id", 400);
        return;
    }
    var returnUserExperiments;
    var activeExperiments;
    var activeExperimentIds = [];
    var userActiveExperiments = [];
    var experimentsToJoin = [];
    async.waterfall([
        function(callback) {
            dbActiveExperiments.getActiveExperiments(function (err, result) {
                callback(null, result);
            });
        },
        function (experiments, callback) {
            activeExperiments = experiments;
            for (var i = 0; i < experiments.length; i ++) {
                if (activeExperimentIds.indexOf(experiments[i][tP.ACTIVEEXPERIMENTS_EXPERIMENTID]) > -1) {

                } else {
                    activeExperimentIds.push(experiments[i][tP.ACTIVEEXPERIMENTS_EXPERIMENTID]);
                }
            }
            dbUser.getUserExperiments(userId, callback);
        },
        function (userExperiments, callback) {
            returnUserExperiments = userExperiments;
            for (var i = 0; i < userExperiments.length; i ++) {
                if (userActiveExperiments.indexOf(userExperiments[i][tP.USER_EXPERIMENTID]) > -1) {

                } else {
                    userActiveExperiments.push(userExperiments[i][tP.USER_EXPERIMENTID]);
                }
            }
            for (var i = 0; i < activeExperimentIds.length; i++) {
                if (userActiveExperiments.indexOf(activeExperimentIds[i]) > -1) {

                } else {
                    experimentsToJoin.push(activeExperimentIds[i]);
                }
            }

            if (experimentsToJoin.length == 0) {
                callback(null);
            }
            async.forEach(experimentsToJoin, function(experimentId, _callback) {
                dbUser.getAllUsersForExperiment(experimentId, function(err, result) {
                    if (err) {
                        log.error("cannot find users for experiment", err);
                    }
                    var totalUsers = 0;
                    if (!result) {
                        totalUsers = 0;
                    } else {
                        totalUsers = result.length;
                    }
                    var possibleVariants = [];
                    for (var i =0; i < activeExperiments.length; i++) {
                        if (activeExperiments[i][tP.ACTIVEEXPERIMENTS_EXPERIMENTID] == experimentId) {
                            // variant that is ON
                            var variantObj = {};
                            variantObj.variant = activeExperiments[i][tP.ACTIVEEXPERIMENTS_VARIANT];
                            var usersInVariant = [];
                            for (var j = 0; j < result.length; j++) {
                                if (result[j][tP.USER_VARIANT] == variantObj.variant) {
                                    usersInVariant.push(result[i]);
                                }
                            }
                            variantObj.hash = activeExperiments[i][tP.ACTIVEEXPERIMENTS_HASH];
                            variantObj.percent = activeExperiments[i][tP.ACTIVEEXPERIMENTS_PERCENT];
                            variantObj.population = usersInVariant.length;
                            possibleVariants.push(variantObj);
                        }
                    }


                    var variantToAdd = 0;
                    for (var i = 0; i < possibleVariants.length; i++) {
                        if (possibleVariants[i].variant != 0) {
                            if (shouldAddToVariant(possibleVariants[i], totalUsers)) {
                                variantToAdd = possibleVariants[i].variant;
                                    break;
                            } else {
                                    continue;
                            }
                        }
                    }
                    dbUser.insertUserIntoExperiment(userId, experimentId, variantToAdd, null, function (err, result) {
                        if (err) {
                            _callback(err);
                        } else {
                            _callback(null);
                        }
                    });
                });
            }, function (err) {
                if (err) {
                    callback(err);
                } else {
                    dbUser.getUserExperiments(userId, function(err, result) {
                        if (err || !result) {
                            callback (err);
                        } else {
                            returnUserExperiments = result;
                            callback(null);
                        }
                    });
                }
            });
        }
    ], function(err) {
        if (err) {
            // TODO: Inform user of error
            var errorMsg = "Encountered an error retrieving experiments for user";
            log.error(errorMsg, err);
            res.send(errorMsg, 400);
            return;
        }
        res.send(returnUserExperiments, 200);
    });
}

function shouldAddToVariant(variantObj, totalUsers) {
    var result = false;
    var hashPopulation = (variantObj.hash/100)*totalUsers;
    if (variantObj.percent > (variantObj.population/hashPopulation)*100) {
        result = true;
    }
    return result;
}


function insertIntoVariant(userId, experimentId, activeExperiments) {
    var possibleVariants = [];
    for (var i = 0; i < activeExperiments.length; i++) {
        if (activeExperiments[i][tP.ACTIVEEXPERIMENTS_EXPERIMENTID] == experimentId) {
            possibleVariants.push(activeExperiments[i]);
        }
    }
}