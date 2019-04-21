const express = require('express');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const nicknames = [];

//PORT
const port = process.env.PORT || 4000;

server.listen(port, () => console.log(`Server Running on port ${port}`));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.sockets.on('connection', (socket) => {

    //add users
    socket.on('new user', (nickname, callback) => {
        if (nicknames.indexOf(nickname) != -1) {
            callback(false);
        } else {
            callback(true);
            socket.nickname = nickname;
            nicknames.push(socket.nickname);
            updateNickenames();
            //new user join
            io.sockets.emit("user join", socket.nickname);
        }
    });
    socket.on('send message', (data) => {
        console.log(socket.id);
        io.sockets.emit('new message', { name: socket.nickname, msg: data.msg });
    });

    socket.on('disconnect', (data) => {
        if (!socket.nickname) return;
        //remove nickname of disconnected user
        nicknames.splice(nicknames.indexOf(socket.nickname), 1);

        io.sockets.emit('user left', socket.nickname);
        updateNickenames();
    });
});

function updateNickenames() {
    io.sockets.emit("users", nicknames);
}