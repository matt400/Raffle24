'use strict';

const Promise = require('bluebird');
const client = require('../lib/postgres');

var db = {
	params_by_key: (keys_id) => {
		return client.db.any('SELECT value FROM global_params WHERE id = ANY($1::INT[]) ORDER BY id', keys_id).then((result) => {
			return result;
		});
	},
	update_game_params: (params) => {
		return Promise.map(params, (item, index, length) => {
			return `(${item.i}, '${item.value}'::text)`;
		}).then((data) => {
			let build_sql = data.join(', ');
			return client.db.none(`UPDATE global_params gp SET value = c.value FROM (VALUES ${build_sql}) AS c(id, value) WHERE c.id = gp.id`).catch((err) => {
				console.log(err); // logging
			});
		});
	},
	update_game_param: (params) => {
		return client.db.none('UPDATE global_params SET value = $1 WHERE id = $2', params).catch((err) => {
			console.log(err); // logging
		});
	}
};

module.exports = exports = db;