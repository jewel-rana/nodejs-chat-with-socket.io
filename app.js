const express = require('express');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const mongoose = require('mongoose');
const nicknames = {};

//PORT
const port = process.env.PORT || 4000;
const hostname = 'chat.rajtika.com';

const mysql = require('mysql');

const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'nodechat'
});

con.connect(function(err) {
  if (err) {
    console.log('error: ' + err.message);
  }
 
  console.log('Connected to the MySQL server.');
});



server.listen(port, () => {
    console.log('Server Running on port 4000');
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.sockets.on('connection', (socket) => {

    //get all old messages
    con.query('INSERT INTO employees SET ?', message, (err, rows) => {
        console.log('data inserted.');
        io.sockets.emit('old message', {name: socket.nickname, msg: rows});
    });

    //add users
    socket.on('new user', (nickname, callback) => {
        if (nickname in nicknames) {
            callback(false);
        } else {
            callback(true);
            socket.nickname = nickname;
            nicknames[socket.nickname] = socket;
            updateNickenames();
            //new user join
            io.sockets.emit("user join", socket.nickname);
        }
    });

    socket.on('send message', (data) => {
        var message = {sender_id: 1, message: data}
        //save to database
        con.query('INSERT INTO employees SET ?', message, (err, rows) => {
            console.log('data inserted.');
            io.sockets.emit('new message', {name: socket.nickname, msg: data.msg});
        });
    });

    socket.on('disconnect', (data) => {
        if (!socket.nickname) return;
        //remove nickname of disconnected user
        // nicknames.delete(nicknames[socket.nickname]);
        delete nicknames[socket.nickname];

        io.sockets.emit('user left', socket.nickname);
        updateNickenames();
    });
});

function updateNickenames() {
    io.sockets.emit("users", Object.keys(nicknames));
}