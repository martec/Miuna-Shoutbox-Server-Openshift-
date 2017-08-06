var mongoose = require('mongoose');
var msrv = require('../server');
var xss = require('node-xss').clean;

var chatSchema = mongoose.Schema({
	nick: String,
	nickto: String,
	uid: String,
	gid: String,
	colorsht: String,
	bold: String,
	font: String,
	size: String,
	avatar: String,
	uidto: String,
	suid: String,
	msg: String,
	edt: String,
	edtusr: String,
	type: String,
	created: Date
});

var Chat = mongoose.model('Message', chatSchema);

exports.getOldMsgs = function(data, cb){
	if(parseInt(data.ns) > 100) {
		data.ns = '100';
	}
	Chat.find({}).or([{ nickto: 0 }, { uid: data.uid }, { uidto: data.uid }]).sort({_id: -1}).limit(parseInt(data.ns)).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getOldpmMsgs = function(data, cb){
	if(parseInt(data.ns) > 100) {
		data.ns = '100';
	}
	Chat.find({}).or([{ suid: ''+data.suid+','+data.uid+''}, { suid: ''+data.uid+','+data.suid+'' }]).sort({_id: -1}).limit(parseInt(data.ns)).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getOldMsgsGuest = function(data, cb){
	if(parseInt(data.ns) > 100) {
		data.ns = '100';
	}
	Chat.find({}).or([{ type: 'shout'}, { type: 'system' }]).sort({_id: -1}).limit(parseInt(data.ns)).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getcountMsgs = function(data, cb){
	Chat.find({}).or([{ nickto: 0 }, { uid: data.uid }, { uidto: data.uid }]).count({}, function(err, docs){
		cb(err, docs);
	});
}

exports.getfpglogMsgs = function(data, cb){
	if(parseInt(data.mpp) > 200) {
		data.mpp = '200';
	}
	Chat.find({}).or([{ nickto: 0 }, { uid: data.uid }, { uidto: data.uid }]).sort({_id: -1}).limit(parseInt(data.mpp)).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getlogMsgsnext = function(data, cb){
	if(parseInt(data.mpp) > 200) {
		data.mpp = '200';
	}
	Chat.find({ _id: { $lte: data.id } }).or([{ nickto: 0 }, { uid: data.uid }, { uidto: data.uid }]).sort({_id: -1}).limit(parseInt(data.mpp)).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getlogMsgsback = function(data, cb){
	if(parseInt(data.mpp) > 200) {
		data.mpp = '200';
	}
	Chat.find({ _id: { $gte: data.id } }).or([{ nickto: 0 }, { uid: data.uid }, { uidto: data.uid }]).sort({_id: -1}).limit(parseInt(data.mpp)).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.saveMsg = function(data, cb){
	var newMsg = new Chat({msg: xss(data.msg), nickto: xss(data.nickto), uid: data.tk_uid, gid: data.tk_gid, colorsht: xss(data.colorsht), bold: parseInt(data.bold), font: parseInt(data.font), size: parseInt(data.size), avatar: data.tk_avatar, uidto: data.uidto, suid: data.tk_suid, nick: data.tk_nick, edt: '0', edtusr: '0', type: data.type, created: data.created});
	newMsg.save(function(err, docs){
		if (docs.type=='pmshout' || docs.type=='pmsystem') {
			msrv.pmcheck(docs);
		}
		else {
			cb(err, docs);
			msrv.guestnewpost(docs);
		}
	});
};

exports.saveMsgnp = function(data, cb){
	var newMsg = new Chat({msg: xss(data.msg), nickto: xss(data.nickto), uid: data.uid, gid: data.gid, colorsht: xss(data.colorsht), bold: parseInt(data.bold), font: parseInt(data.font), size: parseInt(data.size), avatar: data.avatar, uidto: data.uidto, suid: '0,0', nick: data.nick, edt: '0', edtusr: '0', type: data.type, created: Date.now()});
	newMsg.save(function(err, docs){
		msrv.emtnewpsthread(docs);
		msrv.guestnewpost(docs);
	});
};

exports.readonemsg = function(data, cb){
	Chat.findOne({_id: data.id}).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.updmsg = function(data, cb){
	Chat.findOne({_id: data.id}).exec(function(err, docs){
		if ((docs.uid==data.tk_uid && data.tk_edtp=='1') || data.tk_mod=='1') {
			Chat.findOneAndUpdate({_id: data.id}, { msg: xss(data.newmsg), edt: '1', edtusr: data.tk_eduser }, {upsert: false, new: true}).exec(function(err, docs){
				if (docs.type=='pmshout' || docs.type=='pmsystem') {
					msrv.pmcheck(docs);
				}
				else {
					cb(err, docs);
				}
			});
		}
	});
};

exports.rmvmsg = function(data, cb){
	Chat.findOne({_id: data.id}).exec(function(err, docs){
		if ((docs.uid==data.tk_uid && data.tk_edtp=='1') || data.tk_mod=='1') {
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
	notc.findOneAndUpdate({_id: 'not1'}, { not: xss(data.not) }, {upsert: true, new: true}).exec();
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
	ban: String,
	lstshout: String
});

var pml = mongoose.model('pmusrlist', pmlistSchema);

exports.updpml = function(data, cb){
	pml.findOne({uid: data.uid}).exec(function(err, docs){
		if (docs) {
			pml.findOneAndUpdate({uid: data.uid}, { nicks: data.nick, id: data.id }, {upsert: true, new: true}).exec();
		}
		else {
			pml.findOneAndUpdate({uid: data.uid}, { nicks: data.nick, id: data.id, ban: '0' }, {upsert: true, new: true}).exec();
		}
	});
};

exports.updlstshout = function(data, cb){
	pml.findOneAndUpdate({uid: data.uid}, { lstshout: data.lstshout }, {upsert: false, new: true}).exec();
};

exports.c_oneusr = function(data, cb){
	pml.findOne({uid: data.uid}).exec(function(err, docs){
		cb(err, docs);
	});
};

exports.c_oneusr2 = function(data, cb){
	pml.findOne({uid: data.uidto}).exec(function(err, docs){
		cb(err, docs);
	});
};

exports.updbanl = function(data, cb){
	pml.findOne({uid: data.uid}).exec(function(err, docs){
		if (docs.ban=='1') {
			pml.findOneAndUpdate({uid: data.uid}, { ban: '0' }, {upsert: false, new: true}).exec(function(err, docs){
				cb(err, docs);
			});
		}
		else {
			pml.findOneAndUpdate({uid: data.uid}, { ban: '1' }, {upsert: false, new: true}).exec(function(err, docs){
				cb(err, docs);
			});
		}
	});
};

exports.getpml = function(cb){
	pml.find({}).sort('nicks').exec(function(err, docs){
		cb(err, docs);
	});
}
