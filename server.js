///----------------------------------USING HTTP+EXPRESS-----------------------------------------------------
//http and express packages can be used independently to createServer
//however, http is dependent on express to serve static files to user on webpage

// const express = require("express"); //expresss is used to handle web requests
// const app = express(); //express is used to handle web requests
// const cors = require("cors");
// const url = require("url");
// const fs = require("fs");
// const lookup = require("mime-types").lookup;

// app.use(cors());//accessible to any
// //BodyParser middleware to handle raw JSON data
// app.use(express.json);
// app.use(express.urlencoded({extended: false}));

// const PORT = process.env.PORT || 3002;
// ///USING HTTP TO CREATE SERVER
// const http = require("http");
// const server = http.createServer(handleRequest); //httpServer+socketIO is used to handle websocket communication
// const { Server } = require("socket.io");
// const io = new Server(server);
// server.listen(PORT, () => {
//   log(`Listening on PORT ${PORT}`);
// });
// ///USING EXPRESS TO CREATE SERVER
// // const server = app.listen(PORT, () => {
// //   log(`Listening on PORT ${PORT}`);
// // });
// // const io = require("socket.io")(server);


// app.get('/', (req, res) => {///Using Express
//   handleRequest(req,res);
// });

// function handleRequest(req, res){
//   // res.sendFile(__dirname + '/public/index.html'); ///doenst consider MIME types
//   //handle the request and send back a static file from a folder called `public`
//   let parsedURL = url.parse(req.url, true);
//   //remove the leading and trailing slashes
//   let path = parsedURL.path.replace(/^\/+|\/+$/g, "");
//   if (path == "") path = "index.html";
//   // console.log(`Requested path ${path} `);

//   let file = __dirname + "/public/" + path;
//   //async read file function uses callback
//   fs.readFile(file, function(err, content) {
//     if (err) {
//       log(`CUSTOMLOG: File Not Found ${file}`);
//       res.writeHead(404);
//       res.end();
//     } else {
//       //specify the content type in the response
//       // console.log(`Returning ${path}`);
//       res.setHeader("X-Content-Type-Options", "nosniff");
//       let mime = lookup(path);
//       res.writeHead(200, { "Content-type": mime });
//       // switch (path) {
//       //   case "main.css":
//       //     res.writeHead(200, { "Content-type": "text/css" });
//       //     break;
//       //   case "main.js":
//       //     res.writeHead(200, { "Content-type": "application/javascript" });
//       //     break;
//       //   case "index.html":
//       //     res.writeHead(200, { "Content-type": "text/html" });
//       // }
//       res.end(content);
//     }
//   });
// };
///---------------------------------------------------------------------------------------

///----------------------------------USING KOA-----------------------------------------------------
//Express cant be used to listen Server+SocketIO and also serve files, but koa can.
///Koa minifies code for serving static files and handles mime-types 4 developer 
//for koa to serve files in a folder, the main webpage should be index.html

// 'use strict'
const Koa = require('koa'); //Better than express
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser'); //function of package explained below
const app = new Koa();
const serve = require('koa-static');
// const mount = require('koa-mount');
app.use(cors());//accessible to any device or web
app.use(bodyParser());
/// FUNCTION of bodyParser is to parse POST requests received by server so that can elements in JSON can be accessed easily e.g req.body.userID
//can be used in koa or express(import body-parser). Not used in this project though

const PORT = process.env.PORT || 3002;

///USING EXPRESS TO CREATE SERVER
const server = app.listen(PORT, () => {
  log(`Listening on PORT ${PORT}`);
});
const io = require('socket.io')(server);

app.use(serve("./public"));
// app.use(mount('/anotherPath', serve("./anotherFolder")));
///---------------------------------------------------------------------------------------

const elevatorInfoUpdateEvent = 'elevatorInfoUpdate';
const clientInfoUpdateEvent= 'clientInfoUpdate';
const acknowledgeDeviceRequestEvent= 'acknowledgeDeviceRequest';
const acknowledgeDeviceResponseEvent= 'acknowledgeDeviceResponse';
const esp32PingEvent = "esp32Ping";
const serverPingEvent = "serverPing";
const elevPropertiesOnESP32ConnectionEvent = "elevPropertiesOnESP32Connection";
const connectedToESP32Event = "connectedToESP32";
const esp32ID = "ESP32";
const webpageID = "WEBPAGE";
var ESP32SocketID;
const connectedClients = new Map();


io.on('connection', (socket) => {
    try {
      socket.emit(acknowledgeDeviceRequestEvent);
    } catch (error) {
      log('ERROR in requesting for new connection device ID.' +error);
    }

    socket.on(acknowledgeDeviceResponseEvent, (data) => {
      try {
        var playerExists = false;
        Object.keys(connectedClients).forEach(function (key){
            if(key.match('^'+socket.id)) playerExists = true;  
        });
        //  console.log('player exists', playerExists);
        if(!playerExists){
            if(data == esp32ID){
              connectedClients.set(socket.id,esp32ID);
              ESP32SocketID = socket.id;
              log(`${esp32ID} is connected`);
              socket.emit(elevPropertiesOnESP32ConnectionEvent,""); //to esp32
              socket.broadcast.emit(connectedToESP32Event,"1"); //to other connected devices
            }
            else if(data == webpageID){
              var name = `${webpageID}${connectedClients.size}`; //not in order of the 1dt to the last opened webpages; is just a map value name
              connectedClients.set(socket.id,name);
              log(`${name} is connected`);
            }
          }
      } catch (error) {  
        log('ERROR in adding new socket.' +error);
      }
    });

    socket.on(elevatorInfoUpdateEvent, (data) => {///Sent by ESP32
      socket.broadcast.emit(elevatorInfoUpdateEvent,data);
    });

    socket.on(clientInfoUpdateEvent, (data) => {///Sent by client device
      // console.log('Sending JsonData to ESP32: '+data);
      if(ESP32SocketID != null) socket.broadcast.to(ESP32SocketID).emit(clientInfoUpdateEvent,data);
    });

    socket.on(esp32PingEvent, (data) => {///Sent by ESP32
      socket.emit(serverPingEvent,data);
    });

    socket.on('disconnect', () => {
      try {
        if(ESP32SocketID == socket.id) {
          log(`${connectedClients.get(socket.id)} disconnected`);
          ESP32SocketID = null;
          socket.broadcast.emit(connectedToESP32Event,"0"); //to other connected devices
        }
        else log(`${connectedClients.get(socket.id)} disconnected`);
        connectedClients.delete(socket.id); 
      } catch (error) {
          log('ERROR in removing socketID from map.',error);
      }
  
    });
  });

function log(logText){
  console.log(`CUSTOMLOG: `+logText);
}

