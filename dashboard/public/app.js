function load(){

fetch('/api/config')
.then(r=>r.json())
.then(d=>{

document.getElementById("r1").value=d.roles.jajko||"";
document.getElementById("r2").value=d.roles.merchant||"";
document.getElementById("r3").value=d.roles.spin||"";

document.getElementById("e1").value=d.embeds.egg;
document.getElementById("e2").value=d.embeds.boss;
document.getElementById("e3").value=d.embeds.honey;
document.getElementById("e4").value=d.embeds.spin;

});
}

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
}).then(()=>alert("Zapisano"));
}

load();
