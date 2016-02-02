'use strict';

const crypto = require('crypto');
const Promise = require('bluebird');
const validator = require('validator');
const xssFilters = require('xss-filters');

const config = require('../config');
const helpers = require('../src/controllers/helpers');
const chat = require('../src/controllers/chat');

var logged_clients = [];

module.exports = (io) => {
	// http://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name=StatTrak%E2%84%A2%20P250%20%7C%20Steel%20Disruption%20%28Factory%20New%29

	io.on('connection', (socket) => {
		let loggedOn = socket.request.session.passport && socket.request.session.isLoggedIn;

		chat.get_last_messages().then(function(data) {
			data.forEach((data) => {
				io.to(socket.id).emit('new_message', { uqid: data.uniq_id, avatar: data.user_avatar, profile_link: data.profile_link, colorize_admin: helpers.colorize_users(data.type), username: data.username, msg: data.message });
			});
		});

		if (loggedOn) {
			let user = socket.request.session.passport.user;
			let avatar = user._json.avatarmedium;
			let profile_link = user._json.profileurl;
			let username = user.displayName;
			let logged_rc = io.sockets.adapter.rooms['logged_on'];

			console.log(Object.keys(io.engine.clients));
			io.emit('logged_users', { value: Object.keys(io.engine.clients).length, text: helpers.logged_users(Object.keys(io.engine.clients).length) });

			socket.on('send_message', (msgInfo) => {
				let uqid = crypto.randomBytes(32).toString('hex');
				let msg = xssFilters.inHTMLData(msgInfo.msg.trim());

				if(!validator.isNull(msg)) {
					chat.tob_exists(user.id).then(function(t) {
						if(t.exists) {
							if(!t.type) {
								let tob = (!t.data.type) ? "You are timed out to " : "You are banned to ";
								let msg =  tob + helpers.timestamp_convert(t.data.to_time) + " by '" + helpers.timeout_reason(t.data.reason_id.toString()) + "'";
								io.to(socket.id).emit('user_message', { msg: msg });
							} else {
								let msg = "You are timed out and banned to " + helpers.timestamp_convert(t.data[0].to_time) + " by '" + helpers.timeout_reason(t.data[0].reason_id.toString()) + "'";
								io.to(socket.id).emit('user_message', { msg: msg });
							}
						} else {
							chat.check_admin(user.id).then(function(data) {
								io.emit('new_message', { uqid: uqid, avatar: avatar, profile_link: profile_link, colorize_admin: ((data.type > -1) ? helpers.colorize_users(data.type) : ''), username: username, msg: msg });
								chat.new_message(uqid, user.id, username, avatar, msg, profile_link, socket.id, socket.request.sessionID);
							});
						}
					});
				}
			});

			chat.check_admin(user.id).then(function(admin) {
				if(admin.type > -1) {
					socket.on('mod_remove', (data) => {
						chat.remove_message(data.uqid);
						io.emit('remove_message', { uqid: data.uqid, msg: '<message deleted>' });
					});
					socket.on('mod_timeout', (data) => {
						let mod_reason = helpers.timeout_reason(data.reason);
						let mod_time = helpers.timeout_time(data.time);
						if(mod_reason && mod_time) {
							chat.message_by_uqid(data.uqid).then(function(result) {
								if(result) {
									chat.new_mod_action(result.user_id, data.reason, 0, mod_time).then(function(mod_action) {
										if(mod_action.exists) {
											let ma_reason = helpers.timeout_reason(mod_action.data.reason_id.toString());
											let exists_msg = "The user is already timed out by '" + ma_reason + "', timeout expires <strong>" + helpers.timestamp_convert(mod_action.data.to_time) + "</strong>";
											io.to(socket.id).emit('server_message', { msg: exists_msg });
										} else {
											chat.timeout_delete_messages(result.user_id).then(function(time) {
												let msg = time.username + ' has been timed out.';
												//let omsg = "You have been timed out.";
												let reason = 'Reason: ' + mod_reason;
												//io.to(si).emit('server_message', { msg: omsg });
												io.emit('user_timeout', { dl: time.dl, msg: msg, reason: reason });
											});
										}
									});
								} else {
									io.to(socket.id).emit('server_message', { msg: 'Nie znaleziono takiej wiadomości.' });
								}
							});
						}
					});
				}
			});
		
			socket.on('disconnect', () => {
				io.emit('logged_users', { value: Object.keys(io.engine.clients).length, text: helpers.logged_users(Object.keys(io.engine.clients).length) });
			});
		}
	});
}