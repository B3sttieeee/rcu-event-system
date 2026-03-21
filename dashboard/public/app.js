function format(h){
return h.toString().padStart(2,'0')+":00";
}

// 🔄 EVENTY
function loadEvents(){

fetch('/api/events')
.then(r=>r.json())
.then(d=>{

document.getElementById("events").innerHTML = `

<div class="card green">
<h2 class="text-xl font-bold">${d.now.event}</h2>
<p class="opacity-80">${d.now.status}</p>
<p class="mt-2 text-lg">⏰ ${format(d.now.hour)}</p>
</div>

<div class="card yellow">
<h2 class="text-xl font-bold">${d.next.event}</h2>
<p class="opacity-80">${d.next.status}</p>
<p class="mt-2 text-lg">⏰ ${format(d.next.hour)}</p>
</div>

<div class="card red">
<h2 class="text-xl font-bold">${d.later.event}</h2>
<p class="opacity-80">${d.later.status}</p>
<p class="mt-2 text-lg">⏰ ${format(d.later.hour)}</p>
</div>

`;
});
}

// 📊 LOAD CONFIG
function load(){

fetch('/api/config')
.then(r=>r.json())
.then(d=>{

r1.value = d.roles.jajko || "";
r2.value = d.roles.merchant || "";
r3.value = d.roles.spin || "";

e1.value = d.embeds.egg;
e2.value = d.embeds.boss;
e3.value = d.embeds.honey;
e4.value = d.embeds.spin;

});
}

// 💾 SAVE
function save(){

fetch('/api/config',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
roles:{
jajko:r1.value,
merchant:r2.value,
spin:r3.value
},
embeds:{
egg:e1.value,
boss:e2.value,
honey:e3.value,
spin:e4.value
}
})
}).then(()=>{
alert("🔥 zapisano");
});
}

// 🔁 AUTO REFRESH
setInterval(loadEvents,3000);

load();
loadEvents();
