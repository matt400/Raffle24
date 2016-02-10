'use strict';

const Promise = require('bluebird');
const client = require('../lib/postgres');

var db = {
	global_settings: (key) => {
		return client.db.one('SELECT value FROM global_settings WHERE key = $1', key).then((result) => {
			return result.value;
		});
	}
};

module.exports = exports = db;