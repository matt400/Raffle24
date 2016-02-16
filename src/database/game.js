'use strict';

const Promise = require('bluebird');
const client = require('../lib/postgres');

var db = {
	add_player: (user_id, items_data, items_value, game_hash, points, add_time, username, profile_link) => {
		return client.db.none("INSERT INTO game_players(user_id, items_data, items_value, game_hash, points, add_time, username, profile_link) VALUES($1, $2, $3, $4, $5, $6, $7, $8)", [user_id, items_data, items_value, game_hash, points, add_time, username, profile_link]).catch((err) => {
			console.log(err); // logging
		});
	},
	players_in_round: function(game_hash) {
		return client.db.any("SELECT * FROM game_players WHERE game_hash = $1 ORDER BY add_time DESC", game_hash).then(function(data) {
			return data;
		}).catch((err) => {
			console.log(err); // logging
		});
	},
	add_winner: (user_id, round_info, game_items) => {
		// round_info[JSON]: { round_hash: "", round_signature: "", round_winning_perc: float, round_players: integer }
		return client.db.none("INSERT INTO game_winners(user_id, game_items, created_time, round_info) VALUES($1, $2, $3, $4)", [user_id, game_items, created_time, round_info]).catch((err) => {
			console.log(err); // logging
		});
	},
	player_duplicate: (user_id) => {
		return client.db.one('SELECT * FROM game_players WHERE user_id = $1', user_id).then((data) => {
			return data;
		});
	},
	player_update: (user_id, items_data, items_value, points, add_time) => {
		return client.db.none('UPDATE game_players SET items_data = $1, items_value = $2, points = $3, add_time = $4 WHERE user_id = $5', [items_data, items_value, points, add_time, user_id]).catch((err) => {
			console.log(err)
		});
	}
};

module.exports = exports = db;