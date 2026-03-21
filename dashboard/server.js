const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data.json');

// middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 📥 pobieranie danych
app.get('/api/data', (req, res) => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return res.json({});
        }

        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        res.json(data);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Błąd odczytu danych" });
    }
});

// 💾 zapis danych
app.post('/api/save', (req, res) => {
    try {
        const newData = req.body;

        fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2));

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Błąd zapisu" });
    }
});

// 🌐 strona główna
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🚀 start
app.listen(PORT, () => {
    console.log("🌐 Dashboard działa na porcie " + PORT);
});
