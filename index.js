const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Setup Express server untuk dashboard
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3001",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Storage untuk message logs dan bot status
let botStatus = {
    isReady: false,
    isConnected: false,
    qrCode: null,
    qrCodeDataURL: null,
    lastActivity: null,
    messageCount: 0
};

let messageLogs = [];
const MAX_LOGS = 100; // Batasi jumlah log

// QR Code management
let qrGenerationCount = 0;
let lastQrTime = null;
const QR_TIMEOUT = 300000; // 60 detik timeout untuk QR code

// Membuat instance client WhatsApp dengan autentikasi lokal
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "whatsapp-bot"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-ipc-flooding-protection',
            '--enable-features=NetworkService,NetworkServiceInProcess',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--disable-background-networking',
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-popup-blocking',
            '--disable-translate',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-client-side-phishing-detection',
            '--disable-sync',
            '--disable-extensions',
            '--user-data-dir=/tmp/chrome-user-data',
            '--data-path=/tmp/chrome-user-data',
            '--disk-cache-dir=/tmp/chrome-cache'
        ]
    }
});

// Event ketika QR code perlu di-scan
client.on('qr', async (qr) => {
    const currentTime = Date.now();
    qrGenerationCount++;
    
    // Jika QR code sudah di-generate dalam 30 detik terakhir, skip
    if (lastQrTime && (currentTime - lastQrTime) < 30000) {
        console.log(`⏳ QR Code masih valid, menunggu scan... (${qrGenerationCount})`);
        return;
    }
    
    lastQrTime = currentTime;
    console.log(`📱 Generating QR Code (${qrGenerationCount})...`);
    console.log('Scan QR code berikut dengan WhatsApp Anda:');
    qrcode.generate(qr, { small: true });
    
    try {
        // Generate QR code sebagai data URL untuk dashboard
        const qrCodeDataURL = await QRCode.toDataURL(qr, {
            width: 256,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        // Update status dan kirim ke dashboard
        botStatus.qrCode = qr;
        botStatus.qrCodeDataURL = qrCodeDataURL;
        botStatus.isConnected = false;
        botStatus.isReady = false;
        io.emit('botStatus', botStatus);
        
        console.log('📱 QR Code telah dikirim ke dashboard');
        console.log('⚠️  QR Code akan expired dalam 5 menit, silakan scan segera!');
        
        // Set timeout untuk clear QR code jika tidak di-scan
        setTimeout(() => {
            if (!botStatus.isReady && botStatus.qrCodeDataURL) {
                console.log('⏰ QR Code expired, silakan restart bot untuk QR baru');
                botStatus.qrCode = null;
                botStatus.qrCodeDataURL = null;
                io.emit('botStatus', botStatus);
            }
        }, QR_TIMEOUT);
        
    } catch (error) {
        console.error('Error generating QR code:', error);
        botStatus.qrCode = qr;
        botStatus.qrCodeDataURL = null;
        botStatus.isConnected = false;
        botStatus.isReady = false;
        io.emit('botStatus', botStatus);
    }
});

// Event ketika client berhasil terhubung
client.on('ready', () => {
    console.log('✅ WhatsApp Bot berhasil terhubung!');
    console.log('Bot siap menerima pesan...');
    
    // Reset QR generation counter
    qrGenerationCount = 0;
    lastQrTime = null;
    
    // Update status dan kirim ke dashboard
    botStatus.isReady = true;
    botStatus.isConnected = true;
    botStatus.qrCode = null;
    botStatus.qrCodeDataURL = null;
    botStatus.lastActivity = new Date().toISOString();
    io.emit('botStatus', botStatus);
});

// Event ketika client sedang loading
client.on('loading_screen', (percent, message) => {
    console.log('Loading...', percent, message);
    io.emit('loadingStatus', { percent, message });
});

// Event ketika client terputus
client.on('disconnected', (reason) => {
    console.log('❌ Client terputus:', reason);
    
    // Update status dan kirim ke dashboard
    botStatus.isReady = false;
    botStatus.isConnected = false;
    botStatus.lastActivity = new Date().toISOString();
    io.emit('botStatus', botStatus);
});

// Event ketika menerima pesan
client.on('message', async (message) => {
    try {
        // Mengabaikan pesan dari status dan grup (opsional)
        if (message.from === 'status@broadcast') return;
        
        const contact = await message.getContact();
        const chat = await message.getChat();
        
        console.log(`📨 Pesan dari ${contact.name || contact.pushname}: ${message.body}`);
        
        // Log pesan untuk dashboard
        const messageLog = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            from: contact.name || contact.pushname || message.from,
            message: message.body,
            type: 'received',
            chatName: chat.name || 'Private Chat'
        };
        
        messageLogs.unshift(messageLog);
        if (messageLogs.length > MAX_LOGS) {
            messageLogs = messageLogs.slice(0, MAX_LOGS);
        }
        
        // Update bot status
        botStatus.messageCount++;
        botStatus.lastActivity = new Date().toISOString();
        
        // Kirim update ke dashboard
        io.emit('newMessage', messageLog);
        io.emit('botStatus', botStatus);
        
        // Respon otomatis berdasarkan pesan
        const messageBody = message.body.toLowerCase();
        
        if (messageBody === 'halo' || messageBody === 'hai' || messageBody === 'hello') {
            const reply = 'Halo! 👋 Saya adalah bot WhatsApp. Bagaimana saya bisa membantu Anda?';
            await message.reply(reply);
            
            // Log reply
            const replyLog = {
                id: Date.now() + 1,
                timestamp: new Date().toISOString(),
                from: 'Bot',
                message: reply,
                type: 'sent',
                chatName: chat.name || 'Private Chat'
            };
            messageLogs.unshift(replyLog);
            io.emit('newMessage', replyLog);
        }
        else if (messageBody === 'help' || messageBody === 'bantuan') {
            const helpMessage = `🤖 *Bantuan WhatsApp Bot*

Perintah yang tersedia:
• *halo* - Menyapa bot
• *help* - Menampilkan bantuan
• *info* - Informasi tentang bot
• *waktu* - Menampilkan waktu saat ini
• *ping* - Mengecek status bot

Kirim pesan apa saja untuk mendapat respon otomatis!`;
            
            await message.reply(helpMessage);
            
            // Log reply
            const replyLog = {
                id: Date.now() + 1,
                timestamp: new Date().toISOString(),
                from: 'Bot',
                message: helpMessage,
                type: 'sent',
                chatName: chat.name || 'Private Chat'
            };
            messageLogs.unshift(replyLog);
            io.emit('newMessage', replyLog);
        }
        else if (messageBody === 'info') {
            const reply = '🤖 Saya adalah WhatsApp Bot. Saya dapat membantu Anda dengan berbagai perintah!';
            await message.reply(reply);
            
            // Log reply
            const replyLog = {
                id: Date.now() + 1,
                timestamp: new Date().toISOString(),
                from: 'Bot',
                message: reply,
                type: 'sent',
                chatName: chat.name || 'Private Chat'
            };
            messageLogs.unshift(replyLog);
            io.emit('newMessage', replyLog);
        }
        else if (messageBody === 'waktu') {
            const now = new Date();
            const timeString = now.toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            const reply = `🕐 Waktu saat ini: ${timeString}`;
            await message.reply(reply);
            
            // Log reply
            const replyLog = {
                id: Date.now() + 1,
                timestamp: new Date().toISOString(),
                from: 'Bot',
                message: reply,
                type: 'sent',
                chatName: chat.name || 'Private Chat'
            };
            messageLogs.unshift(replyLog);
            io.emit('newMessage', replyLog);
        }
        else if (messageBody === 'ping') {
            const reply = '🏓 Pong! Bot sedang aktif dan berjalan dengan baik.';
            await message.reply(reply);
            
            // Log reply
            const replyLog = {
                id: Date.now() + 1,
                timestamp: new Date().toISOString(),
                from: 'Bot',
                message: reply,
                type: 'sent',
                chatName: chat.name || 'Private Chat'
            };
            messageLogs.unshift(replyLog);
            io.emit('newMessage', replyLog);
        }
        else {
            // Respon default untuk pesan lainnya
            const responses = [
                'Halo! Saya bot WhatsApp. Ketik "bantuan" untuk informasi lebih lanjut.'
            ];
            
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            await message.reply(randomResponse);
            
            // Log reply
            const replyLog = {
                id: Date.now() + 1,
                timestamp: new Date().toISOString(),
                from: 'Bot',
                message: randomResponse,
                type: 'sent',
                chatName: chat.name || 'Private Chat'
            };
            messageLogs.unshift(replyLog);
            io.emit('newMessage', replyLog);
        }
        
    } catch (error) {
        console.error('❌ Error saat memproses pesan:', error);
    }
});

// Event ketika ada pesan masuk ke grup
client.on('message_create', async (message) => {
    // Hanya respon jika bot di-mention di grup
    if (message.hasQuotedMsg || message.mentionedIds.length > 0) {
        const mentions = message.mentionedIds;
        const botNumber = client.info?.wid?.user;
        
        if (mentions.includes(`${botNumber}@c.us`)) {
            await message.reply('Halo! Saya dipanggil? 🤖 Ketik "help" untuk melihat perintah yang tersedia.');
        }
    }
});

// Menangani error
client.on('auth_failure', (msg) => {
    console.error('❌ Autentikasi gagal:', msg);
});

// Memulai client
// API Endpoints untuk dashboard
app.get('/api/status', (req, res) => {
    res.json(botStatus);
});

app.get('/api/messages', (req, res) => {
    res.json(messageLogs);
});

app.post('/api/send-message', async (req, res) => {
    try {
        const { to, message } = req.body;
        
        if (!to || !message) {
            return res.status(400).json({ error: 'Phone number and message are required' });
        }
        
        // Format nomor telepon
        const phoneNumber = to.includes('@c.us') ? to : `${to}@c.us`;
        
        await client.sendMessage(phoneNumber, message);
        
        // Log pesan yang dikirim
        const messageLog = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            from: 'Dashboard',
            message: message,
            type: 'sent',
            chatName: to
        };
        
        messageLogs.unshift(messageLog);
        if (messageLogs.length > MAX_LOGS) {
            messageLogs = messageLogs.slice(0, MAX_LOGS);
        }
        
        // Update bot status
        botStatus.messageCount++;
        botStatus.lastActivity = new Date().toISOString();
        
        // Kirim update ke dashboard
        io.emit('newMessage', messageLog);
        io.emit('botStatus', botStatus);
        
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Dashboard connected');
    
    // Kirim status dan pesan saat ini
    socket.emit('botStatus', botStatus);
    socket.emit('messageHistory', messageLogs);
    
    socket.on('disconnect', () => {
        console.log('Dashboard disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
    console.log(`🌐 Dashboard server running on port ${PORT}`);
});

console.log('🚀 Memulai WhatsApp Bot...');
client.initialize();

// Menangani shutdown yang bersih
process.on('SIGINT', async () => {
    console.log('\n🛑 Menghentikan bot...');
    try {
        if (client && client.pupBrowser) {
            await client.destroy();
        }
    } catch (error) {
        console.log('Error saat shutdown:', error.message);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Menghentikan bot...');
    try {
        if (client && client.pupBrowser) {
            await client.destroy();
        }
    } catch (error) {
        console.log('Error saat shutdown:', error.message);
    }
    process.exit(0);
});