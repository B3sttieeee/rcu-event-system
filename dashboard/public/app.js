function format(h){
return h.toString().padStart(2,'0')+":00";
}

// 🔄 LOAD EVENTS
function load(){

fetch('/api/events')
.then(r=>r.json())
.then(d=>{

document.getElementById("events").innerHTML = `

<div class="card green">
<h2>${d.now.event}</h2>
<p>${d.now.status}</p>
<p>${format(d.now.hour)}</p>
</div>

<div class="card yellow">
<h2>${d.next.event}</h2>
<p>${d.next.status}</p>
<p>${format(d.next.hour)}</p>
</div>

<div class="card red">
<h2>${d.later.event}</h2>
<p>${d.later.status}</p>
<p>${format(d.later.hour)}</p>
</div>

`;
});
}

// 💾 SAVE
function save(){

const data = {
egg: document.getElementById("egg").value,
merchant: document.getElementById("merchant").value,
spin: document.getElementById("spin").value
};

fetch('/api/config',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify(data)
})
.then(()=>alert("Zapisano!"));
}

load();
setInterval(load,5000);
