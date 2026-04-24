const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Servidor Signaling Activo</title></head>
    <body style="font-family:sans-serif;text-align:center;padding:50px;">
      <h1>✅ Servidor Signaling Activo</h1>
      <p>El servidor está funcionando correctamente.</p>
    </body>
    </html>
  `);
});

app.get('/viewer.html', (req, res) => {
  const room = req.query.room;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Visor de pantalla</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: system-ui;
        }
        .container {
          background: white;
          border-radius: 32px;
          padding: 20px;
          max-width: 90%;
          width: 800px;
          text-align: center;
        }
        video {
          width: 100%;
          height: auto;
          background: #000;
          border-radius: 16px;
          margin-top: 20px;
        }
        .status {
          padding: 10px;
          background: #F8F9FA;
          border-radius: 16px;
          margin-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 style="color:#FF6B35;">📱 Visor de pantalla</h1>
        <div class="status" id="status">Conectando...</div>
        <video id="remoteVideo" autoplay playsinline muted></video>
      </div>
      <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
      <script>
        const socket = io();
        const room = "${room}";
        const remoteVideo = document.getElementById('remoteVideo');
        const statusDiv = document.getElementById('status');
        
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        pc.ontrack = (event) => {
          remoteVideo.srcObject = event.streams[0];
          statusDiv.innerHTML = '✅ Transmitiendo en vivo';
        };
        
        socket.on('connect', () => {
          socket.emit('viewer', room);
          statusDiv.innerHTML = '⏳ Conectado, esperando transmisión...';
        });
        
        socket.on('offer', async (offer) => {
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { answer, room });
        });
        
        socket.on('candidate', (candidate) => {
          pc.addIceCandidate(new RTCIceCandidate(candidate.candidate));
        });
      </script>
    </body>
    </html>
  `);
});

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  socket.on('broadcaster', (room) => {
    socket.join(room);
    console.log('Broadcaster en sala:', room);
  });
  
  socket.on('viewer', (room) => {
    socket.join(room);
    socket.to(room).emit('watcher');
    console.log('Visor conectado a sala:', room);
  });
  
  socket.on('offer', (data) => {
    socket.to(data.room).emit('offer', data.offer);
  });
  
  socket.on('answer', (data) => {
    socket.to(data.room).emit('answer', data.answer);
  });
  
  socket.on('candidate', (data) => {
    socket.to(data.room).emit('candidate', data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Servidor signaling corriendo en puerto ${PORT}`);
});
