'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircle, Send, Activity, Clock, Users, Wifi, WifiOff, QrCode } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface BotStatus {
  isReady: boolean;
  isConnected: boolean;
  qrCode: string | null;
  qrCodeDataURL: string | null;
  lastActivity: string | null;
  messageCount: number;
}

interface MessageLog {
  id: number;
  timestamp: string;
  from: string;
  message: string;
  type: 'received' | 'sent';
  chatName: string;
}

export default function Dashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus>({
    isReady: false,
    isConnected: false,
    qrCode: null,
    qrCodeDataURL: null,
    lastActivity: null,
    messageCount: 0
  });
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [newMessage, setNewMessage] = useState({ to: '', message: '' });
  const [isConnected, setIsConnected] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // Koneksi ke Socket.io server
    const newSocket = io(process.env.NEXT_PUBLIC_BOT_SERVER_URL || 'http://localhost:3002');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to bot server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from bot server');
    });

    newSocket.on('botStatus', (status: BotStatus) => {
      setBotStatus(status);
    });

    newSocket.on('messageHistory', (messageHistory: MessageLog[]) => {
      setMessages(messageHistory);
    });

    newSocket.on('newMessage', (message: MessageLog) => {
      setMessages(prev => [message, ...prev.slice(0, 99)]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const sendMessage = async () => {
    if (!newMessage.to || !newMessage.message) {
      setAlert({ type: 'error', message: 'Nomor telepon dan pesan harus diisi' });
      return;
    }

    setSendingMessage(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BOT_SERVER_URL || 'http://localhost:3002'}/api/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMessage),
      });

      if (response.ok) {
        setAlert({ type: 'success', message: 'Pesan berhasil dikirim!' });
        setNewMessage({ to: '', message: '' });
      } else {
        const error = await response.json();
        setAlert({ type: 'error', message: error.error || 'Gagal mengirim pesan' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Error: Tidak dapat terhubung ke server' });
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = () => {
    if (!isConnected) {
      return <Badge variant="destructive" className="flex items-center gap-1"><WifiOff className="w-3 h-3" /> Disconnected</Badge>;
    }
    if (botStatus.isReady) {
      return <Badge variant="default" className="flex items-center gap-1 bg-green-500"><Wifi className="w-3 h-3" /> Ready</Badge>;
    }
    if (botStatus.isConnected) {
      return <Badge variant="secondary" className="flex items-center gap-1"><Activity className="w-3 h-3" /> Connecting</Badge>;
    }
    return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Initializing</Badge>;
  };

  const formatTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: id });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Bot Dashboard</h1>
            <p className="text-gray-600">Kelola dan pantau aktivitas bot WhatsApp Anda</p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Alert */}
        {alert && (
          <Alert className={alert.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
            <AlertDescription className={alert.type === 'error' ? 'text-red-700' : 'text-green-700'}>
              {alert.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status Bot</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {botStatus.isReady ? 'Aktif' : 'Tidak Aktif'}
              </div>
              <p className="text-xs text-muted-foreground">
                {botStatus.isReady ? 'Bot siap menerima pesan' : 'Bot sedang menginisialisasi'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pesan</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{botStatus.messageCount}</div>
              <p className="text-xs text-muted-foreground">
                Pesan yang diproses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktivitas Terakhir</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {botStatus.lastActivity ? formatTime(botStatus.lastActivity) : 'Belum ada'}
              </div>
              <p className="text-xs text-muted-foreground">
                Pesan terakhir diterima
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Koneksi</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isConnected ? 'Terhubung' : 'Terputus'}
              </div>
              <p className="text-xs text-muted-foreground">
                Status koneksi server
              </p>
            </CardContent>
          </Card>
        </div>

        {/* QR Code */}
        {botStatus.qrCodeDataURL && !botStatus.isReady && (
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5" />
                QR Code WhatsApp
              </CardTitle>
              <CardDescription>Scan QR code ini dengan WhatsApp untuk menghubungkan bot</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <img 
                    src={botStatus.qrCodeDataURL} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64 object-contain"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-blue-700 font-medium">
                    📱 Buka WhatsApp → Titik tiga → Perangkat Tertaut → Tautkan Perangkat
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Scan QR code di atas untuk menghubungkan bot
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Send Message */}
        <Card>
          <CardHeader>
            <CardTitle>Kirim Pesan</CardTitle>
            <CardDescription>Kirim pesan langsung melalui bot WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nomor Telepon</label>
                <Input
                  placeholder="628123456789"
                  value={newMessage.to}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={sendMessage} 
                  disabled={sendingMessage || !botStatus.isReady}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendingMessage ? 'Mengirim...' : 'Kirim Pesan'}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Pesan</label>
              <Textarea
                placeholder="Tulis pesan Anda di sini..."
                value={newMessage.message}
                onChange={(e) => setNewMessage(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Message Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Log Pesan</CardTitle>
            <CardDescription>Riwayat pesan yang diterima dan dikirim oleh bot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Dari</TableHead>
                    <TableHead>Chat</TableHead>
                    <TableHead>Pesan</TableHead>
                    <TableHead>Tipe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Belum ada pesan
                      </TableCell>
                    </TableRow>
                  ) : (
                    messages.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell className="font-mono text-sm">
                          {formatTime(message.timestamp)}
                        </TableCell>
                        <TableCell>{message.from}</TableCell>
                        <TableCell>{message.chatName}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {message.message}
                        </TableCell>
                        <TableCell>
                          <Badge variant={message.type === 'received' ? 'secondary' : 'default'}>
                            {message.type === 'received' ? 'Diterima' : 'Dikirim'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
