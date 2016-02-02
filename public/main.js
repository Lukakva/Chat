// chat section

RegExp.escape = function(text) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function sendMessage() {
	var message = chatInput.value;
	if (message != "") {
		// if message is not an empty string
		// send it
		socket.emit("message", message);
		// empty the input
		chatInput.value = "";

		createMessageNode(username, message, username);
	}
}

function createMessageNode(from, message, currentUser) {
	var node = document.createElement("div");

	message = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

	node.innerHTML =
	'<div class="chat-message-container">' +
		'<div class="chat-message-info">' +
			'<span class="chat-message-from">' + from + '</span>' +
		'</div>' +
		'<div class="chat-message">' +
			message + 
		'</div>' +
	'</div>';

	if (currentUser === from) {
		node.querySelector(".chat-message-from").classList.add("current-user");
	}

	var emoticons = {
		":)"   : "smile",
		":("   : "frown",
		":|"   : "pokerface",
		":/"   : "unsure",
		":\\"  : "unsure",
		";)"   : "wink",
		":'("  : "tear",
		";-;"  : "cry",
		":D"   : "laugh",
		"^_^"  : "happy",
		"8|"   : "cool"
	};

	var emoticonsPath = "resources/emoticons/";

	var message = node.querySelector(".chat-message");

	for (var emoticon in emoticons) {
		var emoticonPath = emoticonsPath + emoticons[emoticon] + ".png";
		var emoticonHTML = '<div class="emoticon" style="background-image: url(\'' + emoticonPath + '\');"></div>';

		message.innerHTML = message.innerHTML.replace(new RegExp(RegExp.escape(emoticon), "g"), emoticonHTML);
	}

	chatWindow.appendChild(node.children[0]);
	chatWindow.scrollTop = chatWindow.scrollHeight;
}

function createUserLeftJoinedNode(user, leftOrJoined) {
	var node = document.createElement("div");
	node.classList.add("chat-user-left-joined");

	node.innerHTML = user + " has " + leftOrJoined + " the chat";

	chatWindow.appendChild(node);
	chatWindow.scrollTop = chatWindow.scrollHeight;
}

function recreateChatFromHistory() {
	for (var i = 0; i < chatHistory.length; i++) {
		var chatStage = chatHistory[i];
		var action = chatStage.action;

		switch (action) {
			case "newUserJoined":
				createUserLeftJoinedNode(chatStage.username, "joined");
				break;
			case "userLeft":
				createUserLeftJoinedNode(chatStage.username, "left");
				break;
			case "message":
				createMessageNode(chatStage.from, chatStage.message, username);
				break;
		}
	}
}

function createUserTyping(username) {
	var node = document.createElement("div");
	node.classList.add("user-typing");
	node.setAttribute("data-username", username);
	node.innerHTML = username + " is typing...";

	usersTyping.appendChild(node);
}

function removeUserTyping(username) {
	var userTyping = document.querySelector(".user-typing[data-username='" + username + "']");
	usersTyping.removeChild(userTyping);
}

var ENTER_KEYCODE = 13;
var sendButton = document.querySelector(".chat-send");
var chatInput = document.querySelector(".chat-input");
var chatWindow = document.querySelector(".chat-window");
var chatHistory = [];
var usersTyping = document.querySelector(".users-typing");
var username;

while (!username) {
	username = window.prompt("Enter your username");
}

// don't send "User is typing" to server on every input
var sentIsTyping = false;

chatInput.addEventListener("input", function() {
	if (!sentIsTyping) {
		socket.emit("typingStart");
	}
	sentIsTyping = true;
});

chatInput.addEventListener("inputEnd", function() {
	sentIsTyping = false;
	socket.emit("typingEnd");
});

var inputEndTimeout;

chatInput.addEventListener("input", function() {
	clearTimeout(inputEndTimeout);
	inputEndTimeout = setTimeout(function() {
		chatInput.dispatchEvent(new Event("inputEnd"));
	}, 500);
});

document.addEventListener("keydown", function(e) {
	var keyCode = e.keyCode || e.which;

	if (keyCode === ENTER_KEYCODE) {
		sendButton.classList.add("active");
	}
});

document.addEventListener("keyup", function(e) {
	var keyCode = e.keyCode || e.which;

	if (keyCode === ENTER_KEYCODE) {
		sendButton.classList.remove("active");
		sendMessage();
	}
});

sendButton.addEventListener("click", sendMessage);
sendButton.addEventListener("touchend", sendMessage);

// socket section
	var socket = io();
	var connectionCount = 0;

	socket.on("welcome", function(data) {
		connectionCount = data.connectionCount;
		chatHistory = data.history;

		recreateChatFromHistory();
	});

	socket.on("message", function(data) {
		createMessageNode(data.from, data.message, username);
		new Audio("sound.mp3").play();
	});

	socket.on("err", function() {
		username = window.prompt("Username " + username + " is already logged in. Please try another username");
		socket.emit("login", username);
	});

	socket.on("newUserJoined", function(data) {
		connectionCount = data.connectionCount;
		createUserLeftJoinedNode(data.username, "joined");
	});

	socket.on("userLeft", function(data) {
		connectionCount = data.connectionCount;
		createUserLeftJoinedNode(data.username, "left");
	});

	socket.emit("login", username);

	socket.on("typingStart", createUserTyping);
	socket.on("typingEnd", removeUserTyping);