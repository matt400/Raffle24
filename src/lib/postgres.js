'use strict';

const pgp = require('pg-promise')();
const config = require('../../config');
var db = pgp(config.postgres_connect);

module.exports = { pgp, db };