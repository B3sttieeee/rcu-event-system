// ================= IMPORTS =================
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
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
    timestamp: Math.floor(nextDate.getTime() / 1000),
    date: nextDate
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

// ================= EMBED DESIGN =================
function panelEmbed() {
  const current = getCurrentEvent();
  const next = getNextEvent();

  return new EmbedBuilder()
    .setColor(current === "egg" ? "#00ff99" : current === "merchant" ? "#ffaa00" : "#aa00ff")
    .setTitle("✨ EVENT PANEL")
    .setDescription("Automatyczny system eventów")
    .addFields(
      {
        name: "🟢 Aktualny Event",
        value: `\`${current.toUpperCase()}\``,
        inline: true
      },
      {
        name: "🔜 Następny Event",
        value: `\`${next.type.toUpperCase()}\``,
        inline: true
      },
      {
        name: "⏳ Start za",
        value: getCountdown(next.timestamp),
        inline: false
      }
    )
    .setFooter({ text: "Auto refresh co 10s • PRO SYSTEM" })
    .setTimestamp();
}

// ================= PANEL =================
function getPanel() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("refresh").setLabel("🔄 Odśwież").setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("roles")
        .setPlaceholder("🎭 Role eventów")
        .addOptions([
          { label: "EGG", value: ROLES.egg },
          { label: "MERCHANT", value: ROLES.merchant },
          { label: "SPIN", value: ROLES.spin }
        ])
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("dm")
        .setPlaceholder("📩 Powiadomienia DM")
        .addOptions([
          { label: "EGG", value: "egg" },
          { label: "MERCHANT", value: "merchant" },
          { label: "SPIN", value: "spin" }
        ])
    )
  ];
}

// ================= AUTO PANEL =================
let panelMessage;

async function startAutoPanel() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  panelMessage = await channel.send({ embeds: [panelEmbed()], components: getPanel() });

  setInterval(async () => {
    if (!panelMessage) return;

    await panelMessage.edit({ embeds: [panelEmbed()], components: getPanel() });
  }, 10000);
}

// ================= NOTIFICATIONS =================
let lastNotify = "";

setInterval(async () => {
  const now = getNowPL();
  const min = now.getMinutes();
  const hour = now.getHours();

  const channel = await client.channels.fetch(CHANNEL_ID);
  const db = loadDB();

  const current = getCurrentEvent();
  const next = getNextEvent();

  // 5 min before
  if (min === 55 && lastNotify !== `${hour}-5`) {
    lastNotify = `${hour}-5`;

    await channel.send(`⏳ <@&${ROLES[next.type]}> Event **${next.type.toUpperCase()}** za 5 minut!`);

    // DM
    for (const userId in db.dm) {
      if (db.dm[userId].includes(next.type)) {
        const user = await client.users.fetch(userId);
        user.send(`⏳ Event ${next.type.toUpperCase()} za 5 minut!`);
      }
    }
  }

  // START
  if (min === 0 && lastNotify !== `${hour}-start`) {
    lastNotify = `${hour}-start`;

    await channel.send(`🚀 <@&${ROLES[current]}> Event **${current.toUpperCase()}** START!`);

    // DM
    for (const userId in db.dm) {
      if (db.dm[userId].includes(current)) {
        const user = await client.users.fetch(userId);
        user.send(`🚀 Event ${current.toUpperCase()} właśnie wystartował!`);
      }
    }
  }

}, 10000);

// ================= COMMAND =================
const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Wyślij panel")
    .addChannelOption(opt =>
      opt.setName("kanał")
        .setDescription("Kanał")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
}

// ================= INTERACTIONS =================
client.on("interactionCreate", async (i) => {

  if (i.isChatInputCommand()) {
    const channel = i.options.getChannel("kanał");

    await channel.send({ embeds: [panelEmbed()], components: getPanel() });
    return i.reply({ content: "✅ Panel wysłany", ephemeral: true });
  }

  if (i.isButton() && i.customId === "refresh") {
    return i.update({ embeds: [panelEmbed()], components: getPanel() });
  }

  if (i.isStringSelectMenu()) {

    if (i.customId === "roles") {
      const member = await i.guild.members.fetch(i.user.id);

      for (const role of i.values) {
        if (member.roles.cache.has(role)) await member.roles.remove(role);
        else await member.roles.add(role);
      }

      return i.reply({ content: "✅ Role zaktualizowane", ephemeral: true });
    }

    if (i.customId === "dm") {
      const db = loadDB();
      db.dm[i.user.id] = i.values;
      saveDB(db);

      return i.reply({ content: "📩 DM zapisane", ephemeral: true });
    }
  }
});

// ================= READY =================
client.once("clientReady", async () => {
  console.log("🔥 BOT PRO READY");
  await registerCommands();
  await startAutoPanel();
});

client.login(TOKEN);
