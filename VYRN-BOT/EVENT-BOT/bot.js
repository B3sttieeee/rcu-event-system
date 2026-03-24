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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const CHANNEL_ID = "1484937784283369502";

// ================= EVENT DATA =================
const EVENT_DATA = {
  egg: {
    name: "RNG EGG",
    color: "#ff8800",
    image: "https://imgur.com/yTE8jim.png"
  },
  merchant: {
    name: "BOSS / HONEY MERCHANT",
    color: "#ff3300",
    image: "https://imgur.com/ft4q1bC.png"
  },
  spin: {
    name: "DEV SPIN",
    color: "#ff0000",
    image: "https://imgur.com/blg4iD8.png"
  }
};

const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

const DB_PATH = "./data.json";

// ================= DB =================
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      dm: {},
      panelMessageId: null,
      lastPingId: null
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

  return `${m}m ${s}s`;
}

// ================= EMBEDS =================
function panelEmbed() {
  const current = getCurrentEvent();
  const next = getNextEvent();

  const currentData = EVENT_DATA[current];
  const nextData = EVENT_DATA[next.type];

  return new EmbedBuilder()
    .setColor(currentData.color)
    .setTitle("✨ Event Panel")
    .setDescription("Live event tracking")

    .setImage(currentData.image)

    .addFields(
      { name: "🟢 Current", value: `**${currentData.name}**`, inline: true },
      { name: "⏭️ Next", value: `**${nextData.name}**`, inline: true },
      { name: "⏳ Starts In", value: `${getCountdown(next.timestamp)}` }
    )

    .setFooter({ text: "By B3sttiee • Auto 10s" })
    .setTimestamp();
}

function eventEmbed(type, status) {
  const data = EVENT_DATA[type];

  return new EmbedBuilder()
    .setColor(data.color)
    .setTitle(status === "start" ? "🚀 EVENT STARTED" : "⏳ EVENT SOON")
    .setDescription(
      status === "start"
        ? `🔥 **${data.name}** STARTED!`
        : `⚠️ **${data.name}** starts in 5 minutes!`
    )
    .setImage(data.image)
    .setTimestamp();
}

// ================= PANEL =================
function getPanel() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("refresh").setLabel("🔄 Refresh").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("pick_roles").setLabel("🎭 Roles").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("pick_dm").setLabel("📩 Notifications").setStyle(ButtonStyle.Secondary)
    )
  ];
}

// ================= MENUS =================
function rolesMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("roles_menu")
      .setPlaceholder("Select roles")
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
      .setPlaceholder("Select DM notifications")
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
    } catch {
      panelMessage = null;
    }
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
let lastNotify = "";

async function deleteOldPing(channel, db) {
  if (db.lastPingId) {
    try {
      const msg = await channel.messages.fetch(db.lastPingId);
      await msg.delete();
    } catch {}
    db.lastPingId = null;
    saveDB(db);
  }
}

async function sendPing(channel, type, status, db) {
  await deleteOldPing(channel, db);

  const msg = await channel.send({
    content: `<@&${ROLES[type]}>`,
    embeds: [eventEmbed(type, status)]
  });

  db.lastPingId = msg.id;
  saveDB(db);
}

// ================= NOTIFICATIONS =================
setInterval(async () => {
  const now = getNowPL();
  const min = now.getMinutes();
  const hour = now.getHours();

  const channel = await client.channels.fetch(CHANNEL_ID);
  const db = loadDB();

  const current = getCurrentEvent();
  const next = getNextEvent();

  // 5 MIN BEFORE
  if (min === 55 && lastNotify !== `${hour}-5`) {
    lastNotify = `${hour}-5`;

    await sendPing(channel, next.type, "soon", db);

    for (const userId in db.dm) {
      if (db.dm[userId].includes(next.type)) {
        try {
          const user = await client.users.fetch(userId);
          await user.send({
            content: `<@${userId}>`,
            embeds: [eventEmbed(next.type, "soon")]
          });
        } catch {}
      }
    }
  }

  // START
  if (min === 0 && lastNotify !== `${hour}-start`) {
    lastNotify = `${hour}-start`;

    await sendPing(channel, current, "start", db);

    for (const userId in db.dm) {
      if (db.dm[userId].includes(current)) {
        try {
          const user = await client.users.fetch(userId);
          await user.send({
            content: `<@${userId}>`,
            embeds: [eventEmbed(current, "start")]
          });
        } catch {}
      }
    }

    // delete after 15 min
    setTimeout(async () => {
      await deleteOldPing(channel, loadDB());
    }, 15 * 60 * 1000);
  }

}, 10000);

// ================= INTERACTIONS =================
client.on("interactionCreate", async (i) => {

  if (i.isButton()) {

    if (i.customId === "refresh") {
      return i.update({ embeds: [panelEmbed()], components: getPanel() });
    }

    if (i.customId === "pick_roles") {
      return i.reply({ content: "🎭 Select roles:", components: [rolesMenu()], ephemeral: true });
    }

    if (i.customId === "pick_dm") {
      return i.reply({ content: "📩 Select notifications:", components: [dmMenu()], ephemeral: true });
    }
  }

  if (i.isStringSelectMenu()) {

    const db = loadDB();

    if (i.customId === "roles_menu") {
      const member = await i.guild.members.fetch(i.user.id);

      for (const key in ROLES) {
        await member.roles.remove(ROLES[key]).catch(() => {});
      }

      for (const val of i.values) {
        await member.roles.add(ROLES[val]).catch(() => {});
      }

      return i.reply({ content: "✅ Roles updated", ephemeral: true });
    }

    if (i.customId === "dm_menu") {
      db.dm[i.user.id] = i.values;
      saveDB(db);

      return i.reply({ content: "✅ DM settings saved", ephemeral: true });
    }
  }
});

// ================= READY =================
client.once("clientReady", async () => {
  console.log("🔥 FINAL BOSS BOT READY");
  await startPanel();
});

client.login(TOKEN);
