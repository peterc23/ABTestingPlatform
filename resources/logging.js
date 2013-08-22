//var loggly = require('loggly');
var properties = require('./properties.js')
//var token = properties.LOGGLY_TOKEN;
var config = {
//  subdomain: properties.LOGGLY_SUBDOMAIN
//  auth: {
//    username: properties.LOGGLY_USERNAME,
//    password: properties.LOGGLY_PASSWORD
//  }
};

//var client = loggly.createClient(config);


function info(message, data){
    logMessage(message, data, 'INFO');
}

function stat(message, data) {
	logMessage(message, data, 'STAT');
}

function warning(message, data){
    logMessage(message, data, 'WARN');
}

function error(message, data){
    logMessage(message, data, 'ERROR');
}

function fatal(message, data){
    logMessage(message, data, 'FATAL');
}

function logMessage(message, data, header) {
    var message = header + ': '+ message;
    if (data) {
        message += ', ' + JSON.stringify(data);
    }
    console.log(message);
//    client.log(token, message, function (err, result) {
//	});
}

exports.info = info;
exports.warning = warning;
exports.error = error;
exports.fatal = fatal;
exports.stat = stat;