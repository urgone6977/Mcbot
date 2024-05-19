const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const mc = require('minecraft-protocol');

const serverHost = 'Notpdfile.aternos.me'; // Use hostname
const serverPort = 20102;
const botUsername = 'herobrine';
const reconnectInterval = 40 * 1000; // Reconnect interval in milliseconds

let bot = null; // Initialize the bot as null

app.use(express.static(path.join(__dirname, '')));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'main.html'));
});

io.on('connection', function(socket) {
  console.log('A user connected');

  socket.on('control_bot', function(command) {
    switch (command) {
      case 'start':
        if (!bot) {
          checkPlayersAndJoin();
        }
        break;
      case 'stop':
        if (bot) {
          bot.end(); // Gracefully disconnect the bot
          bot = null; // Reset bot to null since it's no longer running
          console.log('Bot stopped.');
          io.emit('bot_status', 'Bot stopped.');
        }
        break;
      case 'reconnect':
        if (bot) {
          bot.end(); // Gracefully disconnect the bot before reconnecting
        }
        console.log('Reconnecting bot...');
        io.emit('bot_status', 'Reconnecting bot...');
        setTimeout(() => {
          checkPlayersAndJoin(); // Reconnect the bot after a short delay
        }, 1000);
        break;
      default:
        console.log('Unknown command.');
        break;
    }
  });
});

http.listen(3000, function() {
  console.log('Example app listening on port 3000!');
});

function checkPlayersAndJoin() {
  mc.ping({ host: serverHost, port: serverPort }, (err, response) => {
    if (err) {
      console.error('Error pinging server:', err);
      io.emit('bot_status', 'Error pinging server.');
      return;
    }

    const playersOnline = response.players.online;
   
