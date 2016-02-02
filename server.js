// Import libs
var express = require("express");
var app = express();
var fs  = require("fs");
var httpServer = app.listen(8080, function(request, response) {
	console.log("Server successfully launched and is listening on port 8080");
});
var io = require("socket.io").listen(httpServer);

// use "public" folder as static one
app.use(express.static(__dirname + "/public"));

var connectionCount = 0;
var usernames = [];
var history = [];

io.on("connection", function(socket) {
	socket.emit("welcome", {
		connectionCount: connectionCount,
		history: history
	});

	socket.on("message", function(message) {
		// on new message request, if username is not logged in, throw an error
		if (!socket.username) {
			return socket.emit("err", {
				message: "You have to be logged in to send messages"
			});
		}

		history.push({
			action: "message",
			message: message,
			from: socket.username
		});

		// otherwise send a message to everyone
		socket.broadcast.emit("message", {
			message: message,
			from: socket.username
		});
	});

	socket.on("typingStart", function() {
		console.log(socket.username + " is typing");
		socket.broadcast.emit("typingStart", socket.username);
	});

	socket.on("typingEnd", function() {
		console.log(socket.username + " has ended typing");
		socket.broadcast.emit("typingEnd", socket.username);
	});

	socket.on("login", function(username) {
		// if that username is already logged in, throw an error
		if (usernames.indexOf(username) !== -1) {
			return socket.emit("err", {
				message: "That username is already logged in"
			});
		}

		if (!username) {
			return socket.emit("err", {
				message: "That username is invalid"
			});
		}

		// otherwise add current username to array
		usernames.push(username);

		socket.username = username;

		// notify other usernames that new user has joined the chat
		socket.broadcast.emit("newUserJoined", {
			username: username,
			connectionCount: connectionCount++
		});

		history.push({
			action: "newUserJoined",
			username: username
		});
	});

	socket.on("disconnect", function() {
		// if the user was logged in
		if (socket.username) {
			socket.broadcast.emit("userLeft", {
				username: socket.username,
				connectionCount: connectionCount--
			});

			history.push({
				action: "userLeft",
				username: socket.username
			});

			// this statement below will always be true (I think)
			// but extra check is not bad
			if (usernames.indexOf(socket.username) > -1) {
				usernames.splice(usernames.indexOf(socket.username), 1);
			}
		}
	});
});