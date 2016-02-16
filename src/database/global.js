'use strict';

const Promise = require('bluebird');
const client = require('../lib/postgres');

var db = {
	params_by_key: (keys_id, callback) => {
		client.db.any('SELECT value FROM global_params WHERE id = ANY($1::INT[]) ORDER BY id', keys_id).then((result) => {
			callback(result);
		});
	},
	update_game_params: (params) => {
		return client.db.none('UPDATE global_params gp SET value = c.value FROM (VALUES (2, $1::text), (3, $2::text), (4, $3::text), (5, $4::text)) AS c(id, value) WHERE c.id = gp.id', params).catch((err) => {
			console.log(err);// logging
		});
	},
	update_game_param: (params) => {
		return client.db.none('UPDATE global_params SET value = $1 WHERE id = $2', params).catch((err) => {
			console.log(err);// logging
		});
	}
};

module.exports = exports = db;