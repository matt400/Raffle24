'use strict';

const config = require('../../config');

var helpers = {
	logged_users: (value) => {
		return (value !== 1) ? 'Zalogowanych' : 'Zalogowany';
	},
	timestamp_convert: (timestamp) => {
		let date = new Date((timestamp + (60 * 60)) * 1000).toISOString();
		let format = date.substr(0, 10) + " " + date.substr(11, 8);
		return format;
	},
	colorize_users: (type) => {
		switch(type) {
			case 1:
				return ` style="color: ${config.admin_color};"`;
				break;
			case 2:
				return ` style="color: ${config.mod_color};"`;
				break;
		}
	},
	timeout_time: (type) => {
		switch(type) {
			case '1':
				return 60;
				break;
			case '2':
				return 300;
				break;
			case '3':
				return 600;
				break;
			case '4':
				return 900;
				break;
			case '5':
				return 1200;
				break;
			case '6':
				return 1800;
				break;
			case '7':
				return 3600;
				break;
			case '8':
				return 7200;
				break;
			case '9':
				return 10800;
				break;
			case '10':
				return 14400;
				break;
			case '11':
				return 21600;
				break;
			case '12':
				return 43200;
				break;
			default:
				return false;
				break;
		}
	},
	timeout_reason: (type) => {
		switch(type) {
			case '1':
				return 'Obrażanie / wyzywanie';
				break;
			case '2':
				return 'Reklama';
				break;
			case '3':
				return 'Spam';
				break;
			default:
				return false;
				break;
		}
	}
};

module.exports = helpers;