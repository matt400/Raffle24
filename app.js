'use strict';

const express = require('express');
const session = require('express-session');
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);
const connect = require('connect');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;

const chat = require('./src/controllers/chat');
const routes = require('./src/routes/index');
const helpers = require('./src/controllers/helpers');
const config = require('./config');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const socket = require('./src/socket')(io);

var sessionStore = new pgSession({ pg: pg, conString: config.postgres_connect, tableName: 'user_sessions' });
var sessionMiddleware = session({ store: sessionStore, resave: false, saveUninitialized: false, cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, secret: config.session_secret });

io.use((socket, next) => {
	sessionMiddleware(socket.request, socket.request.res, next);
});

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((obj, done) => {
	done(null, obj);
});

passport.use(new SteamStrategy({
	returnURL: 'http://' + config.page_adress + '/auth/steam/return',
	realm: 'http://' + config.page_adress + '/',
	apiKey: config.steam_api_key
}, (identifier, profile, done) => {
		process.nextTick(() => {
			profile.identifier = identifier;
			return done(null, profile);
		});
	}
));

app.set('views', path.join(__dirname, 'src/views'));
app.set('view engine', 'ejs');

//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
	req.session.isLoggedIn = req.isAuthenticated();
	next();
});

app.use('/', routes);

app.get('/auth/steam', passport.authenticate('steam', { failureRedirect: '/' }), (req, res) => {
	res.redirect('/');
});

app.get('/auth/steam/return', passport.authenticate('steam', { failureRedirect: '/' }), (req, res) => {
	res.redirect('/');
});

app.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/');
});

app.use((req, res, next) => {
	var err = new Error();
	err.status = 404;
	next(err);
});

/*
redis.monitor(function (err, monitor) {
	monitor.on('monitor', function (time, args) {
		var arg = args.toString();
		if(arg.indexOf("set,uo:") > -1 || arg.indexOf("del,uo:") > -1) {
			db.users_online_total(function(data) {
				io.emit('logged_users', { value: data, text: helpers.logged_users(data) });
			});
		}
	});
});
*/

if (app.get('env') === 'development') {
	app.use((err, req, res, next) => {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

app.use((err, req, res, next) => {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

http.listen(4446, "127.0.0.1");

module.exports = app;
