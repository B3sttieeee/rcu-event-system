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
  SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");

// ================= ENV =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= CONFIG =================

const CHANNEL_ID = "1484937784283369502";

const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

// ================= DB =================

const DB_PATH = "./data.json";

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ================= TIME =================

function getTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
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

// ================= COUNTDOWN =================

function getNextEventData() {
  const now = getTime();
  const currentHour = now.getHours();

  let nextHour = (currentHour + 1) % 24;

  const nextDate = new Date(now);
  nextDate.setHours(nextHour, 0, 0, 0);

  if (nextHour <= currentHour) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  const diff = nextDate - now;

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return {
    type: getEventByHour(nextHour),
    minutes,
    seconds,
    timestamp: Math.floor(nextDate.getTime() / 1000)
  };
}

// ================= ROLE =================

function getRole(type) {
  if (type === "egg") return `<@&${ROLE_EGG}>`;
  if (type === "merchant") return `<@&${ROLE_MERCHANT}>`;
  return `<@&${ROLE_SPIN}>`;
}

// ================= EMBED =================

function buildPanelEmbed() {
  const now = getTime();
  const current = getEventByHour(now.getHours());
  const next = getNextEventData();

  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎮 PANEL EVENTÓW")
    .setDescription(
`🟢 **Aktualny Event:** ${current.toUpperCase()}

🔜 **Następny Event:** ${next.type.toUpperCase()}
⏱️ **Start za:** ${next.minutes}m ${next.seconds}s

📅 <t:${next.timestamp}:F>`
    )
    .setFooter({ text: "Twórca: B3sttiee" })
    .setTimestamp();
}

// ================= PANEL =================

function getPanel() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("refresh")
        .setLabel("🔄 Odśwież")
        .setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("roles")
        .setPlaceholder("🎭 Wybierz role")
        .setMinValues(1)
        .setMaxValues(3)
        .addOptions([
          { label: "RNG EGG", value: ROLE_EGG },
          { label: "MERCHANT", value: ROLE_MERCHANT },
          { label: "SPIN", value: ROLE_SPIN }
        ])
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("dm")
        .setPlaceholder("📩 Powiadomienia DM")
        .setMinValues(1)
        .setMaxValues(3)
        .addOptions([
          { label: "EGG", value: "egg" },
          { label: "MERCHANT", value: "merchant" },
          { label: "SPIN", value: "spin" }
        ])
    )
  ];
}

// ================= DM =================

async function sendDM(type) {
  const db = loadDB();

  for (const id in db.dm) {
    if (!db.dm[id].includes(type)) continue;

    try {
      const user = await client.users.fetch(id);
      await user.send(`🔔 EVENT ${type.toUpperCase()} WYSTARTOWAŁ!`);
    } catch {}
  }
}

// ================= EVENT =================

let lastHour = null;

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const now = getTime();
  const hour = now.getHours();

  if (lastHour === hour) return;
  lastHour = hour;

  const type = getEventByHour(hour);

  await channel.send(`${getRole(type)} 🚀 **EVENT WYSTARTOWAŁ!**`);

  await sendDM(type);
}

// ================= LOOP =================

setInterval(() => {
  const now = getTime();

  if (now.getMinutes() === 0) sendEvent();

}, 1000);

// ================= COMMAND =================

const commands = [
  new SlashCommandBuilder().setName("panel").setDescription("Panel eventów")
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

// ================= INTERACTIONS =================

let panelMessage = null;

client.on("interactionCreate", async (i) => {

  if (i.isChatInputCommand()) {
    if (i.commandName === "panel") {

      const msg = await i.reply({
        embeds: [buildPanelEmbed()],
        components: getPanel(),
        fetchReply: true
      });

      panelMessage = msg;
    }
  }

  if (i.isButton()) {
    if (i.customId === "refresh") {
      return i.update({
        embeds: [buildPanelEmbed()],
        components: getPanel()
      });
    }
  }

  if (i.isStringSelectMenu()) {

    // ROLE
    if (i.customId === "roles") {
      const member = await i.guild.members.fetch(i.user.id);

      for (const role of i.values) {
        if (member.roles.cache.has(role)) {
          await member.roles.remove(role);
        } else {
          await member.roles.add(role);
        }
      }

      return i.reply({ content: "✅ Zaktualizowano role", ephemeral: true });
    }

    // DM
    if (i.customId === "dm") {

      const db = loadDB();
      db.dm[i.user.id] = i.values;

      saveDB(db);

      return i.reply({ content: "📩 Zapisano ustawienia DM", ephemeral: true });
    }
  }
});

// ================= AUTO PANEL UPDATE =================

setInterval(async () => {
  if (!panelMessage) return;

  try {
    await panelMessage.edit({
      embeds: [buildPanelEmbed()],
      components: getPanel()
    });
  } catch {}
}, 10000);

// ================= READY =================

client.once("clientReady", async () => {
  console.log("🔥 GOD MODE BOT ONLINE");
  await registerCommands();
});

client.login(TOKEN);
