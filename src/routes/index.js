'use strict';

const express = require('express');
const chat = require('../database/chat');
const helpers = require('../controllers/helpers');
const statistics = require('../statistics');
const router = express.Router();

router.get('/index', (req, res, next) => {
	//console.log(res.__("messages.Hello"));
	let user_id = (req.user) ? req.user.id : false;
	chat.permission(user_id).then((data) => {
		let has_perm = (data) ? data.exists : false;
		res.render('index', {
			user: req.user,
			chatMod: has_perm,
			total_users: statistics.users_counter,
			total_users_text: helpers.logged_users(statistics.users_counter)
		});
	});
});

module.exports = router;
