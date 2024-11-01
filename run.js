const WebSocket = require('ws');
const { promisify } = require('util');
const fs = require('fs');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');

const readFileAsync = promisify(fs.readFile);

// Fungsi utama untuk memulai koneksi semua akun
async function main() {
  // Baca data akun dan proxy dari config.json dan proxy.json
  const accounts = await loadAccounts();
  const proxies = await loadProxies();

  // Loop melalui setiap akun dan hubungkan ke WebSocket
  for (const account of accounts) {
    const userId = await getUserId(account.email, account.password);
    if (userId) {
      const proxy = proxies[account.email] || null;
      await connectWebSocket(userId, proxy);
    } else {
      console.error(`Gagal mendapatkan userId untuk ${account.email}`);
    }
  }
}

// Memuat data akun dari config.json
async function loadAccounts() {
  try {
    const data = await readFileAsync('./config.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Gagal membaca config.json:", error);
    return [];
  }
}

// Memuat data proxy dari proxy.json
async function loadProxies() {
  try {
    const data = await readFileAsync('./proxy.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Gagal membaca proxy.json:", error);
    return {};
  }
}

// Fungsi untuk mendapatkan userId melalui email dan password
async function getUserId(email, password) {
  const loginUrl = "https://ikknngrgxuxgjhplbpey.supabase.co/auth/v1/token?grant_type=password";
  const authorization = "Bearer <YOUR_TOKEN>";
  const apikey = "<YOUR_API_KEY>";

  try {
    const response = await axios.post(loginUrl, { email, password }, {
      headers: { authorization, apikey, "Content-Type": "application/json" }
    });

    if (response.data && response.data.user) {
      console.log(`User ID untuk ${email}: ${response.data.user.id}`);
      return response.data.user.id;
    } else {
      console.error("Pengguna tidak ditemukan.");
      return null;
    }
  } catch (error) {
    console.error("Error saat login:", error.response ? error.response.data : error.message);
    return null;
  }
}

// Fungsi untuk menghubungkan WebSocket dengan atau tanpa proxy
async function connectWebSocket(userId, proxyUrl) {
  const version = "v0.2";
  const url = "wss://secure.ws.teneo.pro";
  const wsUrl = `${url}/websocket?userId=${encodeURIComponent(userId)}&version=${encodeURIComponent(version)}`;

  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;
  const socket = new WebSocket(wsUrl, { agent });

  // Event WebSocket
  socket.onopen = () => {
    console.log(`WebSocket terhubung untuk User ID ${userId}`);
    // Logika tambahan bisa ditambahkan di sini
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(`Pesan diterima untuk User ID ${userId}:`, data);
  };

  socket.onclose = () => {
    console.log(`WebSocket terputus untuk User ID ${userId}`);
  };

  socket.onerror = (error) => {
    console.error(`Kesalahan WebSocket untuk User ID ${userId}:`, error);
  };
}

main().catch(console.error);
