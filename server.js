var app, express, io, server, uuid, ws;

express = require('express');
app = express();
ws = require('websocket.io');
uuid = require('node-uuid');

app.configure(function () {
    app.use(express.static(__dirname + '/page'));
});

app.get('/:group', function(req, res) { // 
    var _ref;

    return res.render('index.jade', {
        params: req.query,
        groupCount: ((_ref = io.clientsByGroup[req.params.group]) != null ? _ref.length : void 0) || 0
    });
});

server = app.listen(80);

io = ws.attach(server);

io.clientsById || (io.clientsById = {});
io.clientsByGroup || (io.clientsByGroup = {});

io.on('connection', function(socket) {
    var group, _base;

    group = (socket.req.url !="/") ? /\/(.+)/.exec(socket.req.url)[1] : ":base";
    socket.id = uuid.v1();
    socket.group = group;

    if (!group) {
        socket.close();
        return;
    }

    (_base = io.clientsByGroup)[group] || (_base[group] = []);

    io.clientsByGroup[group].push(socket);
    io.clientsById[socket.id] = socket;

    socket.send(
        JSON.stringify({
            type: 'uuid',
            id: socket.id
        })
    );

    socket.send(
        JSON.stringify({
            type: 'node-debug',
            key: 'group',
            value: group
        })
    );

    return socket.on('message', function(data) {
        var msg, sock, i, length, _ref, results;
        msg = JSON.parse(data);

        switch (msg.type) {
            case 'offered':
            case 'candidate':
            case 'answered':
                _ref = io.clientsByGroup[socket.group];
                results = [];
                for (i = 0, length = _ref.length; i < length; i++) {
                  sock = _ref[i];
                    if (sock.id !== socket.id) {
                        results.push(sock.send(JSON.stringify(msg)));
                    } else {
                        results.push(void 0);
                    }
                }
                return results;
                break;
            case 'close':
                return socket.close();
        }
    });
});
