import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { registerSocketHandlers } from './socket/socketHandler.js';

const app = express();
app.use(cors()); // Allow all local network traffic

const httpServer = createServer(app);

// Allow connection from any origin (Mobile dev server, PC dev server)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

registerSocketHandlers(io);

// Basic health check route
app.get('/', (req, res) => {
  res.send('Vibrade Game Server is running.');
});

const PORT = Number(process.env.PORT ?? 3000);

httpServer.listen(PORT, () => {
  console.log(`=================================`);
  console.log(` Vibrade Server Ready`);
  console.log(` Mode: Server Authoritative`);
  console.log(` URL: http://0.0.0.0:${PORT}`);
  console.log(`=================================`);
});
