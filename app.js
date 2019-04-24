const express = require('express');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const mongoose = require('mongoose');
const nicknames = {};

//PORT
const port = process.env.PORT || 4000;
const hostname = 'chat.rajtika.com';

//connect to mongodb
mongoose.connect('mongodb://localhost:27017/chat', { useNewUrlParser: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('MongoDB Connected');
});

const chatSchema = mongoose.Schema({
    nickname: String,
    message: String,
    created: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Message', chatSchema);

server.listen(port, () => {
    console.log('Server Running on port 4000');
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.sockets.on('connection', (socket) => {
    //load old message
    Chat.remove({});
    const query = Chat.find({});
    query.sort('-created').limit(8).exec((err, data) => {
        if (err) throw err;
        socket.emit('old messages', data);
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
        console.log(socket.id);
        //save to database
        var newMsg = new Chat({ nickname: socket.nickname, message: data.msg });
        newMsg.save((err) => {
            if (err) throw err;
            io.sockets.emit('new message', { name: socket.nickname, msg: data.msg });
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