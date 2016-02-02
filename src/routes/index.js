'use strict';

const express = require('express');
const chat = require('../controllers/chat');
const helpers = require('../controllers/helpers');
const server_stats = require('../statistics');

const router = express.Router();

router.get('/', (req, res, next) => {
	if(req.isAuthenticated()) {
		chat.check_admin(req.user.id).then(function(admin) {
			return admin;
		}).then(function(admin) {
			res.render('index', {
				user: req.user,
				chatMod: (admin.type > -1) ? true : false,
				total_users: server_stats.logged_users,
				total_users_text: helpers.logged_users(server_stats.logged_users)
			});
		});
	} else {
		res.render('index', {
			user: req.user,
			chatMod: false,
			total_users: server_stats.logged_users,
			total_users_text: helpers.logged_users(server_stats.logged_users)
		});
	}
});

module.exports = router;
