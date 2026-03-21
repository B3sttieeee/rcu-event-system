const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 DISCORD OAUTH
const CLIENT_ID = '1484904976563044444';
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://rcu-event-system-production.up.railway.app/callback';

// 👉 TWÓJ DISCORD ID (TYLKO TY MASZ DOSTĘP)
const OWNER_ID = 'TWOJE_DISCORD_ID';

const FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'rcu_secret',
    resave: false,
    saveUninitialized: false
}));

// 🔐 LOGIN
app.get('/login', (req, res) => {
    const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify`;
    res.redirect(url);
});

// 🔐 CALLBACK
app.get('/callback', async (req, res) => {

    const code = req.query.code;

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);

    const token = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: params
    }).then(res => res.json());

    const user = await fetch('https://discord.com/api/users/@me', {
        headers: { authorization: `Bearer ${token.access_token}` }
    }).then(res => res.json());

    if (user.id !== OWNER_ID) {
        return res.send("❌ brak dostępu");
    }

    req.session.user = user;
    res.redirect('/');
});

// 🔐 MIDDLEWARE
function auth(req, res, next) {
    if (!req.session.user) return res.redirect('/login');
    next();
}

// 📥 DATA
app.get('/api/data', auth, (req, res) => {
    if (!fs.existsSync(FILE)) return res.json({ events: {} });
    res.json(JSON.parse(fs.readFileSync(FILE)));
});

// 💾 SAVE
app.post('/api/save/:type', auth, (req, res) => {

    let data = {};
    if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));

    if (!data.events) data.events = {};

    data.events[req.params.type] = req.body;

    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

    res.json({ ok: true });
});

// 🌐 PANEL
app.get('/', auth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🚀 START
app.listen(PORT, () => console.log("🔥 Dashboard działa"));
