'use strict';

const crypto = require('crypto');
const Promise = require('bluebird');
const validator = require('validator');
const xssFilters = require('xss-filters');

const config = require('../config');
const helpers = require('../src/controllers/helpers');
const chat = require('../src/controllers/chat');

var statistics = require('../src/statistics');
var people = [];

module.exports = (io) => {
	// http://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name=StatTrak%E2%84%A2%20P250%20%7C%20Steel%20Disruption%20%28Factory%20New%29

	io.on('connection', (socket) => {
		let loggedOn = socket.request.session.passport && socket.request.session.isLoggedIn;

		chat.get_last_messages().then((data) => {
			data.forEach((data) => {
				io.to(socket.id).emit('new_message', { uqid: data.uniq_id, avatar: data.user_avatar, profile_link: data.profile_link, colorize_admin: helpers.colorize_users(data.type), username: data.username, msg: data.message });
			});
		});

		if (loggedOn) {
			let user = socket.request.session.passport.user;
			let avatar = user._json.avatarmedium;
			let profile_link = user._json.profileurl;
			let username = user.displayName;
			let logged_temp = {};

			socket.on('login', (uqid) => {
				if(!(logged_temp = people[uqid])) {
					statistics.users_counter++;
					logged_temp = people[uqid] = { uqid: uqid, opened_tabs: 0 };
					socket.emit('logged_users', { value: statistics.users_counter, text: helpers.logged_users(statistics.users_counter) });
				} else {
					if (!people.disconnected) {
						people.opened_tabs++;
					}
				}
				if (logged_temp.disconnected) {
					clearTimeout(logged_temp.timeout);
					logged_temp.disconnected = false;
				}
				people[uqid] = logged_temp;
				socket.emit('logged_users', { value: statistics.users_counter, text: helpers.logged_users(statistics.users_counter) });
			});

			socket.on('send_message', (msgInfo) => {
				let uqid = crypto.randomBytes(32).toString('hex');
				let msg = xssFilters.inHTMLData(msgInfo.msg.trim());

				if(!validator.isNull(msg)) {
					chat.tob_exists(user.id).then((t) => {
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
							chat.permission(user.id).then((data) => {
								io.emit('new_message', { uqid: uqid, avatar: avatar, profile_link: profile_link, colorize_admin: ((data.exists) ? helpers.colorize_users(data.type) : ''), username: username, msg: msg });
								chat.new_message(uqid, user.id, username, avatar, msg, profile_link, socket.id, socket.request.sessionID);
							});
						}
					});
				}
			});
			
			chat.permission(user.id).then((perm) => {
				if(perm.exists) {
					socket.on('mod_remove', (data) => {
						chat.remove_message(data.uqid);
						io.emit('remove_message', { uqid: data.uqid, msg: '<message deleted>' });
					});
					socket.on('mod_timeout', (data) => {
						let mod_reason = helpers.timeout_reason(data.reason);
						let mod_time = helpers.timeout_time(data.time);
						if(mod_reason && mod_time) {
							chat.message_by_uqid(data.uqid).then((result) => {
								if(result) {
									chat.new_mod_action(result.user_id, data.reason, 0, mod_time).then((mod_action) => {
										if(mod_action.exists) {
											let actual_date = ~~(Date.now() / 1000);
											let ma_reason = helpers.timeout_reason(mod_action.data.reason_id.toString());
											let exists_msg;
											if(mod_action.data.to_time > actual_date) {
												exists_msg = "This user is already timed out by '" + ma_reason + "', timeout expires <strong>" + helpers.timestamp_convert(mod_action.data.to_time) + "</strong>";
											} else {
												exists_msg = "This user has not wrote anything yet.";
											}
											io.to(socket.id).emit('server_message', { msg: exists_msg });
										} else {
											chat.timeout_delete_messages(result.user_id).then((time) => {
												let msg = time.username + ' has been timed out.';
												//let omsg = "You has been timed out.";
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
		
			socket.on('disconnect', (type) => {
				if (logged_temp.tabs > 0) {
					return;
				}
				logged_temp.disconnected = true;
				logged_temp.timeout = setTimeout(() => {
					if (logged_temp.disconnected) {
						statistics.users_counter--;
						delete people[logged_temp.uqid];
						socket.emit('logged_users', { value: statistics.users_counter, text: helpers.logged_users(statistics.users_counter) });
					}
				}, 2500)
			});
		}
	});
}