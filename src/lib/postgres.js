'use strict';

const Promise = require('bluebird');
const pgp = require('pg-promise')({ promiseLib: Promise }); // bluebird > es6 promises
const config = require('../../config');
var db = pgp(config.postgres_connect);

module.exports = exports = { pgp, db };