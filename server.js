import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: false
  }
});

app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// In-memory storage for demo purposes
let users = [];
let messages = {};
let onlineUsers = new Set();
let typingUsers = new Set();

// No authentication middleware

io.on('connection', (socket) => {
  console.log('User connected');

  // Wait for user to set username
  socket.on('setUsername', (username) => {
    socket.user = { username };
    console.log('User set username:', username);

    // Add user to online users
    onlineUsers.add(username);
    io.emit('onlineUsers', Array.from(onlineUsers));
  });

  // Join default room
  socket.join('general');

  // Handle joining rooms
  socket.on('joinRoom', (room) => {
    socket.join(room);
    if (!messages[room]) {
      messages[room] = [];
    }
    socket.emit('roomMessages', messages[room]);
  });

  // Handle leaving rooms
  socket.on('leaveRoom', (room) => {
    socket.leave(room);
  });

  // Handle private messaging
  socket.on('joinPrivate', (otherUser) => {
    const room = [socket.user.username, otherUser].sort().join('-');
    socket.join(room);
    if (!messages[room]) {
      messages[room] = [];
    }
    socket.emit('privateMessages', messages[room]);
  });

  // Handle sending messages
  socket.on('sendMessage', (data) => {
    if (!socket.user) return;
    const { room, message, isPrivate, recipient } = data;
    const msg = {
      id: Date.now(),
      user: socket.user.username,
      message,
      timestamp: new Date(),
      readBy: [socket.user.username]
    };

    if (isPrivate) {
      const privateRoom = [socket.user.username, recipient].sort().join('-');
      if (!messages[privateRoom]) messages[privateRoom] = [];
      messages[privateRoom].push(msg);
      socket.to(privateRoom).emit('message', msg);
    } else {
      if (!messages[room]) messages[room] = [];
      messages[room].push(msg);
      socket.to(room).emit('message', msg);
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    if (!socket.user) return;
    const { room, isPrivate, recipient } = data;
    const typingKey = isPrivate ? `${socket.user.username}-${recipient}` : `${socket.user.username}-${room}`;
    typingUsers.add(typingKey);
    if (isPrivate) {
      const privateRoom = [socket.user.username, recipient].sort().join('-');
      socket.to(privateRoom).emit('userTyping', { user: socket.user.username, typing: true });
    } else {
      socket.to(room).emit('userTyping', { user: socket.user.username, typing: true });
    }
  });

  socket.on('stopTyping', (data) => {
    if (!socket.user) return;
    const { room, isPrivate, recipient } = data;
    const typingKey = isPrivate ? `${socket.user.username}-${recipient}` : `${socket.user.username}-${room}`;
    typingUsers.delete(typingKey);
    if (isPrivate) {
      const privateRoom = [socket.user.username, recipient].sort().join('-');
      socket.to(privateRoom).emit('userTyping', { user: socket.user.username, typing: false });
    } else {
      socket.to(room).emit('userTyping', { user: socket.user.username, typing: false });
    }
  });

  // Handle read receipts
  socket.on('markAsRead', (data) => {
    const { messageId, room, isPrivate, recipient } = data;
    const targetMessages = isPrivate ? messages[[socket.user.username, recipient].sort().join('-')] : messages[room];
    if (targetMessages) {
      const msg = targetMessages.find(m => m.id === messageId);
      if (msg && !msg.readBy.includes(socket.user.username)) {
        msg.readBy.push(socket.user.username);
        if (isPrivate) {
          const privateRoom = [socket.user.username, recipient].sort().join('-');
          io.to(privateRoom).emit('readReceipt', { messageId, user: socket.user.username });
        } else {
          io.to(room).emit('readReceipt', { messageId, user: socket.user.username });
        }
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.user) {
      console.log('User disconnected:', socket.user.username);
      onlineUsers.delete(socket.user.username);
      io.emit('onlineUsers', Array.from(onlineUsers));
    }
  });
});

// Auth routes
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  res.json({ message: 'User registered' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, JWT_SECRET);
  res.json({ token });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});