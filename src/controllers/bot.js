'use strict';

const Promise = require('bluebird');

function bot(emitter) {
	this.emitter = emitter;
}

bot.prototype.test = function() {
	this.emitter.emit("test", "test");
};

module.exports = exports = bot;