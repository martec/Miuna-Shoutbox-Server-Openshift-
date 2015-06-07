var mongoose = require('mongoose');
var msrv = require('../server');
var xss = require('node-xss').clean;

var chatSchema = mongoose.Schema({
	nick: String,
	nickto: String,
	uid: String,
	gid: String,
	colorsht: String,
	avatar: String,
	uidto: String,
	suid: String,
	msg: String,
	edt: String,
	type: String,
	created: Date
});

var Chat = mongoose.model('Message', chatSchema);

exports.getOldMsgs = function(data, cb){
	var query = Chat.find({}).or([{ nickto: 0 }, { uid: data.uid }, { uidto: data.uid }]);
	query.sort('-_id').limit(data.ns).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getOldpmMsgs = function(data, cb){
	var query = Chat.find({}).or([{ suid: ''+data.suid+','+data.uid+''}, { suid: ''+data.uid+','+data.suid+'' }]);
	query.sort('-_id').limit(data.ns).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getcountMsgs = function(data, cb){
	Chat.find({}).or([{ nickto: 0 }, { uid: data.uid }, { uidto: data.uid }]).count({}, function(err, docs){
		cb(err, docs);
	});
}

exports.getfpglogMsgs = function(data, cb){
	var query = Chat.find({}).or([{ nickto: 0 }, { uid: data.uid }, { uidto: data.uid }]);
	query.sort('-_id').limit(data.mpp).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getlogMsgsnext = function(data, cb){
	Chat.find({ _id: { $lte: data.id } }).or([{ nickto: 0 }, { uid: data.uid }, { uidto: data.uid }]).sort('-_id').limit(data.mpp).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getlogMsgsback = function(data, cb){
	Chat.find({ _id: { $gte: data.id } }).or([{ nickto: 0 }, { uid: data.uid }, { uidto: data.uid }]).sort('_id').limit(data.mpp).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.saveMsg = function(data, cb){
	var newMsg = new Chat({msg: xss(data.msg), nickto: xss(data.nickto), uid: data.tk_uid, gid: data.tk_gid, colorsht: xss(data.colorsht), avatar: data.tk_avatar, uidto: data.uidto, suid: data.tk_suid, nick: data.tk_nick, edt: '0', type: data.type, created: data.created});
	newMsg.save(function(err, docs){
		cb(err, docs);
	});
};

exports.saveMsgnp = function(data, cb){
	var newMsg = new Chat({msg: xss(data.msg), nickto: xss(data.nickto), uid: data.uid, gid: data.gid, colorsht: xss(data.colorsht), avatar: data.avatar, uidto: data.uidto, suid: '0,0', nick: data.nick, edt: '0', type: data.type, created: Date.now()});
	newMsg.save(function(err, docs){
		msrv.emtnewpsthread(docs);
	});
};

exports.readonemsg = function(data, cb){
	Chat.findOne({_id: data.id}).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.updmsg = function(data, cb){
	Chat.findOne({_id: data.id}).exec(function(err, docs){
		if (docs.uid==data.tk_uid || data.tk_mod=='1') {
			Chat.findOneAndUpdate({_id: data.id}, { msg: xss(data.newmsg), edt: '1' }, {upsert: false}).exec(function(err, docs){
				cb(err, docs);
			});
		}
	});
};

exports.rmvmsg = function(data, cb){
	Chat.findOne({_id: data.id}).exec(function(err, docs){
		if (docs.uid==data.tk_uid || data.tk_mod=='1') {
			Chat.findOneAndRemove({_id: data.id}).exec(function(err, docs){
				cb(err, docs);
			});
		}
	});
};

exports.purge = function(){
	Chat.remove({}).exec();
}

var notSchema = mongoose.Schema({
	_id: String,
	not: String
});

var notc = mongoose.model('notice', notSchema);

exports.updnoti = function(data, cb){
	notc.findOneAndUpdate({_id: 'not1'}, { not: xss(data.not) }, {upsert: true}).exec();
};

exports.getnoti = function(cb){
	notc.findOne({_id: 'not1'}).exec(function(err, docs){
		cb(err, docs);
	});
}

var pmlistSchema = mongoose.Schema({
	nicks: String,
	uid: String,
	id: String,
	ban: String
});

var pml = mongoose.model('pmusrlist', pmlistSchema);

exports.updpml = function(data, cb){
	pml.findOne({uid: data.uid}).exec(function(err, docs){
		if (docs) {
			pml.findOneAndUpdate({uid: data.uid}, { nicks: data.nick, id: data.id }, {upsert: true}).exec();
		}
		else {
			pml.findOneAndUpdate({uid: data.uid}, { nicks: data.nick, id: data.id, ban: '0' }, {upsert: true}).exec();
		}
	});
};

exports.c_oneusr = function(data, cb){
	pml.findOne({uid: data.uid}).exec(function(err, docs){
		cb(err, docs);
	});
};

exports.updbanl = function(data, cb){
	pml.findOne({uid: data.uid}).exec(function(err, docs){
		if (docs.ban=='1') {
			pml.findOneAndUpdate({uid: data.uid}, { ban: '0' }, {upsert: false}).exec(function(err, docs){
				cb(err, docs);
			});
		}
		else {
			pml.findOneAndUpdate({uid: data.uid}, { ban: '1' }, {upsert: false}).exec(function(err, docs){
				cb(err, docs);
			});
		}
	});
};

exports.getpml = function(cb){
	var query = pml.find({});
	query.sort('nicks').exec(function(err, docs){
		cb(err, docs);
	});
}

var bcrypt = require('bcrypt-nodejs');

var usrlistSchema = mongoose.Schema({
	local			 : {
		user		 : String,
		password	 : String,
		uid			 : String,
		gid			 : String,
		mod			 : String,
		avatar		 : String
	}
});

var usrl = mongoose.model('Userlist', usrlistSchema);

exports.getusrl = function(cb){
	var query = usrl.find({});
	query.sort('local.user').exec(function(err, docs){
		cb(err, docs);
	});
}

exports.regusr = function(req, cb){
	usrl.findOneAndUpdate({'local.uid': req.body.uid}, { 'local.user': req.body.user, 'local.password': bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null), 'local.gid': req.body.gid, 'local.mod': req.body.mod, 'local.avatar': req.body.avatar }, {upsert: true}).exec();
};

exports.logusr = function(data, cb){
	usrl.findOne({'local.uid': data.uid}).exec(function(err, docs){
		cb(err, docs);
	});
};