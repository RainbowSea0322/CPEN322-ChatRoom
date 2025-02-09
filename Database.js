const { MongoClient, ObjectID, ObjectId} = require('mongodb');	// require the mongodb driver

/**
 * Uses mongodb v6.3 - [API Documentation](http://mongodb.github.io/node-mongodb-native/6.3/)
 * Database wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our cpen322 app.
 */
function Database(mongoUrl, dbName){
	if (!(this instanceof Database)) return new Database(mongoUrl, dbName);
	this.connected = new Promise((resolve, reject) => {
		const client = new MongoClient(mongoUrl);

		client.connect()
		.then(() => {
			console.log('[MongoClient] Connected to ' + mongoUrl + '/' + dbName);
			resolve(client.db(dbName));
		}, reject);
	});
	this.status = () => this.connected.then(
		db => ({ error: null, url: mongoUrl, db: dbName }),
		err => ({ error: err })
	);
}

Database.prototype.getRooms = function(){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			if (db) {
				resolve(db.collection('chatrooms').find().toArray())
			} else {
				reject('No database')
			}
		})
	)
}

Database.prototype.getRoom = function(room_id){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			if (db) {
				resolve(db.collection('chatrooms').findOne({ _id: room_id }));
			} else {
				reject('No database');
			}
		})
	)
}

Database.prototype.addRoom = function(room){
	return this.connected.then(db => 
		new Promise((resolve, reject) => {
			if(db){
				if (!room.name) {
					reject(new Error('room name not exist'));
				} else {
					if (!room._id) {
						room._id = new ObjectId().toString();
					}
					db.collection('chatrooms').insertOne(room);
					resolve(room);
				}
			}else {
				reject('No database');
			}
		})
	)
}

Database.prototype.getLastConversation = function(room_id, before){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			if (!room_id) {
                reject(new Error("No room id"));
            }
			if(!before) {
				before = Date.now();
			}
			if(db){
				db.collection('conversations')
                    .find({ room_id: room_id, timestamp: { $lt: before } }).sort({ timestamp: -1 }).limit(1).toArray().then(conversations => {
                        resolve(conversations[0] || null); // Return first conversation or null if not found
                    })
			}else {
				reject('No database');
			}
		})
	)
}

Database.prototype.addConversation = function(conversation){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			if (!conversation.room_id  || !conversation.timestamp || !conversation.messages) {
				reject( Error("Missing conversation field"))
			}
			if (db) {
				db.collection('conversations').insertOne(conversation);
				resolve(conversation);
			} else {
				reject('No database');
			}
		})
	)
}

Database.prototype.getUser = function(username){
	return this.connected.then(db =>
		new Promise((resolve, reject) =>{
			if (db) {
				let user = db.collection('users').findOne({ username: username })
				resolve(user)
			} else {
				reject('No database ')
			}
		})
	)
}
Database.prototype.getUserLost = function (username,room_id){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			db.collection('conversations')
				.find({ room_id: room_id}).sort({ timestamp: -1 }).toArray().then(conversations => {
					if (!conversations || !conversations[0].messages) {
						resolve ([]);
					}
					if(conversations[0].messages.length === 0){
						resolve ([]);
					}
					let messages = conversations[0].messages;
					if (username === messages[messages.length - 1].username){
						for (let i = 0; i < conversations.length; i++){
							let Done = false;
							messages = conversations[i].messages;
							for(let j = messages.length - 1; j >= 0; j--){
								if (username === messages[messages.length - 1].username){
									messages.pop()
								} else{
									Done = true;
									break
								}
							}
							
							if (Done){
								break
							}
						}
					}

					let chatHistory = [];
					for (let i = 0; i < conversations.length; i++){
						messages = conversations[i].messages;
						for (let j = messages.length - 1; j >= 0 ; j--){
							if(messages[j].username !== username){
								chatHistory.unshift(messages[j])
							} else {
								if (chatHistory.length === 0){
									resolve(new Array);
								} else {
									resolve(chatHistory);
								}
							}

							if(j === 0 && i === conversations.length - 1){
								resolve(chatHistory)
							}
						}
					}
				})			
		}))
}
module.exports = Database;