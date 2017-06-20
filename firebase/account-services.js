var app = require('express')();

var http = require('http').Server(app);

var io = require('socket.io')(http);
var admin = require('firebase-admin');

var userAccountRequest = function (io) {

  io.on('connection', function (socket) {
    console.log('Client' + socket.id + 'has conncted!');

    detectDisconnection(socket, io);
    registerUser(socket, io);
    logUserIn(socket, io);

  });

};



function logUserIn(socket, io) {
  socket.on('userInfo', function (data) {
    admin.auth().getUserByEmail(data.email)
      .then(function (userRecord) {
        var db = admin.database();
        var ref = db.ref('users');
        var userRef = ref.child(encodeEmail(data.email));

        userRef.once('value', function (snapshot) {
          var additionalClaims = {
            email:data.email
          };

          admin.auth().createCustomToken(userRecord.uid, additionalClaims)
            .then(function (customToken) {

              Object.keys(io.sockets.sockets).forEach(function (id) {
                console.log("Login Success");
                if (id == socket.id) {
                  var token = {
                    authToken: customToken,
                    email: data.email,
                    photo: snapshot.val().userPicture,
                    displayName: snapshot.val().userName,
                  }
                  

                  userRef.child('hasLoggedIn').set(true);
                  io.to(id).emit('token', { token });
                }
              });

            }).catch(function (error) {

              Object.keys(io.sockets.sockets).forEach(function (id) {
                console.log("Login Success");
                if (id == socket.id) {
                  var token = {
                    authToken: error.message,
                    email: 'error',
                    photo: 'error',
                    displayName: 'error',
                  }

                  io.to(id).emit('token', { token });
                }
              });
            });
        });
      });
  });
}



function registerUser(socket, io) {
  socket.on('userData', function (data) {
    //console.log(data.email);
    // console.log(data.username)
    // console.log(data.password);

    admin.auth().createUser({
      email: data.email,
      displayName: data.userName,
      password: data.password
    })
      .then(function (userRecord) {
        console.log('User was registered successfully');
        var db = admin.database();
        var ref = db.ref('users');
        var userRef = ref.child(encodeEmail(data.email));
        console.log(userRef);
        var date = {
          data: admin.database.ServerValue.TIMESTAMP
        };

        userRef.set({
          email: data.email,
          userName: data.userName,
          userPicture: 'https://dl.dropboxusercontent.com/s/sdmw0p5avpvh41g/635319915.jpg?dl=0',
          dateJoined: date,
          hasLoggedIn: false
        });

        Object.keys(io.sockets.sockets).forEach(function (id) {
          console.log("Login Success");
          if (id == socket.id) {

            var message = {
              text: 'Success'
            }
            io.to(id).emit('message', { message });
          }
        });

      }).catch(function (error) {
        Object.keys(io.sockets.sockets).forEach(function (id) {
          console.log("Login Error:" + error.message);
          if (id == socket.id) {
            var message = {
              text: error.message
            }
            io.to(id).emit('message', { message });
          }
        });
      });
  });
}

function detectDisconnection(socket, io) {
  socket.on('disconnect', function () {
    console.log('A client has disconnected');
  });
}

function encodeEmail(email) {

  email = email.replace('.', ',');
  return email.replace('.', ',');
}

module.exports = {
  userAccountRequest
}
