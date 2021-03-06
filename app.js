'use strict';

const net = require('net');
const express = require('express');
const session = require('express-session');
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;

const iptables = require('./src/lib/iptables');
const routes = require('./src/routes/index');
const helpers = require('./src/controllers/helpers');
const config = require('./config');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const socket = require('./src/socket');

const socket_instance = new socket(io).init();
const sessionStore = new pgSession({ pg: pg, conString: config.postgres_connect, tableName: 'user_sessions' });
const sessionMiddleware = session({ store: sessionStore, resave: false, saveUninitialized: false, cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, secret: config.session_secret });

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
	var err = new Error('File not found');
	err.status = 404;
	next(err);
});

app.use((req, res, next) => {
	var err = new Error();
	err.status = 500;
	next(err);
});

app.use((err, req, res, next) => {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: res.statusCode
	});
});

iptables.newRule({ action: "-F" });
iptables.allow({ protocol: "tcp", src: "127.0.0.1", dport: 4446, sudo: true });
iptables.allow({ protocol: "tcp", src: "127.0.0.1", dport: 4447, sudo: true });
iptables.drop({ protocol: 'tcp', dport: 4446, sudo: true });
iptables.drop({ protocol: 'tcp', dport: 4447, sudo: true });

http.listen(4446, "127.0.0.1");

const game_server = net.createServer((socket) => {
	socket.on("data", (data) => {
		let response = JSON.parse(data);
		console.log(response);
	});
	socket.on("end", () => {
		console.log("DISCONNECT"); // logging
	});
	socket.pipe(socket);
}).listen(4447);

module.exports = app;
