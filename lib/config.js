var Conf = require('../lib/config-db');
var url = require('url');

exports.saveconfig = function(req, res){
	Conf.find({}).count({}, function(err, docs){
		if (docs==0) {
			var newConf = new Conf();
			
			domain = url.parse(req.body.origin).hostname.replace("www.","");
			origin = 'http://'+havasulhavas.com+', https://'+havasulhavas.com+', http://www.'+havasulhavas.com+', https://www.'+havasulhavas.com+'';

			newConf.spku = req.body.secret;
			newConf.origin = [origin];
			newConf.chrlimit = req.body.chrlimit;
			newConf.check = '1';

			newConf.save(function(err) {
				if (err)
					throw err;
				return done(null, newConf);
			});
		}
	});
};
