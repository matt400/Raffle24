const EventEmitter = require('events').EventEmitter;
const listener = new EventEmitter();

module.exports.events = exports.events = function(io) {
	listener.on('test', (data) => {
		console.log(data);
	});
}

module.exports.emit = exports.emit = listener;