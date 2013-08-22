var express = require('express');
var passport = require('passport');
var properties = require('./resources/properties.js');
var siteHandler = require('./handlers/siteHandler.js');
var userRequestHandler = require ('./handlers/userRequestHandler.js');

var httpServer = express.createServer();

var setup_server = function(app) {

    // general configurations
    app.configure(function() {

        // set reference to all jade and html files
        // set reference to public html folder
        app.set('view engine', 'jade');
        app.set('views', __dirname + '/views');
        app.set('view options', { layout: false });
        app.use(express.static(__dirname + '/publicHTML'));
        app.use(express.static(__dirname + '/components'));


        // parse post body, and save any files in ./tmp
        app.use(express.bodyParser({
            uploadDir: __dirname + '/tmp',
            keepExtensions: true
        }));

        // for override POST with PUT and DELETE, for example, in html,
        // you can include <input type="hidden" name="_method" value="put" />
        // to perform a put, instead of a post
        app.use(express.methodOverride());

        // for user authentication
        app.use(express.cookieParser());
        app.use(express.session({ secret: properties.APP_SESSION_SECRET }));
//        app.use(function(req,res,next) {
//            req.session.cookie.expires = false; // set cookie to expire when browser is closed
//            next();
//        });
        app.use(passport.initialize());
        app.use(passport.session());

        // the application routing logic
        app.use(app.router);

        // error handler
        app.use(logErrors);



        app.configure('development', function(){
            app.use(express.errorHandler());
            app.locals.pretty = true;
        });
    });

    // headers for backbone.js to work
    function writeBackBoneHeaders(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        res.header("Access-Control-Allow-Headers", "Content-Type");
        next();
    }

    // log the errors
    function logErrors(err, req, res, next) {
        console.log(JSON.stringify(err));
        next(err);
    }

    /*** handle requests for the site portion ***/
    siteHandler.setupAuthentication(passport);
    app.get("/", siteHandler.login);
    app.get("/login", siteHandler.login);
    app.post("/login", passport.authenticate('local'), siteHandler.login);
    app.get("/logout", siteHandler.restrict, siteHandler.logout);
    app.get("/experiments",  siteHandler.restrict, siteHandler.experiments);
    app.get("/experiments/newExperimentPage", siteHandler.restrict, siteHandler.addNewExperimentPage);
    app.post("/experiments/new", siteHandler.restrict, siteHandler.insertExperiment);
    app.post("/experiments/:selectedExperimentId/update", siteHandler.restrict, siteHandler.updateExperiment);
    app.get("/experiments/:selectedExperimentId/edit", siteHandler.restrict, siteHandler.editExperimentPage);

    /** Handle active experiments ***/
    app.get("/activeExperiments",  siteHandler.restrict, siteHandler.activeExperiments);
    app.get("/activeExperiments/newActiveExperimentPage", siteHandler.restrict, siteHandler.addNewActiveExperimentPage);
    app.get("/activeExperiments/:selectedActiveExperimentId/edit", siteHandler.restrict, siteHandler.editActiveExperimentPage);
    app.post("/activeExperiments/new", siteHandler.restrict, siteHandler.insertActiveExperiment);
    app.post("/activeExperiments/:selectedActiveExperimentId/update", siteHandler.restrict, siteHandler.updateActiveExperiment);


    /** handle user login ***/
    app.get("/user/login/:userId", userRequestHandler.userLoginRequest);

//    app.get("/orderreport", siteHandler.restrict, analyticRequestHandler.orderReport);
//    app.post("/orderreport", siteHandler.restrict, analyticRequestHandler.orderReport);
}

setup_server(httpServer);

// start the server
httpServer.listen(properties.config.APP_PORT);

console.log("server started");