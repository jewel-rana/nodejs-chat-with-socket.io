//Express
const express = require('express');
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io").listen(server); //PORT
const port = process.env.PORT || 4000;
// const hostname = "chat.rajtika.com";
server.listen(port, () => {
  console.log("Server Running on port " + port);
});

//modules
const Joi = require("joi");
const bodyParser = require("body-parser");
const path = require("path");

//configure Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname + "/views"));

//middlewares
app.use(express.static("assets", ["js", "css", "png", "jpg", "gif"]));
app.use(express.static("views", ["ejs"]));
app.use(express.static('bower_components', ['js', 'css']));
app.use(bodyParser.urlencoded({
    extended: true
}));

//data storage
const nicknames = [];
const oUsers = [];

const mysql = require('mysql');

const con = mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: '123456',
    database: 'mmcm'
});

con.connect(function(err) {
  if (err) {
    console.log('error: ' + err.message);
  }
 
  console.log('Connected to the MySQL server.');
});

//routes
// const webRoutes = require('./routes/web')(app, express);
// app.use('/api', require('./routes/api'));
// app.use(webRoutes);

io.sockets.on('connection', (socket) => {
    let message = {sender_id: 1, message: 'test'}
    //get all old messages
    con.query(
      "SELECT messages.message, users.name FROM messages LEFT JOIN users ON messages.sender_id=users.id ORDER BY messages.id desc LIMIT 8",
      (err, rows) => {
        let data = rows;
        socket.emit("old messages", data);
      }
    );

    //add users
    socket.on('new user', (data, callback) => {
        console.log( nicknames );
        let userHas = false;
        for( var i = 0; i < nicknames.length; i++ ) {
            if( nicknames[i].user_id == data.id )
                userHas = true;
        }
        if (userHas == true ) {
            socket.user_id = data.id;
            socket.nickname = data.name;
        } else {
            socket.user_id = data.id;
            socket.nickname = data.name;
            nicknames.push({name: socket.nickname, user_id: socket.user_id, socket: socket});
            //new user join
            io.sockets.emit("user join", socket.nickname);
        }

        updateNickenames();
        callback(true);
    });

    socket.on('send message', (data) => {
        var message = {sender_id: 1, message: data.msg}
        //save to database
        con.query('INSERT INTO messages SET ?', message, (err, rows) => {
            console.log('data inserted.');
            io.sockets.emit('new message', {name: socket.nickname, msg: data.msg});
        });
    });

    socket.on('disconnect', (data) => {
        console.log( socket.user_id );
        if (!socket.nickname) return;
        //remove nickname of disconnected user
        // nicknames.delete(nicknames[socket.nickname]);
        // delete nicknames[socket.nickname];
        for( let i = 0; i < nicknames.length; i++ ) {
            if( nicknames[i].user_id == socket.user_id){
                nicknames.splice(nicknames[i]);
            }
        }

        io.sockets.emit('user left', { name: socket.nickname, id: socket.user_id });
        updateNickenames();
    });
});

function updateNickenames() {
    for( var i = 0; i < nicknames.length; i++ ) {
        oUsers.push( {name: nicknames[i].name, socket_id: nicknames[i].socket.id, user_id: nicknames[i].user_id } );
    }
    console.log(oUsers);
    io.sockets.emit('users', oUsers);
}

function validate(data) {
    const schema = {
        name: Joi.string()
            .min(6)
            .required()
    };
    const result = Joi.validate(data, schema);
    // console.log(result);
    if (result.error)
        return result.error.details[0].message;
}

// function userExist( user_id ){ //q, VARIABLE FROM THE INPUT FIELD
//   var k = false;

//    //LOOPS THRU THE ARRAY TO CHECK IF THE KEY EXISTS
//   for(i=0; i<nicknames.length; i++){
//     if(q==nick[i]){
//       k = "true";
//     }
//   }
//   $("#k").html(k); //SHOWS EITHER "TRUE" OF "FALSE"
// }