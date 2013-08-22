/**
 * dbGeneral.js
 *
 * This file establishes connection to the database and acts as a helper to execute the the database calls.
 * Currently we are creating a pool of connections and destroying the connections when we are done with them.
 * Doing this helps with ensuring that the server is able to get a connection when required.
 * connection.end can also be used instead of destroy but timeout of these connections must be handled in this case.
 *
 * Modified by Peter Chan on 04/30/2013.
 * Copyright (c) 2012 Redro Inc. All rights reserved.
 */

var mysql = require('mysql');
var properties = require('../resources/properties.js');
var log = require('../resources/logging.js');

var pool = mysql.createPool({
  host: properties.config.DB_HOST,
  port: properties.config.DB_PORT,
  database: properties.config.DB_SERVERNAME,
  user: properties.config.DB_USERNAME,
  password: properties.config.DB_PW,
  insecureAuth: true,
  typeCast: true
});

exports.contains_escape = function contains_escape(column, value) {
    var escapeString = escape(value);
    escapeString = escapeString.substring(1, escapeString.length-1);
    return column + " LIKE '%" + escapeString + "%'";
}

exports.dotStar = function dotStar(value1) {
    return  value1 + ".*";
}

exports.dot = function dot(value1, value2) {
	return value1 + "." + value2;
};

exports.dot_equals = function dot_equals(value1, value2, value3, value4) {
    return value1 + "." + value2 + " = " + value3 + "." + value4;
};

exports.equals_escape = function equals_escape(value1, value2) {
    return value1 + " = " + escape(value2);
};

exports.notNull = function notNull(columnName) {
    return columnName + " IS NOT NULL";
};

exports.in_escape = function(value1, value2) {
    return value1 + " in (" +  escape(value2) + ")";
};

exports.in = function(value1, value2) {
    return value1 + " in (" +  value2 + ")";
};

exports.notIn = function(value1, value2) {
    return value1 + " not in (" +  value2 + ")";
};

exports.conditionalCount_escape = function(columnName, value) {
    return "COUNT(CASE WHEN " + columnName + " = " + escape(value) + " THEN 1 ELSE NULL END)";
};

exports.groupConcat = function(columnName, delimitor) {
    return "GROUP_CONCAT(" + columnName + " SEPARATOR " + escape(delimitor) + ")";
};

exports.field_escape = function(columnName, value) {
    return "FIELD(" + columnName + ", " + escape(value) + ")";
};

exports.union = function(query1, query2) {
    return "(" + query1 + ") UNION (" + query2 + ")";
};

exports.dayFromUnixTimeMillis = function(columnName) {
    return "DATE(FROM_UNIXTIME(" + columnName + "/1000))";
}

exports.count = function(columnName) {
    return "COUNT(" + columnName + ")";
}

exports.max = function(columnName) {
    return "MAX(" + columnName + ")";
}

exports.executeQueryForObject = function(statement, parameters, callback) {
    var _callback;
    if (Object.prototype.toString.call(parameters) == "[object Function]") {
        _callback = parameters;
    } else {
        _callback = callback;
    }

    var responseToObjectConverter = function (err, results) {
        if (err || !results) {
            _callback(err, null);
        } else if (results && results.length > 0) {
            _callback(null, results[0]);
        } else {
            _callback(null, {});
        }
    };

    if (Object.prototype.toString.call(parameters) != "[object Function]") {
        // the parameter variable is actually an callback function, since only,
        // two arguments are passed in
        executeQueryWrapper(statement, parameters, responseToObjectConverter);
    } else {
        executeQueryWrapper(statement, null, responseToObjectConverter);
    }
};

// a general query executing statement to execute queries using our initialized DB connection
function executeQuery(statement, parameters, callback, nestTable) {

	var nest;
    if (Object.prototype.toString.call(parameters) == "[object Function]") {
		nest = (callback) ? true : false;
        // the parameter variable is actually an callback function, since only,
        // two arguments are passed in
        executeQueryWrapper(statement, null, parameters, nest);
    } else {
		nest = (nestTable) ? true : false;
        executeQueryWrapper(statement, parameters, callback, nest);
    }
}

function executeQueryWrapper(statement, parameters, callback, nest) {
    // no point in running the query if there is no callback define, we can't return any results
    if (callback == undefined) return;

    // log message
    if (!parameters) {
        log.info("executing query: "+statement);
    } else {
        log.info("executing query: "+statement+", with parameters: "+parameters);
    }

	pool.getConnection(function(err, connection) {
		if (err) {
			log.error("Could not establish connection from Pool", err);
			callback("Could not execute query wrapper", null);
			return;
		}

		var query;
        var options = {};
        options.nestTables = nest;
        options.sql = statement;
        if (parameters)
            options.values = parameters;
        options.typeCast = function (field, next) {
            if (field.type == 'TINY' && field.length == 1) {
                return (field.string() == '1'); // 1 = true, 0 = false
            }
            return next();
        };

        query = connection.query(options, function(err, result) {
            resultHandler(err, result, connection);
        });
	});

	// what to do after the query returns
	var resultHandler = function(err, result, connection) {
		if (err || !result) {
			log.error("error executing query: ", err);
			callback(err, null);
		}else{
			callback(null, result);
		}
		connection.destroy();
	};

}

// all parameter values should be escaped while constructing the query,
// this will prevent sql injection attack
function escape(value) {
    return mysql.escape(value);
}


/************** WE WANT TO REMOVE EVERYTHING BELOW *****************************/

function executeFindSingleQuery(statement, parameters, callback)
{
    console.log("executing find single query statement: "+statement+", with parameters: "+parameters);

    // no point in running the query if there is no callback define, we can't return any results
    if (callback == undefined) return;

	pool.getConnection(function(err, connection) {
		if (err) {
			log.error("Could not establish connection from Pool", err);
			callback("Could not execute single query", null);
			return;
		}
		connection.query(
			statement, parameters, function(err, result) {
				if (err) {
					log.error("DB Single Query: ", err);
					callback(err, null);
				}else{
					callback(result[0]);
				}
				connection.destroy();
			}
		);
	});
}

/**
 *
 * Nesting is optional,
 * Leave blank for false. true for nested.
 * Nested result will return with nested objects.
 * Mainly to allow duplicated columns.
 * @param statement
 * @param parameters
 * @param callback
 * @param nestTable
 */
function executeFindMultipleQuery(statement, parameters, callback, nestTable)
{
	nestTable = (nestTable) ? false : nestTable;
    console.log("executing find multiple query statement: "+statement+", with parameters: "+parameters);

	pool.getConnection(function(err, connection) {
		if (err) {
			log.error("Could not establish connection from Pool", err);
			callback("Could not execute single query", null);
			return;
		}
		var query = connection.query(
			statement, parameters, function(err, results) {
				if (err) {
					log.error("DB Multiple Query: ", err);
					callback(null);
				}else{
					if (callback) callback(buildFromMultipleResult(results));
				}
				connection.destroy();
			}
		);
		query.nestTables = nestTable;
	});
}

function executeUpdateSingleQuery(statement, parameters, callback)
{
    console.log("executing update query statement: "+statement+", with parameters: "+parameters);
	pool.getConnection(function(err, connection) {
		if (err) {
			log.error("Could not establish connection from Pool", err);
			callback("Could not execute single query", null);
			return;
		}

		connection.query(statement, parameters, function (err) {
				if (err) {
					log.error("DB Single Update: ", err);
					callback(err);
				}else{
					if (callback) callback();
				}
				connection.destroy();
			}
		);
	});
}

function executeInsertSingleQuery(statement, parameters, callback)
{
	pool.getConnection(function(err, connection) {
		if (err) {
			log.error("Could not establish connection from Pool", err);
			callback("Could not execute single query", null);
			return;
		}
		connection.query(statement, parameters,
			function (err, info) {
				if (err) {
					log.error("DB Single Insert: ",err);
					callback(null);
				}else{
					if (callback) callback(info);
				}
				connection.destroy();
			}
		);
	});
}

function buildFromMultipleResult(results)
{
    if (results == null || typeof results == 'undefined' || results.length == 0) return null;
    
    var list = [];
    
    for (var i = 0; i < results.length; i++)
    {
        list.push(results[i]);
    }
    
    return list;
}

/****************** WE WANT TO REMOVE EVERYTHING ABOVE *********************/

/**
 * This is mainly used for unit tests.
 * So it doesnt hang.
 */
//exports.killDb = function killDb(){
//    client.end();
//};
//
//exports.startDb = function StartDb(){
//    client = mysql.createConnection(client.config);
//    client.connect();
//};

//function handleDisconnect(connection) {
//	client.on('error', function(err) {
//		if (!err.fatal) {
//			return;
//		}
//
//		if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
//			throw err;
//		}
//
//		console.log('Re-connecting lost connection: ' + err.stack);
//
//		client = mysql.createConnection(connection.config);
//		handleDisconnect(connection);
//		client.connect();
//	});
//}
//
//handleDisconnect(client);

exports.executeFindSingleQuery = executeFindSingleQuery;
exports.executeFindMultipleQuery = executeFindMultipleQuery;
exports.executeUpdateSingleQuery = executeUpdateSingleQuery;
exports.executeInsertSingleQuery = executeInsertSingleQuery;
exports.escape = escape;
exports.executeQuery = executeQuery;
