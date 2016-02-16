'use strict';

const Promise = require('bluebird');
const net = require('net');
const crypto = require('crypto');
const checksum = crypto.createHash('sha1');
const game_db = require('./database/game');
const global_db = require('./database/global');

const ROUND_START_TIMER = 120; // more than one player timer

const game_client = net.connect(4447);

function game() {
	let that = this;

	this.mtp_timer = ROUND_START_TIMER;
	this.game_started = false;
	this.countdown_started = false;
	this.all_items = [];

	global_db.params_by_key("{2, 3, 4, 5, 6}", (data) => {
		that.current_game_hash = data[0].value;
		that.round_start_signature = data[1].value;
		that.current_winning_perc = parseFloat(data[2].value);
		that.current_players = parseInt(data[3].value);
		that.all_points = parseInt(data[4].value);
	});

	this.round_start();
}

game.prototype.game_hash = function() {
	return crypto.randomBytes(32).toString('hex');
};

game.prototype.winning_perc = function() {
	return Math.random() * 100;
};

game.prototype.round_start_signature = function(game_hash, winning_perc) {
	// game_hash + winning_perc
	return checksum.update(game_hash + "_" + winning_perc).digest('hex');
};

game.prototype.winner_formula = function(allpoints, current_winning_perc) {
	return ~~((allpoints - 1e-10) * (current_winning_perc / 100));
};

game.prototype.parse_value = function(json) {
	let value = 0;
	json.forEach(function(data) {
		value += data.value;
	});
	return value;
};

game.prototype.calculate_points = function(value) {
	return value * 100;
};

game.prototype.calculate_value = function(points) {
	return value / 100;
};

game.prototype.new_round = function() {
	let game_hash = this.game_hash();
	let winning_perc = this.winning_perc();
	let round_start_signature = this.round_start_signature(game_hash, winning_perc);

	global_db.update_game_params([game_hash, round_start_signature, winning_perc, 0, 0]);

	this.mtp_timer = ROUND_START_TIMER;
	this.current_game_hash = game_hash;
	this.round_start_signature = round_start_signature;
	this.current_winning_perc = winning_perc;
	this.current_players = 0;
	this.game_started = false;
	this.all_points = 0;
	this.all_items = [];

	game_client.write(JSON.stringify({ mode: "new_round", data: { round_start_signature } }));
};

game.prototype.get_winner = function(current_game_hash, current_winning_perc) {
	game_db.players_in_round(current_game_hash).map((data) => {
		this.all_points += data.points;
		this.all_items = this.all_items.concat(data.items_data);
		return data;
	}).then((data) => {
		let lucky_player = this.winner_formula(this.all_points, current_winning_perc);
		Promise.each(data, (item, index, length) => {
			if(item.points >= lucky_player) {
				throw item;
			}
		}).catch((data) => {
			// get all items from current game
			// save & emit winner
			game_client.write(JSON.stringify({ mode: "new_winner", data: { current_game_hash } }));
			// send items to user

			setTimeout(() => {
				// new round
			}, 5000);
			console.log(data);
		});
		console.log(lucky_player);
	});
};

game.prototype.round_start = function() {
	let start = setTimeout(() => {
		if(this.mtp_timer > 1) {
			if(this.current_players > 1) {
				if(!this.countdown_started) {
					this.countdown_started = true;
				}
				this.mtp_timer--;
				this.round_start();
			} else {
				this.mtp_timer = ROUND_START_TIMER;
			}
		} else {
			this.game_started = true;
			this.countdown_started = false;
			this.get_winner(this.current_game_hash, this.current_winning_perc);
			clearTimeout(start);
		}
	}, 1000);
};

game.prototype.new_player_process = function(user_id, items_data, value, username, profile_link) {
	let item_value = this.parse_value(items_data);
	let points = this.calculate_points(item_value);
	let add_time = ~~(Date.now() / 1000);

	this.all_points += points;
	this.current_players++;

	game_db.add_player(user_id, items_data, item_value, this.current_game_hash, points, add_time, username, profile_link);
	// temporary
	global_db.update_game_param(["value++", 5]);
	global_db.update_game_param(["value+" + points, 6]);

	// TODO
	game_client.write(JSON.stringify({ mode: "new_player", type: 0, data: { global_value: this.calculate_value(this.points), profile_link: profile_link, items_value: item_value, items: null } }));
};

game.prototype.existing_player_process = function(user_id, value, data, items_data) {
	let current_items = Object.assign(data.items_data, items_data);
	let current_value = this.parse_value(current_items);
	let current_points = this.calculate_points(current_value);
	let earlier_points = this.calculate_points(value);
	let add_time = ~~(Date.now() / 1000);

	this.all_items = this.all_items.concat(items_data);
	this.all_points += earlier_points;

	global_db.update_game_param(["value+" + earlier_points, 6]);

	game_db.player_update(user_id, current_items, current_value, current_points, add_time);

	// TODO
	game_client.write(JSON.stringify({ mode: "new_player", type: 1, data: { global_value: this.calculate_value(this.points), profile_link: profile_link, items_value: item_value, items: null } }));
};

game.prototype.new_player = function(user_id, items_data, value, username, profile_link) {
	game_db.player_duplicate(user_id).then((data) => {
		if(!this.game_started) {
			if(data) {
				this.existing_player_process(user_id, value, data, items_data);
			} else {
				this.new_player_process(user_id, items_data, value, username, profile_link);
			}
		} else {
			setTimeout(function() {
				this.new_player_process(user_id, items_data, value, username, profile_link);
			}, 8000);
		}
	});

	if(this.current_players > 1 && !this.game_started) {
		this.round_start();
	}
};

module.exports = exports = game;