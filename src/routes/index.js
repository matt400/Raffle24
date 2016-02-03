'use strict';

const express = require('express');
const chat = require('../controllers/chat');
const helpers = require('../controllers/helpers');

var statistics = require('../statistics');

const router = express.Router();

router.get('/index', (req, res, next) => {
	chat.permission(req.user.id).then(function(data) {
		let has_perm = (req.isAuthenticated()) ? data.exists : false;
		console.log(has_perm);
		res.render('index', {
			user: req.user,
			chatMod: has_perm,
			total_users: statistics.users_counter,
			total_users_text: helpers.logged_users(statistics.users_counter)
		});
	});
});

module.exports = router;
