var origin = 'forum.mobtutorials.com:80';

var socketio = require('socket.io');
var xss = require('node-xss').clean;
var db = require('./miunashout-db');
var io;

var usernames = {};
var uidlist = {};

exports.listen = function(server){
	io = socketio(server);
	io.set('origins', origin);
	io.sockets.on('connection', function(socket){
		initializeConnection(socket);
		handleClientDisconnections(socket);
		handleshowOldMsgs(socket);
		handleMessageBroadcasting(socket);
		handlecountMsgs(socket);
		handleshowfrstpagelogMsgs(socket);
		handleshowlognextMsgs(socket);
		handleshowlogbackMsgs(socket);
		handlegetbanl(socket);
		handleupdbanl(socket);
		handlegetnot(socket);
		handleupdnot(socket);
		handleupdmsg(socket);
		handlereadonemsg(socket);
		handlepurge(socket);
		handlermvmsg(socket);
		handleshowOldpmMsgs(socket);
		handleupdpml(socket);
		handlesgetpml(socket);
	});
}

function initializeConnection(socket){
	showActiveUsers(socket);
}

function showActiveUsers(socket){
	socket.on('add user', function (username) {
		socket.uid = username['uidts'];
		uidlist[socket.uid] = 1;
		username = username['nick'];
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
	});
}

function handleshowOldMsgs(socket){
	socket.on('getoldmsg', function(data){
		db.getOldMsgs(data, function(err, docs){
			socket.emit('load old msgs', docs);
		});
	});
}

function handleshowOldpmMsgs(socket){
	socket.on('getoldpmmsg', function(data){
		db.getOldpmMsgs(data, function(err, docs){
			socket.emit('load old pm msgs', docs);
		});
	});
}

function handlegetbanl(socket){
	socket.on('getbanl', function(data){
		db.getbanl(function(err, docs){
			socket.emit('getbanl', docs);
		});
	});
}

function handleupdbanl(socket){
	socket.on('updbanl', function(data){
		db.updbanl(data);
		io.emit('updbanl', xss(data));
	});
}

function handleupdpml(socket){
	socket.on('updpml', function(data){
		db.updpml(data);
	});
}

function handlesgetpml(socket){
	socket.on('getpml', function(data){
		db.getpml(function(err, docs){
			socket.emit('getpml', docs);
		});
	});
}

function handlegetnot(socket){
	socket.on('getnot', function(data){
		db.getnot(function(err, docs){
			socket.emit('getnot', docs);
		});
	});
}

function handleupdnot(socket){
	socket.on('updnot', function(data){
		db.updnoti(data);
		io.emit('updnot', xss(data));
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
		db.updmsg(data);
		io.emit('updmsg', xss(data));
	});
}

function handlermvmsg(socket){
	socket.on('rmvmsg', function(data){
		db.rmvmsg(data);
		io.emit('rmvmsg', data);
	});
}

function handlepurge(socket){
	socket.on('purge', function(data){
		db.purge();
		io.emit('purge');
	});
}

function handlecountMsgs(socket){
	socket.on('countmsg', function(data){
		db.getcountMsgs(data, function(err, docs){
			socket.emit('countmsg', docs);
		});
	});
}

function handleshowfrstpagelogMsgs(socket){
	socket.on('logfpgmsg', function(data){
		db.getfpglogMsgs(data, function(err, docs){
			socket.emit('logfpgmsg', docs);
		});
	});
}

function handleshowlognextMsgs(socket){
	socket.on('logmsgnext', function(data){
		db.getlogMsgsnext(data, function(err, docs){
			socket.emit('logmsgnext', docs);
		});
	});
}

function handleshowlogbackMsgs(socket){
	socket.on('logmsgback', function(data){
		db.getlogMsgsback(data, function(err, docs){
			socket.emit('logmsgback', docs);
		});
	});
}

function handleMessageBroadcasting(socket){
	socket.on('message', function(data){
		data["created"] = Date.now();
		db.saveMsg(data, function(err, docs){
			io.emit('message', docs);
		});
	});
}

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
