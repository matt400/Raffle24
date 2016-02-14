'use strict';

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

const routes = require('./src/routes/index');
const helpers = require('./src/controllers/helpers');
const config = require('./config');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const listen = require('./src/lib/listener');
listen.events(io);

const socket = require('./src/socket');
const game = require('./src/controllers/game');

const socket_instance = new socket(io).init();
const game_instance = new game(listen.emit);

// game test
//game_instance.new_player("76561197998372252", [{ appid: '730', contextid: '2', assetid: '4254790278', classid: '926978479', instanceid: '0', amount: 1, missing: false, icon_url: '-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFAuhqSaKWtEu43mxtbbk6b1a77Twm4Iu8Yl3bCU9Imii1Xt80M5MmD7JZjVLFH-6VnQJQ', icon_url_large: '', icon_drag_url: '', name: 'Skrzynia Chroma 2', market_hash_name: 'Chroma 2 Case', market_name: 'Skrzynia Chroma 2', name_color: 'D2D2D2', background_color: '', type: 'Pojemnik - Standardowej jakości', tradable: true, marketable: true, commodity: true, market_tradable_restriction: 7, fraudwarnings: [], id: '4254790278', actions: [], owner_actions: [], market_marketable_restriction: 0, value: 203 }]);
game_instance.get_winner("e5b14e37b0f5628670d2b7762994fde098bfdf2f5ef0a0044d12dc0d132cc893", "58.78095523267984");

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

http.listen(4446, "127.0.0.1");

module.exports = app;
