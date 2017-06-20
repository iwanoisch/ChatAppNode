var app = require('express')();

var http = require('http').Server(app);

var io = require('socket.io')(http);
var admin = require('firebase-admin');

var FCM = require('fcm-push');
var serverKey = 'AAAA9h5U6C0:APA91bGZ5TQaJGp2cXRNx939oOwxzBe974WiToQc37s6oT0qJDu7qXgDRWOqeHxMSHoOhlEk5Ay4M_NOMYYXHnnRPzxSdVA_LEuXAoa6wdXGgRsN0bZcouoegPYT-D0nwHtf49O23LZ2';
var fcm = new FCM(serverKey);

var userFriendsRequests = function (io) {

    io.on('connection', function (socket) {
        console.log('Client' + socket.id + 'has conncted to friend services!');
        
        sendMessage(socket, io);
        approveOrDeclineFriendRequest(socket, io);
        sendOrDeleteFriendRequest(socket, io);
        detectDisconnection(socket, io);

    });

};


function sendMessage(socket, io) {
    socket.on('details', function (data) {
        var db = admin.database();
        var friendMessageRef = db.ref('userMessages').child(encodeEmail(data.friendEmail))
            .child(encodeEmail(data.senderEmail)).push();

        var newfriendMessagesRef = db.ref('newUserMessages').child(encodeEmail(data.friendEmail))
            .child(friendMessageRef.key);

            
        var chatRoomRef = db.ref('userChatRooms').child(encodeEmail(data.friendEmail))
        .child(encodeEmail(data.senderEmail));

        var message = {
            messageId: friendMessageRef.key,
            messageText: data.messageText,
            messageSenderEmail: data.senderEmail,
            messageSenderPicture: data.senderPicture
        };

    

        var chatRoom = {
            friendPicture: data.senderPicture,
            friendName: data.senderName,
            friendEmail: data.senderEmail,
            lastMessage: data.messageText,
            lastMessageSenderEmail: data.senderEmail,
            lastMessageRead:false,
            sentLastMessage:true
        };

        friendMessageRef.set(message);
        newfriendMessagesRef.set(message);

        chatRoomRef.set(chatRoom);

    });
}



function approveOrDeclineFriendRequest(socket, io) {
    socket.on('friendRequestResponse', function (data) {

        var db = admin.database();
        var friendRequestRef = db.ref('friendRequestsSent').child(encodeEmail(data.friendEmail))
            .child(encodeEmail(data.userEmail));
        friendRequestRef.remove();

        if (data.requestCode == 0) {
            var db = admin.database();
            var ref = db.ref('users');
            var userRef = ref.child(encodeEmail(data.userEmail));

            var userFriendRef = db.ref('userFriends');
            var friendFriendRef = userFriendRef.child(encodeEmail(data.friendEmail))
                .child(encodeEmail(data.userEmail));

            userRef.once('value', function (snapshot) {

                friendFriendRef.set({
                    email: snapshot.val().email,
                    userName: snapshot.val().userName,
                    userPicture: snapshot.val().userPicture,
                    dateJoined: snapshot.val().dateJoined,
                    hasLoggedIn: snapshot.val().hasLoggedIn
                });

            });
        }
    });
}


function sendOrDeleteFriendRequest(socket, io) {

    socket.on('friendRequest', function (data) {
        var friendEmail = data.email;
        var userEmail = data.userEmail;
        var requestCode = data.requestCode;

        var db = admin.database();
        var friendRef = db.ref('friendRequestRecieved').child(encodeEmail(friendEmail))
            .child(encodeEmail(userEmail));

        if (requestCode == 0) {
            var db = admin.database();
            var ref = db.ref('users');
            var userRef = ref.child(encodeEmail(data.userEmail));

            userRef.once('value', function (snapshot) {

                friendRef.set({
                    email: snapshot.val().email,
                    userName: snapshot.val().userName,
                    userPicture: snapshot.val().userPicture,
                    dateJoined: snapshot.val().dateJoined,
                    hasLoggedIn: snapshot.val().hasLoggedIn
                });

            });

            var tokenRef = db.ref('userToken');
            var friendToken = tokenRef.child(encodeEmail(friendEmail));

            friendToken.once("value", function (snapshot) {
                var message = {
                    to: snapshot.val().token,
                    data: {
                        title: 'Chat App',
                        body: 'Friend Request from ' + userEmail
                    },
                };

                fcm.send(message)
                    .then(function (response) {
                        console.log('Messag sent!')
                    }).catch(function (err) {
                        console.log(err);
                    });
            });

        } else {
            friendRef.remove();

        }
    });

}

function detectDisconnection(socket, io) {
    socket.on('disconnect', function () {
        console.log('A client has disconnected from friend services');
    });
}

function encodeEmail(email) {

    email = email.replace('.', ',');
    return email.replace('.', ',');
}

module.exports = {
    userFriendsRequests
}
