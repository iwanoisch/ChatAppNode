// var app = require('express')();
// var server = require('http').Server(app);
// var io = require('socket.io')(server);

// server.listen(3000);

// app.get('/', function (req, res) {
//   res.sendfile(__dirname + '/index.html');
// });

// io.on('connection', function (socket) {
//   socket.emit('news', { hello: 'world' });
//   socket.on('my other event', function (data) {
//     console.log(data);
//   });
// });

var app = require('express')();
//var http = require('http').Server(app);
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var admin = require("firebase-admin");
var firebaseCredential = require(__dirname + '/private/serviceCredential.json')



//var serviceAccount = require("path/to/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(firebaseCredential),
  databaseURL: "https://chatapp-b290a.firebaseio.com"
});

var accountRequests = require('./firebase/account-services');

var friendRequests = require('./firebase/friend-services');

// io.on('connection', function (socket){
//   console.log('Client'+ socket.id +'has conncted!');

//   socket.on('disconnect', function(){
//     console.log('A client has disconnected');
//   });
// });

accountRequests.userAccountRequest(io);
friendRequests.userFriendsRequests(io);

server.listen(3000, function() {
  console.log('Server is listening on port 3000');
});
