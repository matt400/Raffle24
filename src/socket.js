'use strict';

const crypto = require('crypto');
const Promise = require('bluebird');
const ejs = require('ejs');
const validator = require('validator');
const xssFilters = require('xss-filters');

const config = require('../config');
const helpers = require('../src/controllers/helpers');
const chat = require('../src/database/chat');

var statistics = require('../src/statistics');

function socket(io) {
	this.io = io;
	this.people = [];
}

socket.prototype.ic = function(mode) {
	if(mode) {
		statistics.users_counter++;
		this.io.emit('logged_users', { value: statistics.users_counter, text: helpers.logged_users(statistics.users_counter) });
	} else {
		statistics.users_counter--;
		this.io.emit('logged_users', { value: statistics.users_counter, text: helpers.logged_users(statistics.users_counter) });
	}
}

socket.prototype.init = function() {
	// http://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name=StatTrak%E2%84%A2%20P250%20%7C%20Steel%20Disruption%20%28Factory%20New%29
	this.io.on('connection', (socket) => {
		let req = socket.request;
		let loggedOn = req.session.passport && req.session.isLoggedIn;

		//chat.get_slow_mode("chat_slow_mode");

		chat.get_last_messages().then((data) => {
			data.forEach((data) => {
				this.io.to(socket.id).emit('new_message', { uqid: data.uniq_id, avatar: data.user_avatar, profile_link: data.profile_link, colorize_admin: helpers.colorize_users(data.type), username: data.username, msg: data.message });
			});
		});

		if (loggedOn) {
			let user = req.session.passport.user;
			let avatar = user._json.avatarmedium;
			let profile_link = user._json.profileurl;
			let username = user.displayName;
			let logged_temp = {};

			socket.on('login', (uqid) => {
				if(!(logged_temp = this.people[uqid])) {
					logged_temp = this.people[uqid] = { uqid: uqid, opened_tabs: 0 };
					this.ic(true);
				} else {
					if (!this.people.disconnected) {
						this.people.opened_tabs++;
					}
				}
				if (logged_temp.disconnected) {
					clearTimeout(logged_temp.timeout);
					logged_temp.disconnected = false;
				}
				this.people[uqid] = logged_temp;
				//socket.emit('logged_users', { value: statistics.users_counter, text: helpers.logged_users(statistics.users_counter) });
			});

			socket.on('send_message', (msgInfo) => {
				let uqid = crypto.randomBytes(32).toString('hex');
				let msg = xssFilters.inHTMLData(msgInfo.msg.trim());

				if(!validator.isNull(msg)) {
					chat.tob_exists(user.id).then((t) => {
						if(t.exists) {
							if(!t.type) {
								let tob = (!t.data.type) ? "You are timed out to " : "You are banned to ";
								let msg =  tob + helpers.timestamp_convert(t.data.to_time) + " by '" + helpers.mod_reason(t.data.reason_id.toString()) + "'";
								this.io.to(socket.id).emit('user_message', { msg: msg });
							} else {
								let msg = "You are timed out and banned to " + helpers.timestamp_convert(t.data[0].to_time) + " by '" + helpers.mod_reason(t.data[0].reason_id.toString()) + "'";
								this.io.to(socket.id).emit('user_message', { msg: msg });
							}
						} else {
							chat.permission(user.id).then((data) => {
								if(data.exists) {
									if(msg.substr(0, 1) == "!") {
										this.chat_command(msg, socket.id);
									} else {
										this.io.emit('new_message', { uqid: uqid, avatar: avatar, profile_link: profile_link, colorize_admin: helpers.colorize_users(data.type), username: username, msg: msg });
										chat.new_message(uqid, user.id, username, avatar, msg, profile_link, socket.id, req.sessionID);
									}
								} else {
									this.io.emit('new_message', { uqid: uqid, avatar: avatar, profile_link: profile_link, colorize_admin: '', username: username, msg: msg });
									chat.new_message(uqid, user.id, username, avatar, msg, profile_link, socket.id, req.sessionID);
								}
							});
						}
					});
				}
			});
			
			chat.permission(user.id).then((perm) => {
				if(perm.exists) {
					socket.on('mod_remove', (data) => {
						chat.remove_message(data.uqid);
						this.io.emit('remove_message', { uqid: data.uqid, msg: '<message deleted>' });
					});
					socket.on('mod_timeout', (data) => {
						let mod_reason = helpers.mod_reason(data.reason);
						let mod_time = helpers.timeout_time(data.time);
						if(mod_reason && mod_time) {
							chat.message_by_uqid(data.uqid).then((result) => {
								if(result) {
									chat.new_mod_action(result.user_id, data.reason, 0, mod_time).then((mod_action) => {
										if(mod_action.exists) {
											let actual_date = ~~(Date.now() / 1000);
											let ma_reason = helpers.mod_reason(mod_action.data.reason_id.toString());
											let exists_msg;
											if(mod_action.data.to_time > actual_date) {
												exists_msg = "This user is already timed out by '" + ma_reason + "'. Expires <strong>" + helpers.timestamp_convert(mod_action.data.to_time) + "</strong>";
											} else {
												exists_msg = "This user has not wrote anything yet.";
											}
											this.io.to(socket.id).emit('server_message', { msg: exists_msg });
										} else {
											chat.chat_delete_messages(result.user_id).then((time) => {
												let msg = time.username + ' has been timed out.';
												//let omsg = "You has been timed out.";
												let reason = 'Reason: ' + mod_reason;
												//io.to(si).emit('server_message', { msg: omsg });
												this.io.emit('user_action', { dl: time.dl, msg: msg, reason: reason });
											});
										}
									});
								} else {
									this.io.to(socket.id).emit('server_message', { msg: 'Nie znaleziono takiej wiadomości.' });
								}
							});
						}
					});
					socket.on('mod_ban', (data) => {
						let mod_reason = helpers.mod_reason(data.reason);
						let mod_time = helpers.ban_time(data.time);
						if(mod_reason && mod_time) {
							chat.message_by_uqid(data.uqid).then((result) => {
								if(result) {
									chat.new_mod_action(result.user_id, data.reason, 1, mod_time).then((mod_action) => {
										if(mod_action.exists) {
											let actual_date = ~~(Date.now() / 1000);
											let ma_reason = helpers.mod_reason(mod_action.data.reason_id.toString());
											let exists_msg;
											if(mod_action.data.to_time > 0) {
												if(mod_action.data.to_time > actual_date) {
													exists_msg = "This user is already banned by '" + ma_reason + "'. Expires <strong>" + helpers.timestamp_convert(mod_action.data.to_time) + "</strong>";
												} else {
													exists_msg = "This user has not wrote anything yet.";
												}
											} else {
												exists_msg = "This user is already permanent banned by '" + ma_reason + "'";
											}
											this.io.to(socket.id).emit('server_message', { msg: exists_msg });
										} else {
											chat.chat_delete_messages(result.user_id).then((time) => {
												let msg = time.username + ' has been banned.';
												//let omsg = "You has been timed out.";
												let reason = 'Reason: ' + mod_reason;
												//io.to(si).emit('server_message', { msg: omsg });
												this.io.emit('user_action', { dl: time.dl, msg: msg, reason: reason });
											});
										}
									});
								}
							});
						}
					});
				}
			});
		
			socket.on('disconnect', (type) => {
				if (logged_temp.tabs > 0) {
					return;
				}
				logged_temp.disconnected = true;
				logged_temp.timeout = setTimeout(() => {
					if (logged_temp.disconnected) {
						delete this.people[logged_temp.uqid];
						this.ic(false);
					}
				}, 2500)
			});
		}
	});
}

socket.prototype.chat_command = function(msg, socket) {
	let m = msg.substr(1).split(' ');
	let t = m[1];
	// todo global info
	switch(m[0]) {
		case 'unban':
			if(!isNaN(t) && t.length > 16 && t.length < 20) {
				chat.remove_action(t, 1).then((result) => {
					if(result > 0) {
						this.io.to(socket).emit('server_message', { msg: "Użytkownik o ID " + t + " został odbanowany." });
					} else {
						this.io.to(socket).emit('server_message', { msg: "Nie istnieje użytkownik o ID: " + t });
					}
				});
			} else {
				this.io.to(socket).emit('server_message', { msg: "Nieprawidłowy format" });
			}
			break;
		case 'untimeout':
			if(!isNaN(t) && t.length > 16 && t.length < 20) {
				chat.remove_action(t, 0).then((result) => {
					if(result > 0) {
						this.io.to(socket).emit('server_message', { msg: "Użytkownik o ID " + t + " nie ma już timeouta." });
					} else {
						this.io.to(socket).emit('server_message', { msg: "Nie istnieje użytkownik o ID: " + t });
					}
				});
			} else {
				this.io.to(socket).emit('server_message', { msg: "Nieprawidłowy format" });
			}
			break;
		case 'slowmode':
			this.io.to(socket).emit('server_message', { msg: "!slowmode" });
			break;
		case 'help':
			let help = "<ol><li><strong>!unban (SteamID64)</strong></li><li><strong>!untimeout (SteamID64)</strong></li><li><strong>!slowmode (seconds)</strong> - 0 wyłączenie</li></ol>";
			this.io.to(socket).emit('server_message', { msg: help });
			break;
		default:
			this.io.to(socket).emit('server_message', { msg: "Komenda nie istnieje. Napisz !help, aby uzyskać wszystkie komendy." });
			break;
	}
}

module.exports = exports = socket;