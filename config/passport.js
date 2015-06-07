// config/passport.js

// load all the things we need
var LocalStrategy	= require('passport-local').Strategy;

// load up the user model
var User			= require('../lib/user');

// expose this function to our app using module.exports
module.exports = function(passport) {
	// =========================================================================
	// passport session setup ==================================================
	// =========================================================================
	// required for persistent login sessions
	// passport needs ability to serialize and unserialize users out of session

	// used to serialize the user for the session
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	// used to deserialize the user
	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			done(err, user);
		});
	});

	// =========================================================================
	// LOCAL SIGNUP ============================================================
	// =========================================================================
	// we are using named strategies since we have one for login and one for signup
	// by default, if there was no name, it would just be called 'local'

	passport.use('local-signup', new LocalStrategy({
		// by default, local strategy uses username and password, we will override with email
		usernameField : 'user',
		passwordField : 'password',
		passReqToCallback : true // allows us to pass back the entire request to the callback
	},
	function(req, user, password, done) {
		User.find({}).count({}, function(err, docs){
			if (docs==0) {
				// create the user
				var newUser = new User();

				// set the user's local credentials
				newUser.local.user = user;
				newUser.local.password = newUser.generateHash(password); // use the generateHash function in our user model
				newUser.local.spku = req.body.secret;
				newUser.local.origin = [req.body.origin.split(',')];
				newUser.local.chrlimit = req.body.chrlimit;
				newUser.local.check = '1';

				// save the user
				newUser.save(function(err) {
					if (err)
						throw err;
					return done(null, newUser);
				});
			}
		});
	}));
};
