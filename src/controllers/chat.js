'use strict';

const Promise = require('bluebird');
const client = require('../lib/postgres');

var db = {
	permission: (sid) => {
		if(sid) {
			return client.db.query('SELECT * FROM chat_permissions WHERE user_id = $1 AND active = 1', sid).then((result) => {
				if(result) {
					if(result[0].type > 0) {
						return { exists: true, type: result[0].type };
					} else {
						return { exists: false };
					}
				} else {
					return { exists: false };
				}
			}).catch((error) => {
				console.log(error); // logging
			});
		} else {
			return Promise.resolve(false);
		}
	},
	new_message: (uqid, user_id, username, avatar, message, profile_link, socket_s, user_s) => {
		let date = ~~(Date.now() / 1000);
		return client.db.none("INSERT INTO chat (uniq_id, username, user_avatar, created_time, message, profile_link, user_id, socket_sess, user_sess) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [uqid, username, avatar, date, message, profile_link, user_id, socket_s, user_s]).catch((error) => {
			console.log(error); // logging
		});
	},
	message_by_uqid: (uqid) => {
		return client.db.one("SELECT * FROM chat WHERE uniq_id = $1", uqid).then((result) => {
			return result;
		}).catch((error) => {
			console.log(error); // logging
		});
	},
	remove_message: (uqid) => {
		return client.db.none("DELETE FROM chat WHERE uniq_id = $1", uqid).catch((error) => {
			console.log(error); // logging
		});
	},
	get_last_messages: () => {
		return client.db.query('WITH sub AS (SELECT c.chat_id, c.uniq_id, c.username, c.user_avatar, c.created_time, c.message, c.profile_link, cp.user_id, cp.type, cp.active FROM chat c LEFT JOIN chat_permissions cp ON c.user_id = cp.user_id ORDER BY c.chat_id DESC LIMIT 15) SELECT * FROM sub ORDER BY chat_id ASC').then((result) => {
			return result;
		}).catch((err) => {
			console.log(err); //logging
		});
	},
	new_mod_action: (user_id, reason_id, type, time) => {
		let to_time = (time > 0) ? ~~((Date.now() + (1000 * time)) / 1000) : 0;
		return client.db.query('SELECT * FROM chat_mod_actions WHERE user_id = $1 AND type = $2', [user_id, type]).then((result) => {
			if(result.length) {
				return { exists: true, data: result[0] };
			} else {
				client.db.none("INSERT INTO chat_mod_actions (user_id, reason_id, to_time, type) VALUES ($1, $2, $3, $4)", [user_id, reason_id, to_time, type]).catch((err) => {
					console.log(err); //logging
				});
				return { exists: false };
			}
		}).catch((err) => {
			console.log(err); //logging
		});
	},
	tob_exists: (user_id) => {
		return client.db.query('SELECT * FROM chat_mod_actions WHERE user_id = $1', user_id).then((result) => {
			if(result.length) {
				return Promise.map(result, (data) => {
					let time = (~~(Date.now() / 1000) > data.to_time);
					if(time) {
						client.db.none("DELETE FROM chat_mod_actions WHERE user_id = $1 AND type = $2", [user_id, data.type]).catch((error) => {
							console.log(error); // logging
						});
						return { deleted: 1 };
					} else {
						return { deleted: 0, data: data };
					}
				}).then((types) => {
					if(types.length == 1) {
						if(!types[0].deleted) {
							return { exists: true, data: types[0].data, type: 0 };
						} else {
							return { exists: false };
						}
					} else if(types.length > 1) {
						let del = types[0].deleted && types[1].deleted;
						if(!del) {
							let cd = [types[0].data].concat([types[1].data]);
							return { exists: true, data: cd, type: 1 };
						} else {
							return { exists: false };
						}
					}
				});
			} else {
				return { exists: false };
			}
		}).catch((err) => {
			console.log(err); //logging
		});
	},
	chat_delete_messages: (user_id) => {
		let date_bef = new Date().setDate(new Date().getDate() - 3);
		return client.db.query('SELECT * FROM chat WHERE user_id = $1 AND created_time <= $2', [user_id, date_bef]).then((result) => {
			return Promise.map(result, (data) => {
				return data.uniq_id;
			}).then((uniq_id) => {
				return client.db.none("DELETE FROM chat WHERE user_id = $1 AND created_time <= $2", [user_id, date_bef]).then(() => {
					return { dl: uniq_id, username: result[0].username };
				});
			});
		}).catch((err) => {
			console.log(err); //logging
		});
	}
};

module.exports = exports = db;