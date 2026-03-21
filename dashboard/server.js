const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 📥 GET DATA
app.get('/api/data', (req, res) => {
    if (!fs.existsSync(FILE)) return res.json({ events: {} });

    const data = JSON.parse(fs.readFileSync(FILE));
    res.json(data);
});

// 💾 SAVE EVENT
app.post('/api/save/:type', (req, res) => {

    let data = {};
    if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));

    if (!data.events) data.events = {};

    data.events[req.params.type] = req.body;

    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

    res.json({ ok: true });
});

// 🟢 START
app.listen(PORT, () => {
    console.log("Dashboard działa na porcie " + PORT);
});
