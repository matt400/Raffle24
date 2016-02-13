'use strict';

const Promise = require('bluebird');
const client = require('../lib/postgres');

var db = {
	insert_items: (user_id, items_data, items_value, game_hash, points, add_time, username, profile_link) => {
		return client.db.none("INSERT INTO game_players(user_id, items_data, items_value, game_hash, points, add_time, username, profile_link) VALUES($1, $2, $3, $4, $5, $6, $7, $8)", [user_id, items_data, items_value, game_hash, points, add_time, username, profile_link]).catch((error) => {
			console.log(error); // logging
		});
	},
	add_winner: (user_id, game_hash, game_items) => {
		return client.db.none("INSERT INTO game_winners(user_id, game_hash, game_items, created_time) VALUES($1, $2, $3, $4)", [user_id, game_hash, game_items, created_time]).catch((error) => {
			console.log(error); // logging
		});
	}
};

module.exports = exports = db;