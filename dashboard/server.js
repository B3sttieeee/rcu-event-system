const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const BOT_URL = "https://rcu-event-system-production.up.railway.app";

// GET DATA
app.get('/api/data', async (req,res)=>{
    const r = await fetch(`${BOT_URL}/api/data`);
    const data = await r.json();
    res.json(data);
});

// SET ROLE
app.post('/api/set-role', async (req,res)=>{
    await fetch(`${BOT_URL}/api/set-role`, {
        method:"POST",
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(req.body)
    });
    res.json({ok:true});
});

app.listen(3000, ()=>console.log("dashboard działa"));
