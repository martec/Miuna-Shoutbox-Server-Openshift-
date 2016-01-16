var mongoose = require('mongoose');

var confSchema = mongoose.Schema({
	spku		 : String,
	origin		 : String,
	chrlimit	 : String,
	badwld		 : String,
	check		 : String
});

module.exports = mongoose.model('Conf', confSchema);