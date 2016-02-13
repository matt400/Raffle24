'use strict';

const Promise = require('bluebird');
const crypto = require('crypto');
const checksum = crypto.createHash('sha1');
const game_db = require('../database/game');
const global_db = require('../database/global');

// Math.floor((numberOfTickets - 1e-10) * (winningPercentage / 100))

function game(emitter) {
	let that = this;

	this.emitter = emitter;
	this.mtp_timer = 120; // more than one player timer
	this.game_started = false;

	global_db.params_by_key("{2, 3, 4, 5}", (data) => {
		that.current_game_hash = data[0].value;
		that.round_start_signature = data[1].value;
		that.current_winning_perc = data[2].value;
		that.current_players = data[3].value;
	});

	//this.round_start();
	this.new_round();
}

game.prototype.game_hash = function() {
	return crypto.randomBytes(32).toString('hex');
};

game.prototype.winning_perc = function() {
	return Math.random() * 100;
};

game.prototype.round_start_signature = function(game_hash, winning_perc) {
	// game_hash + winning_perc
	let cs = checksum.update(game_hash + "_" + winning_perc).digest('hex');
	console.log(cs);
	return cs;
};

game.prototype.new_round = function() {
	let game_hash = this.game_hash();
	let winning_perc = this.winning_perc();
	let round_start_signature = this.round_start_signature(game_hash, winning_perc);

	global_db.update_game_params([game_hash, round_start_signature, winning_perc, 0]).then(() => {
		console.log("Zaktualizowane");
	});
};

game.prototype.get_winner = function() {
	//  ~~((points - 1e-10) * ((Math.random() * 100) / 100));

};

game.prototype.round_start = function() {
	let start = setTimeout(() => {
		if(this.mtp_timer < 1) {
			this.mtp_timer = 120;
			this.game_started = true;
			// get winner
			// round end
			clearTimeout(start);
		} else {
			if(this.current_players > 1) {
				this.mtp_timer--;
				this.round_start();
			}
		}
	}, 1000);
};

game.prototype.round_end = function() {
	// save new data to database
};

game.prototype.new_player = function(user_id, items_data) {
	if(++this.current_players > 1) {
		this.round_start();
	}
	this.emitter.emit("new_player", { user_id, items_data });
};

module.exports = exports = game;