const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1484937784283369502";

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= CONFIG =================
const PANEL_IMAGE = "https://imgur.com/sOU3JWV.png";

const EVENT_DATA = {
  egg: {
    name: "RNG EGG",
    color: "#ff8800",
    image: "https://imgur.com/yTE8jim.png",
    tip: "Znajdź serwer i zacznij farmić!"
  },
  merchant: {
    name: "BOSS / HONEY MERCHANT",
    color: "#ff3300",
    image: "https://imgur.com/ft4q1bC.png",
    tip: "Przygotuj walutę!"
  },
  spin: {
    name: "DEV SPIN",
    color: "#ff0000",
    image: "https://imgur.com/blg4iD8.png",
    tip: "Spróbuj szczęścia!"
  }
};

const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

// ROTACJA 24H
const ROTATION = [
  "egg","merchant","spin","egg","merchant","spin",
  "egg","merchant","spin","egg","merchant","spin",
  "egg","merchant","spin","egg","merchant","spin",
  "egg","merchant","spin","egg","merchant","spin"
];

// ================= DB =================
const DB_PATH = "./data.json";

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      dm: {},
      panelMessageId: null,
      beforePingId: null,
      startPingId: null
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ================= TIME =================
function getNowPL() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
}

// ================= EVENT SYSTEM =================
function getCurrentEvent() {
  return ROTATION[getNowPL().getHours()];
}

function getNextEvent() {
  const now = getNowPL();

  const nextHour = (now.getHours() + 1) % 24;

  const date = new Date(now);
  date.setHours(nextHour, 0, 0, 0);

  if (nextHour === 0) {
    date.setDate(date.getDate() + 1);
  }

  return {
    type: ROTATION[nextHour],
    timestamp: Math.floor(date.getTime() / 1000)
  };
}

function getRemainingSeconds(ts) {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, ts - now);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

// ================= EMBED PANEL =================
function panelEmbed() {
  const current = getCurrentEvent();
  const next = getNextEvent();

  const seconds = getRemainingSeconds(next.timestamp);

  const currentData = EVENT_DATA[current];
  const nextData = EVENT_DATA[next.type];

  return new EmbedBuilder()
    .setColor(currentData.color)
    .setTitle("✨ Event Panel")
    .setDescription(
`🎮 **Live Event Tracking**

━━━━━━━━━━━━━━━━━━

🟢 **CURRENT**
> **${currentData.name}**

⏭️ **NEXT**
> **${nextData.name}**
> ⏳ \`${formatTime(seconds)}\`

━━━━━━━━━━━━━━━━━━`
    )
    .setImage(PANEL_IMAGE)
    .setFooter({ text: "By B3sttiee • refresh 10s" })
    .setTimestamp();
}

// ================= PANEL =================
function getPanel() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("roles").setLabel("🎭 Roles").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("dm").setLabel("📩 DM").setStyle(ButtonStyle.Secondary)
    )
  ];
}

// ================= MENUS =================
function rolesMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("roles_menu")
      .setPlaceholder("Pick roles")
      .setMinValues(0)
      .setMaxValues(3)
      .addOptions([
        { label: "RNG EGG", value: "egg" },
        { label: "MERCHANT", value: "merchant" },
        { label: "DEV SPIN", value: "spin" }
      ])
  );
}

function dmMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dm_menu")
      .setPlaceholder("DM notifications")
      .setMinValues(0)
      .setMaxValues(3)
      .addOptions([
        { label: "RNG EGG", value: "egg" },
        { label: "MERCHANT", value: "merchant" },
        { label: "DEV SPIN", value: "spin" }
      ])
  );
}

// ================= PANEL SYSTEM =================
let panelMessage;

async function startPanel() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const db = loadDB();

  if (db.panelMessageId) {
    try {
      panelMessage = await channel.messages.fetch(db.panelMessageId);
    } catch {}
  }

  if (!panelMessage) {
    panelMessage = await channel.send({
      embeds: [panelEmbed()],
      components: getPanel()
    });

    db.panelMessageId = panelMessage.id;
    saveDB(db);
  }

  setInterval(async () => {
    try {
      await panelMessage.edit({
        embeds: [panelEmbed()],
        components: getPanel()
      });
    } catch {}
  }, 10000);
}

// ================= PING SYSTEM =================
let lastPing = "";

async function deleteMsg(channel, id) {
  if (!id) return;
  try {
    const msg = await channel.messages.fetch(id);
    await msg.delete();
  } catch {}
}

setInterval(async () => {

  const now = getNowPL();
  const min = now.getMinutes();
  const hour = now.getHours();

  const channel = await client.channels.fetch(CHANNEL_ID);
  const db = loadDB();

  const current = getCurrentEvent();
  const next = getNextEvent();

  // 5 min before
  if (min === 55 && lastPing !== `${hour}-before`) {
    lastPing = `${hour}-before`;

    const msg = await channel.send({
      content: `<@&${ROLES[next.type]}> ⚠️ Event za 5 minut!`
    });

    db.beforePingId = msg.id;
    saveDB(db);
  }

  // start
  if (min === 0 && lastPing !== `${hour}-start`) {
    lastPing = `${hour}-start`;

    await deleteMsg(channel, db.beforePingId);

    const data = EVENT_DATA[current];

    const msg = await channel.send({
      content: `<@&${ROLES[current]}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(data.color)
          .setTitle("🚀 EVENT START")
          .setDescription(`**${data.name}** wystartował!\n${data.tip}`)
          .setImage(data.image)
      ]
    });

    db.startPingId = msg.id;
    saveDB(db);

    setTimeout(async () => {
      const fresh = loadDB();
      await deleteMsg(channel, fresh.startPingId);
      fresh.startPingId = null;
      saveDB(fresh);
    }, 15 * 60 * 1000);
  }

}, 10000);

// ================= INTERACTIONS =================
client.on("interactionCreate", async (i) => {

  if (i.isButton()) {

    if (i.customId === "roles") {
      return i.reply({ content: "🎭 Roles:", components: [rolesMenu()], ephemeral: true });
    }

    if (i.customId === "dm") {
      return i.reply({ content: "📩 DM:", components: [dmMenu()], ephemeral: true });
    }
  }

  if (i.isStringSelectMenu()) {

    const db = loadDB();

    if (i.customId === "roles_menu") {
      const member = await i.guild.members.fetch(i.user.id);

      for (const key in ROLES) {
        await member.roles.remove(ROLES[key]).catch(()=>{});
      }

      for (const val of i.values) {
        await member.roles.add(ROLES[val]).catch(()=>{});
      }

      return i.reply({ content: "✅ Roles updated", ephemeral: true });
    }

    if (i.customId === "dm_menu") {
      db.dm[i.user.id] = i.values;
      saveDB(db);

      return i.reply({ content: "✅ DM saved", ephemeral: true });
    }
  }
});

// ================= READY =================
client.once("clientReady", async () => {
  console.log("🔥 BOT FINAL WORKING");
  await startPanel();
});

client.login(TOKEN);
