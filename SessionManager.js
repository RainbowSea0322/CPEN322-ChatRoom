const crypto = require('crypto');

class SessionError extends Error {}

const TOKEN_SIZE = 64;

const COOKIE_NAME = "cpen322-session";

function SessionManager (){
	// default session length - you might want to
	// set this to something small during development
	const CookieMaxAgeMs = 600000;

	// keeping the session data inside a closure to keep them protected
	const sessions = {};

	// might be worth thinking about why we create these functions
	// as anonymous functions (per each instance) and not as prototype methods
	this.createSession = (response, username, maxAge = CookieMaxAgeMs) => {
		let token = crypto.randomBytes(TOKEN_SIZE).toString('hex');
		// let creationTime = Date.now();
		sessions[token] = {
			username: username,
			timestamp: Date.now(),
			expiresAt: Date.now() + maxAge
		};

		response.cookie("cpen322-session", token, {maxAge: maxAge});

		// remove token after it expired
		setTimeout(()=> {delete sessions[token];}, maxAge);
	};

	this.deleteSession = (request) => {
		let token = request.session;

		if (token && token in sessions) {
			delete sessions[token];
		}

		delete request.username;

		delete request.session;
	};

	this.middleware = (request, response, next) => {
		let cookieHeader = request.headers.cookie;

		const cookies = cookieHeader.split(';').map(cookie => cookie.trim().split('='));
		const tokenPair  = cookies.find(pair => pair[0] === COOKIE_NAME);

		if (!tokenPair  || tokenPair .length !== 2) {
			return next(new SessionError("Session token not found in cookie"));
		}

		const token = tokenPair[1];

		const session = sessions[token];

		if (!session) {
			return next(new SessionError("Session not found"));
		}

		request.username = sessions[token].username;
		request.session = token;
		next();
	};

	// this function is used by the test script.
	// you can use it if you want.
	this.getUsername = (token) => ((token in sessions) ? sessions[token].username : null);
}

// SessionError class is available to other modules as "SessionManager.Error"
SessionManager.Error = SessionError;

module.exports = SessionManager;