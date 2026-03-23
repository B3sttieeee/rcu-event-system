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

// ================= CURRENT EVENT FIX =================
function getCurrentEvent() {
  const now = getNowPL();
  return getEventByHour(now.getHours());
}

// ================= NEXT EVENT =================
function getNextEvent() {
  const now = getNowPL();
  let nextHour = now.getHours();

  // znajdź następną pełną godzinę eventu
  nextHour = (nextHour + 1) % 24;

  const nextDate = new Date(now);
  nextDate.setHours(nextHour, 0, 0, 0);

  if (nextHour <= now.getHours()) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return {
    type: getEventByHour(nextHour),
    timestamp: Math.floor(nextDate.getTime() / 1000),
    date: nextDate
  };
}

// ================= EMBED =================
function panelEmbed() {
  const current = getCurrentEvent();
  const next = getNextEvent();

  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎮 PANEL EVENTÓW")
    .addFields(
      { name: "🟢 Aktualny", value: `**${current.toUpperCase()}**`, inline: true },
      { name: "🔜 Następny", value: `**${next.type.toUpperCase()}**`, inline: true },
      { name: "📅 Start", value: `<t:${next.timestamp}:F>` }
    )
    .setFooter({ text: "Auto aktualizacja co 60s" })
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
    )
  ];
}

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

// ================= AUTO PANEL REFRESH =================
let panelMessage;

async function startAutoPanel() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  panelMessage = await channel.send({
    embeds: [panelEmbed()],
    components: getPanel()
  });

  setInterval(async () => {
    if (!panelMessage) return;

    await panelMessage.edit({
      embeds: [panelEmbed()],
      components: getPanel()
    });
  }, 60000);
}

// ================= EVENT NOTIFICATIONS =================
let lastNotified = null;

setInterval(async () => {
  const now = getNowPL();
  const minutes = now.getMinutes();
  const hour = now.getHours();

  const channel = await client.channels.fetch(CHANNEL_ID);

  const currentEvent = getEventByHour(hour);
  const nextEvent = getNextEvent();

  // 5 minut przed
  if (minutes === 55 && lastNotified !== `${hour}-5`) {
    lastNotified = `${hour}-5`;

    await channel.send({
      content: `<@&${ROLES[nextEvent.type]}> ⏳ Event **${nextEvent.type.toUpperCase()}** za 5 minut!`
    });
  }

  // start eventu
  if (minutes === 0 && lastNotified !== `${hour}-start`) {
    lastNotified = `${hour}-start`;

    await channel.send({
      content: `🚀 <@&${ROLES[currentEvent]}> Event **${currentEvent.toUpperCase()}** właśnie wystartował!`
    });
  }

}, 30000);

// ================= INTERACTIONS =================
client.on("interactionCreate", async (i) => {

  if (i.isChatInputCommand()) {
    const channel = i.options.getChannel("kanał");

    await channel.send({
      embeds: [panelEmbed()],
      components: getPanel()
    });

    return i.reply({ content: "✅ Panel wysłany", ephemeral: true });
  }

  if (i.isButton() && i.customId === "refresh") {
    return i.update({ embeds: [panelEmbed()], components: getPanel() });
  }

  if (i.isStringSelectMenu() && i.customId === "roles") {
    const member = await i.guild.members.fetch(i.user.id);

    for (const role of i.values) {
      if (member.roles.cache.has(role)) await member.roles.remove(role);
      else await member.roles.add(role);
    }

    return i.reply({ content: "✅ Role zaktualizowane", ephemeral: true });
  }
});

// ================= READY =================
client.once("clientReady", async () => {
  console.log("🔥 BOT GOTOWY");
  await registerCommands();
  await startAutoPanel();
});

client.login(TOKEN);
