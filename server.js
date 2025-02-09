const path = require('path');
const fs = require('fs');
const ws = require('ws');
const express = require('express');
const cpen322 = require('./cpen322-tester.js');
const Database = require('./Database.js');
const SessionManager = require('./SessionManager.js')
const crypto = require('crypto');
const axios = require('axios');
const { Session } = require('inspector');
const OpenAI = require('./openai.js');

const {eventSession} = require('./openai.js')
function logRequest(req, res, next){
	console.log(`${new Date()}  ${req.ip} : ${req.method} ${req.path}`);
	next();
}

function sessionErrorHandler (err, req, res, next) {
	if (err instanceof SessionManager.Error) {
		if (req.headers.accept === 'application/json') {
			res.status(401).send(err.message)
		} else {
			res.redirect('/login')
		}
	} else {
		res.status(500).send()
	}
}

function isCorrectPassword(password, saltedHash) {
	const salt = saltedHash.substring(0, 20);

	const hash = crypto.createHash('sha256').update(password + salt).digest('base64');
	return hash === saltedHash.substring(20, saltedHash.length);
}

let broker = new ws.Server({port: 8000});
const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');
const mongoUrl = 'mongodb://127.0.0.1:27017/';
const dbName = 'cpen322-messenger';
let db = new Database(mongoUrl, dbName);
let sessionManager = new SessionManager();
const messageBlockSize = 10;

let app = express();

app.use(express.json()) 						// to parse application/json
app.use(express.urlencoded({ extended: true })) // to parse application/x-www-form-urlencoded
app.use(logRequest);							// logging for debug
// serve static files (client-side)
app.post('/login', (req, res) => {
	let username = req.body.username
	let password = req.body.password

	db.getUser(username).then(user => {
		if (user){
			if (isCorrectPassword(password, user.password)) {
				sessionManager.createSession(res, req.body.username)
				res.redirect('/#/');
			} else{
				res.redirect('/login');
			}
		}  else  {
            res.redirect('/login')
        }
	})
})

broker.on('connection', (ws, req) => {
	let cookie = req.headers.cookie;
	if (cookie) {
		let parsedCookie = cookie.split(';')
            .map(v => v.split('='))
            .reduce((acc, v) => {
            acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
            return acc;
            }, {});
		if (sessionManager.getUsername(parsedCookie["cpen322-session"])) {
			ws.on('message', (message) => {
				let parsed = JSON.parse(message);
				parsed.username = sessionManager.getUsername(parsedCookie["cpen322-session"]);
				parsed.text = escapeHTML(parsed.text) 
				broker.clients.forEach((client) => {
					if (client !== ws && client.readyState === ws.OPEN) {
						client.send(JSON.stringify(parsed));
					}
				})
				messages[parsed.roomId].push(parsed);
				if (messages[parsed.roomId].length === messageBlockSize) {
					let conversation = {
						room_id: parsed.roomId,
						timestamp: Date.now(),
						messages: messages[parsed.roomId]
					};
					db.addConversation(conversation).then((result) => {
						messages[parsed.roomId] = [];
					}).catch((error) => console.log(error));
				}
			})
		} 
		else {
			ws.close();
		}
	}
	else {
		ws.close();
	}
});
app.use("/login", express.static(clientApp + "/login.html", { extensions: ["html"]}) );
//app.use("/", express.static(clientApp, { extensions: ["html"]}));
// middleware protected endpoint
app.use('/chat/:room_id/messages', sessionManager.middleware);
app.use('/chat/:room_id', sessionManager.middleware);
app.use('/chat', sessionManager.middleware);
app.use('/profile', sessionManager.middleware);

// Middleware for protecting static files
app.use('/app.js', sessionManager.middleware);
app.use('/index.html', sessionManager.middleware);
app.use('/index', sessionManager.middleware);
app.use('/', sessionManager.middleware, express.static(clientApp, { extensions: ["html"]}) );
// redirection when caught an error
app.use(sessionErrorHandler);

let chatrooms = [
	{ id: 'room-1', name: "CPEN322 Group", image: "assets/everyone-icon.png" },
	{ id: 'room-2', name: "What's for lunch?", image: "assets/everyone-icon.png" },
	{ id: 'room-3', name: "Arknights IS Group", image: "assets/everyone-icon.png" }
];

let messages = {};

db.getRooms().then(rooms => {
	rooms.forEach(room => {
		messages[room._id] = [];
	});
}).catch(err => console.error(err));

app.get('/chat', async (req, res) =>{
	let rooms = await db.getRooms();

	let modifyMessage = rooms.map(room => ({
		...room,
		messages: messages[room._id] || []
	}));

	res.json(modifyMessage);
});

app.get('/chat/:room_id', async (req, res) => {
	let room = await db.getRoom(req.params.room_id);
	if (room) {
		res.json(room);
	} else {
		res.status(404).send(`Room ${req.params.room_id} was not found`);
	}
})

app.get("/chat/:room_id/messages", (req, res) =>{
	const roomId = req.params.room_id;
	const before = parseInt(req.query.before, 10);

//	if (isNaN(before)) {
//		return res.status(400).json({ error: 'Invalid "before" query parameter' });
//	}

	db.getLastConversation(roomId, before)
		.then(conversation => {
			res.json(conversation);
		})
});

app.get("/chat/:room_id/summary", (req, res) => {
	const username = req.username;
	const roomId = req.params.room_id;
	OpenAI.aiSupport.generateSummary(username, roomId)
		.then(eventsArray =>{
			res.json(eventsArray);
		})
})

app.get("/chat/:room_id/generateReply", (req, res) => {
	const username = req.username;
	const roomId = req.params.room_id;
	const index = Number(req.query.index);

	let eventSummary = eventSession.getEventHistory(username, roomId, index);
	OpenAI.aiSupport.autoReply(username, roomId, eventSummary).then(reply => {
		res.json(reply);
	})
})

app.get("/chat/:room_id/regenerateReply", (req, res) =>{
	const roomId = req.params.room_id;
	const username = req.query.username;
	const index = Number(req.query.index);
	const status = req.query.status;

	let eventSummary = eventSession.getEventHistory(username, roomId, index);
	OpenAI.aiSupport.aiReward(username, roomId, eventSummary, status).then(reply => {
		res.json(reply);
	})
})

app.get('/profile', (req, res) =>{
	const username  = req.username;

	if(!username) {
		res.status(401).json({ error: 'User DNE' });
	}else{
		res.json({username});
	}
})

app.get('/logout', (req, res) =>{
	sessionManager.deleteSession(req)
	res.redirect('/login')
})

app.get('/chat', (req, res) => {
	db.getRooms().then(rooms => {
	  for (let room of rooms) {
		room.messages = messages[room._id]
	  }
	  res.send(rooms)
	})
  })

app.post('/chat', (req, res) => {
	let {name, image} = req.body;

	if(!name){
		return res.status(400).json({ error: '[ERROR] No Room name' });
	}

	image = image || "assets/everyone-icon.png";

	let newRoom = { name: name, image: image };

	db.addRoom(newRoom)
		.then(new_Room => {
			messages[new_Room._id] = [];

			res.status(200).json(new_Room);
		})
});

function escapeHTML(unsafe) {
    if (typeof unsafe !== 'string') {
        throw new TypeError('escapeHTML expects a string input.');
    }
    return unsafe
}

app.listen(port, () => {
	console.log(`${new Date()}  App Started. Listening on ${host}:${port}, serving ${clientApp}`);
});

// cpen322.connect('http://3.98.223.41/cpen322/test-a5-server.js');
// cpen322.export(__filename, { app });
// cpen322.export(__filename, { broker });
// cpen322.export(__filename, { chatrooms });
// cpen322.export(__filename, { messages });
// cpen322.export(__filename, { db });
// cpen322.export(__filename, { messageBlockSize });
// cpen322.export(__filename, { sessionManager });
// cpen322.export(__filename, { isCorrectPassword });