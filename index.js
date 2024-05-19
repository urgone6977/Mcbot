const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const mc = require('minecraft-protocol');

const serverHost = 'Notpdfile.aternos.me'; // Replace with your Aternos server address
const serverPort = 20102; // Replace with your Aternos server port
const botUsername = 'herobrine';
const reconnectInterval = 40 * 1000; // Reconnect interval in milliseconds

let bot = null; // Initialize the bot as null

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

function checkPlayersAndJoin() {
  console.log(`Pinging server ${serverHost}:${serverPort}...`);

  mc.ping({ host: serverHost, port: serverPort }, (err, response) => {
    if (err) {
      console.error('Error pinging server:', err);
      io.emit('bot_status', 'Error pinging server: ' + err.message);
      // Retry connecting after a short delay
      setTimeout(checkPlayersAndJoin, reconnectInterval);
      return;
    }

    console.log('Ping response:', response);
    const playersOnline = response.players.online;
    console.log(`Players online: ${playersOnline}`);
    io.emit('server_status', `Players online: ${playersOnline}`);

    if (playersOnline > 0) {
      joinServer();
    } else {
      console.log('No players online, bot will not join.');
      io.emit('bot_status', 'No players online, bot will not join.');
    }
  });
}

function joinServer() {
  console.log('Attempting to join server...');

  bot = mc.createClient({
    host: serverHost,
    port: serverPort,
    username: botUsername,
  });

  bot.on('login', () => {
    console.log(`Bot ${botUsername} has logged in`);
    io.emit('bot_status', `Bot ${botUsername} has logged in`);
  });

  bot.on('end', () => {
    console.log('Bot disconnected from the server');
    io.emit('bot_status', 'Bot disconnected from the server');
    bot = null;

    // Reconnect bot after the specified interval
    setTimeout(() => {
      checkPlayersAndJoin();
    }, reconnectInterval);
  });

  bot.on('error', (err) => {
    console.error('Bot encountered an error:', err);
    io.emit('bot_status', `Bot encountered an error: ${err.message}`);
    bot = null;

    // Retry connecting after a short delay
    setTimeout(checkPlayersAndJoin, reconnectInterval);
  });
}

http.listen(3000, function() {
  console.log('Example app listening on port 3000!');
});
