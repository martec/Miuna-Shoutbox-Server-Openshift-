// server.js

// set up ======================================================================
// get all the tools we need
var express = require('express');
var cors = require('cors');
var crypto = require('crypto');
var app = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
var socketio = require('socket.io');
var confdb = require('./lib/config-db.js');
var conf = require('./lib/config.js');
var db = require('./lib/miunashout-db');
var whitelist = [];
var secret_st = '';
var chrlimit = '';
var xss = require('node-xss').clean;
var socketio_jwt = require('socketio-jwt');
var usernames = {};
var uidlist = {};
var id = {};
var msgtime = {};
var badwl = {};

// initialize db ===============================================================

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
ip = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
url = process.env.url;

if (url) {
	mongoose.connect(url, {useMongoClient: true}); // connect to our database
	start();
}

// set up our express application
function start() {
	confdb.findOne({'check': '1'}).exec(function(err, docs){
		if (docs) {
			whitelist = docs.origin;
			secret_st = docs.spku;
			chrlimit = docs.chrlimit;
			if (docs.badwld) {
				badwl = JSON.parse(docs.badwld);
			}
		}
		startall();
	});
}

function startall() {
	var corsOptions = {
	  origin: function(origin, callback){
		var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
		callback(null, originIsWhitelisted);
	  }
	};

	app.use(cors(corsOptions), function(req, res, next) {
		next();
	});

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));

	app.set('view engine', 'ejs'); // set up ejs for templating

	// launch ======================================================================
	var server = app.listen(port, ip);
	var io = socketio.listen(server);

	//Routes ======================================================

	// =====================================
	// HOME PAGE (with login links) ========
	// =====================================
	app.get('/', function(req, res) {
		res.render('index.ejs'); // load the index.ejs file
	});

	app.get('/sucess', function(req, res) {
		res.render('sucess.ejs'); // load the index.ejs file
	});

	// =====================================
	// Settings ============================
	// =====================================
	// show the settings form
	app.get('/settings', function(req, res) {

		// check if already configured, if not will go to signup page
		confdb.find({}).count({}, function(err, docs){
			if (docs==0) {
				var token = crypto.randomBytes(25).toString('hex');
				res.render('settings.ejs', {token: JSON.stringify(token)});
			}
			else {
				res.redirect('/sucess');
			}
		});
	});

	// process the settings form
	app.post('/settings', function(req, res) {
		res.redirect('/sucess');
		conf.saveconfig(req);
	});

	app.post('/newposthread', function(req, res){
		jwt.verify(req.body.token, secret_st, function(err, decoded) {
			if (decoded) {
				db.saveMsgnp(req.body);
				res.send({sucess: 'sucess'});
				res.end();
			}
			else {
				res.send({error: 'tokenerror'});
				res.end();
			}
		});
	});
	
	app.post('/upbadwl', function(req, res){
		jwt.verify(req.body.token, secret_st, function(err, decoded) {
			if (decoded) {
				badwl = {};
				for (var val in req.body.badw) {
					badwl[req.body.badw[val].badword] = req.body.badw[val].replacement;
				}
				confdb.findOneAndUpdate({'check': '1'}, { badwld: JSON.stringify(badwl) }, {upsert: false}).exec();
				res.send({sucess: 'sucess'});
				res.end();
			}
			else {
				res.send({error: 'tokenerror'});
				res.end();
			}
		});
	});

	function badwordreplace(msg) {
		for (var val in badwl) {
			msg = msg.replace(new RegExp('\\b'+val+'\\b', "gi"), badwl[val]);
		}
		return msg;
	}

	// socket.io guest ===========================================================

	var nspg = io.of('/guest');
	nspg.on('connection', function(nspsocket){
		nspsocket.on('getnot', function(data){
			db.getnoti(function(err, docs){
				nspsocket.emit('getnot', docs);
			});
		});
		nspsocket.on('getoldmsg', function(data){
			db.getOldMsgsGuest(data, function(err, docs){
				nspsocket.emit('load old msgs', docs);
			});
		});
	});

	exports.guestnewpost = function(docs) {
		nspg.emit('message', docs);
	};

	// socket.io member ===========================================================

	var nspm = io.of('/member');
	nspm.use(socketio_jwt.authorize({
		secret: secret_st,
		handshake: true
	}));
	nspm.on('connection', function(socket) {
		db.c_oneusr(socket.decoded_token, function(err, docs){
			if(docs) {
				if(docs.ban=='1') {
					nspm.to(socket.id).emit('ckusr', 'banned');
					socket.disconnect();
					return;
				}
				else {
					nspm.to(socket.id).emit('ckusr', 'ok');
					if (!docs.lstshout) {
						docs.lstshout = 0;
					}
					initializeConnection(socket, docs.lstshout);
				}
			}
			else {
				nspm.to(socket.id).emit('ckusr', 'ok');
				initializeConnection(socket, 0);
			}
		});
	});

	function initializeConnection(socket, lstshout){
		showActiveUsers(socket, lstshout);
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

	function showActiveUsers(socket, lstshout){
		socket.uid = socket.decoded_token.uid;
		uidlist[socket.uid] = 1;
		username = socket.decoded_token.user;
		socket.username = username;
		usernames[socket.uid] = username;
		if (!id[socket.uid]) {
			id[socket.uid] = {};
		}
		if (!msgtime[socket.uid]) {
			msgtime[socket.uid] = [];
		}
		msgtime[socket.uid]['lpmsgt'] = lstshout;
		id[socket.uid][socket.id] = 1;
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
				data["not"] = badwordreplace(data.not);
				db.updnoti(data);
				nspm.emit('updnot', xss(data));
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
			if ((parseInt((Date.now()/1000) - msgtime[socket.uid]['lpmsgt']) >= parseInt(socket.decoded_token.ftime)) || parseInt(socket.decoded_token.ftime) == 0) {
				msgtime[socket.uid]['lpmsgt'] = Date.now()/1000;			
				data["tk_uid"] = socket.decoded_token.uid;
				data["tk_mod"] = socket.decoded_token.mod;
				data["tk_edtp"] = socket.decoded_token.edtprv;
				data["tk_eduser"] = socket.decoded_token.username;
				if (data.newmsg.length>parseInt(chrlimit)) {
					data["newmsg"] = data.newmsg.slice(0, parseInt(chrlimit));
				}
				data["newmsg"] = badwordreplace(data.newmsg);
				db.updmsg(data, function(err, docs){
					nspm.emit('updmsg', docs);
				});
			}
		});
	}

	function handlermvmsg(socket){
		socket.on('rmvmsg', function(data){
			data["tk_uid"] = socket.decoded_token.uid;
			data["tk_mod"] = socket.decoded_token.mod;
			data["tk_edtp"] = socket.decoded_token.edtprv;
			db.rmvmsg(data, function(err, docs){
				if (docs) {
					nspm.emit('rmvmsg', data);
				}
			});
		});
	}

	function handlepurge(socket){
		socket.on('purge', function(data){
			if (socket.decoded_token.mod=='1') {
				db.purge();
				nspm.emit('purge');
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
						nspm.to(docs.id).emit('ban', 'disconnect');
					}
				});
			}
		});
	}

	function handleMessageBroadcasting(socket){
		socket.on('message', function(data){
			if ((parseInt((Date.now()/1000) - msgtime[socket.uid]['lpmsgt']) >= parseInt(socket.decoded_token.ftime)) || parseInt(socket.decoded_token.ftime) == 0) {
				msgtime[socket.uid]['lpmsgt'] = Date.now()/1000;
				data["created"] = Date.now();
				data["tk_uid"] = socket.decoded_token.uid;
				data["tk_nick"] = socket.decoded_token.user;
				data["tk_avatar"] = socket.decoded_token.avatar;
				data["tk_gid"] = socket.decoded_token.gid;
				data["tk_suid"] = ''+socket.decoded_token.uid+','+data.uidto+'';
				if (data.msg.length>parseInt(chrlimit)) {
					data["msg"] = data.msg.slice(0, parseInt(chrlimit));
				}
				data["msg"] = badwordreplace(data.msg);
				db.saveMsg(data, function(err, docs){
					nspm.emit('message', docs);
				});
			}
		});
	}

	exports.emtnewpsthread = function(docs) {
		nspm.emit('message', docs);
	};

	exports.pmcheck = function(docs) {
		db.c_oneusr(docs, function(err, data){
			nspm.to(data.id).emit('message', docs);
		});
		db.c_oneusr2(docs, function(err, data){
			nspm.to(data.id).emit('message', docs);
		});
	};

	function handleClientDisconnections(socket){
		socket.on('disconnect', function () {
			delete id[socket.uid][socket.id];
			if (!Object.getOwnPropertyNames(id[socket.uid]).length) {
				data = [];
				data["uid"] = socket.uid;
				data["lstshout"] = msgtime[socket.uid]['lpmsgt'];
				db.updlstshout(data);
				delete msgtime[socket.uid];
				delete usernames[socket.uid];
				delete uidlist[socket.uid];

				socket.broadcast.emit('user left', {
					usernames: usernames,
					uidlist: uidlist,
					uid: socket.uid
				});
			}
		});
	}
}