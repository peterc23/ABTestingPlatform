var LocalStrategy = require('passport-local').Strategy;
var crypto = require('crypto');
var async = require('async');
var underscore = require('underscore');
var dbAdmin = require('../db/dbAdmin.js');
var dbExperiments = require('../db/dbExperiments.js');
var dbUser = require('../db/dbUser.js');
var dbActiveExperiments = require('../db/dbActiveExperiments.js');
var log  = require('../resources/logging.js');

/***** user authentication stuff *****************/

exports.login = function (req, res, next) {
    if (req.user) {
        dbExperiments.getAllExperiments(function(err, experiments) {
            if (err) {
                next(err);
                return;
            }
            req.session.experiments = experiments;
            res.redirect("/experiments");
        });
    } else {
        // user is not logged in, show login page
        res.render("site/login.jade");
    }
}

exports.logout = function (req, res) {
    req.logout();
    req.session.destroy();
    res.redirect("/login");
}

exports.experiments = function (req, res) {
    var data = parseGeneralData(req);
    res.render("site/experiments.jade", data);
}

exports.activeExperiments = function (req, res) {
    var data = parseGeneralData(req);
    dbActiveExperiments.getActiveExperiments(function(err, activeExperiments) {
        req.session.activeExperiments = activeExperiments;
        data.activeExperiments = activeExperiments;
        res.render("site/activeExperiments.jade", data);
    });
}

exports.newUser = function (req, res) {
    res.render("site/newUser.jade");
}


/**************** menu item stuff ************************/

exports.insertExperiment = function(req, res) {
    updateOrAddNewExperiment(req, res, true);
}

exports.updateExperiment = function(req, res) {
    updateOrAddNewExperiment(req, res, false);
}

exports.editExperimentPage = function (req, res) {
    fetchDataAndRenderExperimentPage(req, res, false);
}

exports.addNewExperimentPage = function(req, res) {
    fetchDataAndRenderExperimentPage(req, res, true);
}

function fetchDataAndRenderExperimentPage(req, res, newExperiment) {
    var data = parseGeneralData(req);
    data.experimentId = req.params.selectedExperimentId;
    data.newExperiment = newExperiment;

    // get data and render experiment page
    async.parallel([
        function(callback) {
            dbExperiments.getExperimentInfo(data.experimentId, function(err, experiment) {
                    data.chosenExperiment = experiment;
                    callback(null);
            });
        }
    ], function() {
        res.render("site/experiments.jade", data);
    });
}

function updateOrAddNewExperiment(req, res, insert) {
    // update existing menu item
    var experiment;

    async.waterfall([
        function(callback) {
            experiment = req.body;
            experiment.experimentId = req.params.selectedExperimentId;

            if (insert) {
                dbExperiments.insertExperiment(experiment, callback);
            } else {
                dbExperiments.updateExperiment(experiment, callback);
            }
        },
        function(innsertINfo, callback) {
            dbExperiments.getAllExperiments(callback);
        }
    ], function(err, results) {
        if (err) {
            // TODO: Inform user of error
            log.error("Encountered an error updating/adding new experiment", err);
        }
        if (results) {
            req.session.experiments = results;
        }
        // redirect to menu item list page
        res.redirect("/experiments");
    })
}


/************* active experiments ***********************/

exports.editActiveExperimentPage = function (req, res) {
    fetchDataAndRenderActiveExperimentPage(req, res, false);
}

exports.addNewActiveExperimentPage = function(req, res) {
    fetchDataAndRenderActiveExperimentPage(req, res, true);
}

exports.insertActiveExperiment = function(req, res) {
    updateOrAddNewActiveExperiment(req, res, true);
}

exports.updateActiveExperiment = function(req, res) {
    updateOrAddNewActiveExperiment(req, res, false);
}

function fetchDataAndRenderActiveExperimentPage(req, res, newExperiment) {
    var data = parseGeneralData(req);
    data.activeExperimentId = req.params.selectedActiveExperimentId;
    data.newActiveExperiment = newExperiment;

    // get data and render experiment page
    async.series([
        function(callback) {
            dbActiveExperiments.getActiveExperimentInfo(data.activeExperimentId, function(err, experiment) {
                data.chosenActiveExperiment = experiment;
                callback(null);
            });
        },
        function(callback) {
            dbUser.getWhitelistedUsers(data.activeExperimentId, function (err, result) {
                data.chosenActiveExperiment.whitelist = result;
                callback(null);
            });
        }
    ], function() {
        res.render("site/activeExperiments.jade", data);
    });
}

function updateOrAddNewActiveExperiment(req, res, insert) {
    // update existing menu item
    var experiment;

    async.waterfall([
        function(callback) {
            experiment = req.body;
            experiment.activeExperimentId = req.params.selectedActiveExperimentId;

            if (insert) {
                dbActiveExperiments.insertActiveExperiment(experiment, callback);
            } else {
                dbActiveExperiments.updateActiveExperiment(experiment, callback);
            }
        },
        function(insertInfo, callback) {

            if (insert) {
                dbUser.insertUserWhiteList(experiment, callback);
            } else {
                dbUser.updateUserWhiteList(experiment, callback);
            }
        },
        function(callback) {
            dbActiveExperiments.getActiveExperiments(callback);
        }
    ], function(err, results) {
        if (err) {
            // TODO: Inform user of error
            log.error("Encountered an error updating/adding new experiment", err);
        }
        if (results) {
            req.session.activeExperiments = results;
        }
        // redirect to menu item list page
        res.redirect("/activeExperiments");
    })
}

function parseGeneralData(req) {
    var data = {};
    data.user = req.user;
    data.url = req.url;
    data.experiments = req.session.experiments;
    data.activeExperiments = req.session.activeExperiments;
    return data;
}


/*************** AUTHENTICATION STUFF ************************/

exports.setupAuthentication = function(passport) {
    setupLocalStrategy(passport);
    setupSerialization(passport);
}

function setupLocalStrategy(passport) {
    passport.use(new LocalStrategy(
        function(username, password, done) {
            console.log('loggin in user with username ' + username);
            dbAdmin.adminByUserName(username, function(err, user) {
                if (err) { return done(err); }
                if (!user) {
                    console.log('user login failed, incorrect username ' + username);
                    return done(null, false, { message: 'Incorrect username.' });
                }
                // has password then compare password
                var hashedPassword = crypto.createHash('md5').update(password).digest("hex");
                if (user.adminPassword != hashedPassword) {
                    console.log('user login failed, incorrect password ' + username);
                    return done(null, false, { message: 'Incorrect password.' });
                }
                console.log('user successfully logged in ' + username);
                return done(null, user);
            });
        }
    ));
}

function setupSerialization(passport) {
    // serialization
    passport.serializeUser(function(user, done) {
        done(null, user.adminId);
    });

    // de-serialization
    passport.deserializeUser(function(id, done) {
        dbAdmin.adminById(id, function(err, user) {
            done(err, user);
        });
    });
}

//// authenticating the user as needed
exports.restrict = function(req, res, next) {
    if (!req.user || !req.isAuthenticated()) {
        res.redirect("/login");
    } else {
        next();
    }
}
