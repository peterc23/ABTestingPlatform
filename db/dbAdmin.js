var client = require('./dbGeneral.js');
var squel = require("squel");
var tableProperties = require('../resources/tableProperties.js');

exports.adminByUserName = function retrieveAdminUserByUserName(id, callback) {
    // create query
    var query = squel.select()
        .from(tableProperties.ADMIN_TABLE)
        .where(tableProperties.ADMIN_USERNAME + "=" +client.escape(id));

    // execute query
    client.executeQueryForObject(query.toString(), callback);
}

exports.adminById = function retrieveAdminById(id, callback) {
    // create query
    var query = squel.select()
        .from(tableProperties.ADMIN_TABLE)
        .where(tableProperties.ADMIN_ID + "=" +client.escape(id));

    // execute query
    client.executeQueryForObject(query.toString(), callback);
}