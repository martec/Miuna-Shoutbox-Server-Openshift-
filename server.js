// server.js

// set up ======================================================================
// get all the tools we need
var express = require('express');
var cors = require('cors');
var app = express();
var	port = process.env.OPENSHIFT_NODEJS_PORT;
var	ip = process.env.OPENSHIFT_NODEJS_IP;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var jwt = require('jsonwebtoken');
var auth = require('basic-auth');
var socketio = require('socket.io');
var User = require('./lib/user');
var db = require('./lib/miunashout-db');
var bcrypt = require('bcrypt-nodejs');
var whitelist = [];
var secret_st = '';
var chrlimit = '';
var xss = require('node-xss').clean;
var socketio_jwt = require('socketio-jwt');
var usernames = {};
var uidlist = {};
var dbcredential = process.env.OPENSHIFT_MONGODB_DB_URL;
var dbname = 'miunashout';
var url = dbcredential + dbname;

// initialize db ===============================================================

mongoose.connect(url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

// set up our express application

User.findOne({'local.check': '1'}).exec(function(err, docs){
	whitelist = docs.local.origin;
	secret_st = docs.local.spku;
	chrlimit = docs.local.chrlimit;
});

var corsOptions = {
  origin: function(origin, callback){
	var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
	callback(null, originIsWhitelisted);
  }
};

app.use(cors(corsOptions), function(req, res, next) {
	next();
});

app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
app.use(session({ secret: 'miunashoutboxpassportsessionsecret', resave: true, saveUninitialized: true })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// launch ======================================================================
var server = app.listen(port, ip);
var io = socketio.listen(server);

//Routes ======================================================

// =====================================
// HOME PAGE (with login links) ========
// =====================================
app.get('/', function(req, res) {
	req.logout();
	res.render('index.ejs'); // load the index.ejs file
});

app.get('/sucess', function(req, res) {
	req.logout();
	res.render('sucess.ejs'); // load the index.ejs file
});

app.post('/registeruser', function(req, res){
	User.findOne({ 'local.user' : auth(req).name }, function(err, data) {
		if (data) {
			if (bcrypt.compareSync(auth(req).pass, data.local.password)) {
				db.regusr(req);
				res.send({sucess: 'sucess'});
				res.end();
			}
			else {
				res.send({error: 'admpassinc'});
				res.end();
			}
		}
		else {
			res.send({error: 'admusarinc'});
			res.end();
		}
	});
});

app.post('/login', function(req, res){
	db.logusr(req.body, function(err, data){
		if (data) {
			if (bcrypt.compareSync(req.body.pass, data.local.password)) {
				var token = jwt.sign(data.local, secret_st, { expiresInMinutes: 60*5 });
				res.send({token: token});
				res.end();
			}
			else {
				res.send({error: 'incpassword'});
				res.end();
			}
		}
		else {
			res.send({error: 'usrnotfound'});
			res.end();
		}
	});
});

// =====================================
// Settings ============================
// =====================================
// show the settings form
app.get('/settings', function(req, res) {

	// check if already configured, if not will go to signup page
	User.find({}).count({}, function(err, docs){
		if (docs==0) {
			res.render('settings.ejs', { message: req.flash('signupMessage') });
		}
		else {
			res.redirect('/sucess');
		}
	});
});

// process the settings form
app.post('/settings', passport.authenticate('local-signup', {
	successRedirect : '/sucess', // redirect to the secure profile section
	failureRedirect : '/settings', // redirect back to the signup page if there is an error
	failureFlash : true // allow flash messages
}));

// =====================================
// LOGOUT ==============================
// =====================================
app.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

app.post('/newposthread', function(req, res){
	User.findOne({ 'local.user' : auth(req).name }, function(err, data) {
		if (data) {
			if (bcrypt.compareSync(auth(req).pass, data.local.password)) {
				db.saveMsgnp(req.body);
				res.send({sucess: 'sucess'});
				res.end();
			}
			else {
				res.send({error: 'admpassinc'});
				res.end();
			}
		}
		else {
			res.send({error: 'admusarinc'});
			res.end();
		}
	});
});

// socket.io ======================================================================

var secret = '';

User.findOne({'local.check': '1'}).exec(function(err, docs){
	if (docs) {
		secret = docs.local.spku;
	}
	start(secret);
});

function start(secret) {
	io.sockets.on('connection', socketio_jwt.authorize({
		secret: secret,
		timeout: 15000 // 15 seconds to send the authentication message
		})).on('authenticated', function(socket) {
			socket.on('ckusr', function (data) {
				if (data.uid==socket.decoded_token.uid) {
					db.c_oneusr(data, function(err, docs){
						if(docs) {
							if(docs.ban=='1') {
								io.to(socket.id).emit('ckusr', 'banned');
								socket.disconnect();
							}
							else {
								io.to(socket.id).emit('ckusr', 'ok');
								initializeConnection(socket);
							}
						}
						else {
							io.to(socket.id).emit('ckusr', 'ok');
							initializeConnection(socket);
						}
					});
				}
				else {
					io.to(socket.id).emit('ckusr', 'disconnect');
					socket.disconnect();
				}
			});
	});
}

function initializeConnection(socket){
	showActiveUsers(socket);
	handleClientDisconnections(socket);
	handleshowOldMsgs(socket);
	handleMessageBroadcasting(socket);
	handlecountMsgs(socket);
	handleshowfrstpagelogMsgs(socket);
	handleshowlognextMsgs(socket);
	handleshowlogbackMsgs(socket);
	handleupdbanl(socket);
	handlegetnot(socket);
	handleupdnot(socket);
	handleupdmsg(socket);
	handlereadonemsg(socket);
	handlepurge(socket);
	handlermvmsg(socket);
	handleshowOldpmMsgs(socket);
	handlesgetpml(socket);
}

function showActiveUsers(socket){
	socket.on('add user', function (username) {
		socket.uid = socket.decoded_token.uid;
		uidlist[socket.uid] = 1;
		username = socket.decoded_token.user;
		socket.username = username;
		usernames[socket.uid] = username;
		socket.emit('login', {
			usernames: usernames,
			uidlist: uidlist
		});
		socket.broadcast.emit('user joined', {
			usernames: usernames,
			uidlist: uidlist,
			uid: socket.uid
		});
		data = [];
		data["nick"] = socket.decoded_token.user;
		data["uid"] = socket.decoded_token.uid;
		data["id"] = socket.id;
		db.updpml(data);
	});
}

function handleshowOldMsgs(socket){
	socket.on('getoldmsg', function(data){
		data["uid"] = socket.decoded_token.uid;
		db.getOldMsgs(data, function(err, docs){
			socket.emit('load old msgs', docs);
		});
	});
}

function handleshowOldpmMsgs(socket){
	socket.on('getoldpmmsg', function(data){
		data["uid"] = socket.decoded_token.uid;
		db.getOldpmMsgs(data, function(err, docs){
			socket.emit('load old pm msgs', docs);
		});
	});
}

function handlegetnot(socket){
	socket.on('getnot', function(data){
		db.getnoti(function(err, docs){
			socket.emit('getnot', docs);
		});
	});
}

function handleupdnot(socket){
	socket.on('updnot', function(data){
		if (socket.decoded_token.mod=='1') {
			db.updnoti(data);
			io.emit('updnot', xss(data));
		}
	});
}

function handlereadonemsg(socket){
	socket.on('readonemsg', function(data){
		db.readonemsg(data, function(err, docs){
			socket.emit('readonemsg', docs);
		});
	});
}

function handleupdmsg(socket){
	socket.on('updmsg', function(data){
		data["tk_uid"] = socket.decoded_token.uid;
		data["tk_mod"] = socket.decoded_token.mod;
		db.updmsg(data, function(err, docs){
			io.emit('updmsg', docs);
		});
	});
}

function handlermvmsg(socket){
	socket.on('rmvmsg', function(data){
		data["tk_uid"] = socket.decoded_token.uid;
		data["tk_mod"] = socket.decoded_token.mod;
		db.rmvmsg(data, function(err, docs){
			if (docs) {
				io.emit('rmvmsg', data);
			}
		});
	});
}

function handlepurge(socket){
	socket.on('purge', function(data){
		if (socket.decoded_token.mod=='1') {
			db.purge();
			io.emit('purge');
		}
	});
}

function handlecountMsgs(socket){
	socket.on('countmsg', function(data){
		data["uid"] = socket.decoded_token.uid;
		db.getcountMsgs(data, function(err, docs){
			socket.emit('countmsg', docs);
		});
	});
}

function handleshowfrstpagelogMsgs(socket){
	socket.on('logfpgmsg', function(data){
		data["uid"] = socket.decoded_token.uid;
		db.getfpglogMsgs(data, function(err, docs){
			socket.emit('logfpgmsg', docs);
		});
	});
}

function handleshowlognextMsgs(socket){
	socket.on('logmsgnext', function(data){
		data["uid"] = socket.decoded_token.uid;
		db.getlogMsgsnext(data, function(err, docs){
			socket.emit('logmsgnext', docs);
		});
	});
}

function handleshowlogbackMsgs(socket){
	socket.on('logmsgback', function(data){
		data["uid"] = socket.decoded_token.uid;
		db.getlogMsgsback(data, function(err, docs){
			socket.emit('logmsgback', docs);
		});
	});
}

function handlesgetpml(socket){
	socket.on('getpml', function(data){
		db.getpml(function(err, docs){
			socket.emit('getpml', docs);
		});
	});
}

function handleupdbanl(socket){
	socket.on('updbanl', function(data){
		if (socket.decoded_token.mod=='1') {
			db.updbanl(data, function(err, docs){
				if (docs.ban=='1') {
					io.to(docs.id).emit('ban', 'disconnect');
				}
			});
		}
	});
}

function handleMessageBroadcasting(socket){
	//avoid abuse http://stackoverflow.com/a/668327
	rate = 5.0;
	per	 = 8.0;
	allowance = rate;
	last_check = Date.now()/1000;
	socket.on('message', function(data){
		current = Date.now()/1000;
		time_passed = current - last_check;
		last_check = current;
		allowance += time_passed * (rate / per);
		if (allowance > rate) {
			allowance = rate;
		}
		if (allowance < 1.0) {
			//discard message and disconnect
			io.to(socket.id).emit('abuse', 'abuse');
			socket.disconnect();
		}
		else {
			allowance -= 1.0;
			data["created"] = Date.now();
			data["tk_uid"] = socket.decoded_token.uid;
			data["tk_nick"] = socket.decoded_token.user;
			data["tk_avatar"] = socket.decoded_token.avatar;
			data["tk_gid"] = socket.decoded_token.gid;
			data["tk_suid"] = ''+socket.decoded_token.uid+','+data.uidto+'';
			if (data.msg.length<=parseInt(chrlimit)) {
				db.saveMsg(data, function(err, docs){
					io.emit('message', docs);
				});
			}
			else {
				data["msg"] = data.msg.slice(0, parseInt(chrlimit));
				db.saveMsg(data, function(err, docs){
					io.emit('message', docs);
				});
			}
		}
	});
}

exports.emtnewpsthread = function(docs) {
	io.emit('message', docs);
};

function handleClientDisconnections(socket){
	socket.on('disconnect', function () {
		delete usernames[socket.uid];
		delete uidlist[socket.uid];

		socket.broadcast.emit('user left', {
			usernames: usernames,
			uidlist: uidlist,
			uid: socket.uid
		});
	});
}