// ================= IMPORTS =================
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType
} = require("discord.js");

const fs = require("fs");

// ================= ENV =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ================= CONFIG =================
const CHANNEL_ID = "1484937784283369502";

const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

// ================= DB =================
const DB_PATH = "./data.json";

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ================= TIME =================
function getNowPL() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
}

// ================= EVENTS =================
const EVENTS = {
  egg: [0,3,6,9,12,15,18,21],
  merchant: [1,4,7,10,13,16,19,22],
  spin: [2,5,8,11,14,17,20,23]
};

function getEventByHour(hour) {
  if (EVENTS.egg.includes(hour)) return "egg";
  if (EVENTS.merchant.includes(hour)) return "merchant";
  return "spin";
}

function getCurrentEvent() {
  return getEventByHour(getNowPL().getHours());
}

function getNextEvent() {
  const now = getNowPL();
  let nextHour = (now.getHours() + 1) % 24;

  const nextDate = new Date(now);
  nextDate.setHours(nextHour, 0, 0, 0);

  if (nextHour <= now.getHours()) nextDate.setDate(nextDate.getDate() + 1);

  return {
    type: getEventByHour(nextHour),
    timestamp: Math.floor(nextDate.getTime() / 1000)
  };
}

// ================= COUNTDOWN =================
function getCountdown(ts) {
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;

  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;

  return `⏳ ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

// ================= EMBED =================
function panelEmbed() {
  const current = getCurrentEvent();
  const next = getNextEvent();

  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("✨ EVENT PANEL")
    .setDescription("Automatyczny system eventów")
    .addFields(
      { name: "🟢 Aktualny", value: `\`${current.toUpperCase()}\``, inline: true },
      { name: "⏭️ Następny", value: `\`${next.type.toUpperCase()}\`\n${getCountdown(next.timestamp)}`, inline: true }
    )
    .setFooter({ text: "By B3sttiee" })
    .setTimestamp();
}

// ================= PANEL BUTTONS =================
function getPanel() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("refresh").setLabel("🔄 Odśwież").setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("role_egg").setLabel("🥚 EGG").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("role_merchant").setLabel("🛒 MERCHANT").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("role_spin").setLabel("🎰 SPIN").setStyle(ButtonStyle.Danger)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("dm_egg").setLabel("📩 EGG DM").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("dm_merchant").setLabel("📩 MERCHANT DM").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("dm_spin").setLabel("📩 SPIN DM").setStyle(ButtonStyle.Danger)
    )
  ];
}

// ================= SINGLE PANEL =================
let panelMessage;

async function startAutoPanel() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const messages = await channel.messages.fetch({ limit: 10 });
  panelMessage = messages.find(m => m.author.id === client.user.id);

  if (!panelMessage) {
    panelMessage = await channel.send({ embeds: [panelEmbed()], components: getPanel() });
  }

  setInterval(async () => {
    try {
      await panelMessage.edit({ embeds: [panelEmbed()], components: getPanel() });
    } catch {}
  }, 1000);
}

// ================= INTERACTIONS =================
client.on("interactionCreate", async (i) => {

  if (i.isButton()) {

    const member = await i.guild.members.fetch(i.user.id);
    const db = loadDB();

    // ROLE SYSTEM
    if (i.customId.startsWith("role_")) {
      const type = i.customId.split("_")[1];
      const role = ROLES[type];

      if (member.roles.cache.has(role)) {
        await member.roles.remove(role);
        return i.reply({ content: `❌ Usunięto rolę ${type}`, ephemeral: true });
      } else {
        await member.roles.add(role);
        return i.reply({ content: `✅ Dodano rolę ${type}`, ephemeral: true });
      }
    }

    // DM SYSTEM
    if (i.customId.startsWith("dm_")) {
      const type = i.customId.split("_")[1];

      if (!db.dm[i.user.id]) db.dm[i.user.id] = [];

      if (db.dm[i.user.id].includes(type)) {
        db.dm[i.user.id] = db.dm[i.user.id].filter(e => e !== type);
        saveDB(db);
        return i.reply({ content: `❌ Wyłączono DM ${type}`, ephemeral: true });
      } else {
        db.dm[i.user.id].push(type);
        saveDB(db);
        return i.reply({ content: `✅ Włączono DM ${type}`, ephemeral: true });
      }
    }

    if (i.customId === "refresh") {
      return i.update({ embeds: [panelEmbed()], components: getPanel() });
    }
  }
});

// ================= READY =================
client.once("clientReady", async () => {
  console.log("🔥 FINAL VERSION READY");
  await startAutoPanel();
});

client.login(TOKEN);
