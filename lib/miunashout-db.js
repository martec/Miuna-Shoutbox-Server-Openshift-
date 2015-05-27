var dbcredential = process.env.OPENSHIFT_MONGODB_DB_URL;
var dbname = 'miunashout';

var url = dbcredential + dbname;
var mongoose = require('mongoose');
var xss = require('node-xss').clean;

mongoose.connect(url, function(err){
	if(err) {
		console.log(err);
	} else {
		console.log('Connected to mongodb!');
	}
});

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

var xss = require('node-xss').clean;
var Chat = mongoose.model('Message', chatSchema);

exports.getOldMsgs = function(data, cb){
	var query = Chat.find({}).or([{ nickto: 0 }, { uid: data.uid }, { uidto: data.uid }]);
	query.sort('-_id').limit(data.ns).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getOldpmMsgs = function(data, cb){
	var query = Chat.find({}).or([{ suid: data.suid1 }, { suid: data.suid2 }]);
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
	var newMsg = new Chat({msg: xss(data.msg), nickto: xss(data.nickto), uid: data.uid, gid: data.gid, colorsht: data.colorsht, avatar: xss(data.avatar), uidto: data.uidto, suid: data.suid, nick: xss(data.nick), edt: '0', type: data.type, created: data.created});
	newMsg.save(function(err, docs){
		cb(err, docs);
	});
};

exports.readonemsg = function(data, cb){
	Chat.findOne({_id: data.id}).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.updmsg = function(data, cb){
	Chat.findOneAndUpdate({_id: data.id}, { msg: xss(data.newmsg), edt: '1' }, {upsert: false}).exec();
};

exports.rmvmsg = function(data, cb){
	Chat.findOneAndRemove({_id: data.id}).exec();
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

exports.getnot = function(cb){
	notc.findOne({_id: 'not1'}).exec(function(err, docs){
		cb(err, docs);
	});
}

var banSchema = mongoose.Schema({
	_id: String,
	ban: String
});

var banl = mongoose.model('banlist', banSchema);

exports.updbanl = function(data, cb){
	banl.findOneAndUpdate({_id: 'ban1'}, { ban: xss(data.ban) }, {upsert: true}).exec();
};

exports.getbanl = function(cb){
	banl.findOne({_id: 'ban1'}).exec(function(err, docs){
		cb(err, docs);
	});
}

var pmlistSchema = mongoose.Schema({
	nicks: String,
	uid: String
});

var pml = mongoose.model('pmusrlist', pmlistSchema);

exports.updpml = function(data, cb){
	pml.findOneAndUpdate({uid: data.uid}, { nicks: xss(data.nicks) }, {upsert: true}).exec();
};

exports.getpml = function(cb){
	var query = pml.find({});
	query.sort('nicks').exec(function(err, docs){
		cb(err, docs);
	});
}