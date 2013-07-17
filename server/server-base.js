var app, express, io, server, uuid, ws;

express = require('express');

app = express();

ws = require('websocket.io');

uuid = require('node-uuid');

app.use(express["static"]('./public'));

app.get('/:room', function(req, res) {
  var _ref;
  return res.render('index.jade', {
    params: req.query,
    room_count: ((_ref = io.clientsByRoom[req.params.room]) != null ? _ref.length : void 0) || 0
  });
});

server = app.listen(3002);

io = ws.attach(server);

io.clientsById || (io.clientsById = {});

io.clientsByRoom || (io.clientsByRoom = {});

io.on('connection', function(socket) {
  var room, _base;
  room = /\/(.+)/.exec(socket.req.url)[1];
  socket.id = uuid.v1();
  socket.room = room;
  if (!room) {
    socket.close();
    return;
  }
  (_base = io.clientsByRoom)[room] || (_base[room] = []);
  io.clientsByRoom[room].push(socket);
  io.clientsById[socket.id] = socket;
  socket.send(JSON.stringify({
    type: 'assigned_id',
    id: socket.id
  }));
  return socket.on('message', function(data) {
    var msg, sock, _i, _len, _ref, _results;
    msg = JSON.parse(data);
    switch (msg.type) {
      case 'received_offer':
      case 'received_candidate':
      case 'received_answer':
        _ref = io.clientsByRoom[socket.room];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          sock = _ref[_i];
          if (sock.id !== socket.id) {
            _results.push(sock.send(JSON.stringify(msg)));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
        break;
      case 'close':
        return socket.close();
    }
  });
});
