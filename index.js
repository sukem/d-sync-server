'use strict';

const socketIO = require('socket.io');

const PORT = process.env.PORT || 3000;
const io = socketIO.listen(PORT, {
    serveClient: false,
    // origins: ['*:*']
});

const rooms = [];

io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('disconnect', () => {
        const room = rooms.find(r => r.ids.includes(socket.id));
        if (room) {
            room.ids.splice(room.ids.findIndex(id => id === socket.id), 1);
            if (room.ids.length === 0) {
                rooms.splice(rooms.findIndex(r => r === room), 1);
            } else {
                socket.to(room.name).emit('room_info', {
                    'name': room.name,
                    'nop': room.ids.length,
                    'state': 'pending',
                    'seek': 0
                });
            }
        }
        // console.log(rooms.length);
    });

    socket.on('room_name', (name) => {
        if (!name) return;
        let room = rooms.find(r => r.name === name);
        if (room) {
            room.ids.push(socket.id);
        } else {
            room = {
                'name': name,
                'ids': [socket.id]
            };
            rooms.push(room);
        }
        socket.join(name);
        const info = {
            'name': name,
            'nop': room.ids.length,
            'state': 'pending',
            'seek': 0
        };
        socket.to(name).emit('room_info', info);
        socket.emit('room_info', info);
        console.log('joined to ' + name);
        // console.log(rooms[0].ids.length);
    });

    socket.on('play_request', () => {
        const room = rooms.find(r => r.ids.includes(socket.id));
        console.log('got request: ' + room.name);
        socket.to(room.name).emit('play');
        socket.emit('play');
    });

    socket.on('seek_request', (time) => {
        const room = rooms.find(r => r.ids.includes(socket.id));
        console.log('got seek request: ' + room.name);
        socket.to(room.name).emit('seek', time);
        room.readyCount = 0;
    });

    socket.on('im_ready', () => {
        const room = rooms.find(r => r.ids.includes(socket.id));
        console.log('im_ready 1' + room.readyCount);
        if (room.readyCount) {
            room.readyCount = 1;
        } else {
            room.readyCount = parseInt(room.readyCount) + parseInt(1);
        }
        console.log('im_ready 2' + room.readyCount);
        // >== 変更
        if (room.readyCount >= (room.ids.length - 1)) {
            socket.to(room.name).emit('resume');
            socket.emit('resume');
            // これで行けるか？
            room.readyCount = 0;
        }
    });
});