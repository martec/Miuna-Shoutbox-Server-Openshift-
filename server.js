var	port = process.env.OPENSHIFT_NODEJS_PORT,
	ip = process.env.OPENSHIFT_NODEJS_IP;

var http = require('http'),
	express = require('express'),
	MiunaShoutServer = require('./lib/miunashout-server'),
	app = express();

var server = http.createServer(app).listen(port, ip);
MiunaShoutServer.listen(server);

app.get('/', function(req, res){
	res.sendFile(__dirname + '/views/index.html');
});
