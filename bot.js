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

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= CONFIG =================

let CHANNEL_ID = "1484937784283369502";

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

function getNowPL() {
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

// ================= NEXT EVENT =================

function getNextEvent() {
  const now = getNowPL();
  const hour = now.getHours();
  const nextHour = (hour + 1) % 24;

  const nextDate = new Date(now);
  nextDate.setHours(nextHour, 0, 0, 0);

  if (nextHour <= hour) nextDate.setDate(nextDate.getDate() + 1);

  return {
    type: getEventByHour(nextHour),
    timestamp: Math.floor(nextDate.getTime() / 1000)
  };
}

// ================= PANEL EMBED =================

function panelEmbed() {
  const now = getNowPL();
  const current = getEventByHour(now.getHours());
  const next = getNextEvent();

  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎮 PANEL EVENTÓW")
    .setDescription(
`🟢 **Aktualny Event:** \`${current.toUpperCase()}\`

🔜 **Następny Event:** \`${next.type.toUpperCase()}\`
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
        .setCustomId("current")
        .setLabel("🟢 Aktualny")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("🔜 Następny")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("refresh")
        .setLabel("🔄 Odśwież")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("roles")
        .setPlaceholder("🎭 Role eventów")
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
        .addOptions([
          { label: "EGG", value: "egg" },
          { label: "MERCHANT", value: "merchant" },
          { label: "SPIN", value: "spin" }
        ])
    )
  ];
}

// ================= COMMAND =================

const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Wyślij panel eventów")
    .addChannelOption(opt =>
      opt.setName("kanał")
        .setDescription("Wybierz kanał")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

// ================= INTERACTIONS =================

client.on("interactionCreate", async (i) => {

  // ===== KOMENDA =====
  if (i.isChatInputCommand()) {
    if (i.commandName === "panel") {

      const channel = i.options.getChannel("kanał");

      await channel.send({
        embeds: [panelEmbed()],
        components: getPanel()
      });

      return i.reply({
        content: "✅ Panel wysłany!",
        ephemeral: true
      });
    }
  }

  // ===== BUTTON =====
  if (i.isButton()) {

    if (i.customId === "refresh") {
      return i.update({
        embeds: [panelEmbed()],
        components: getPanel()
      });
    }

    if (i.customId === "current") {
      const now = getNowPL();
      const current = getEventByHour(now.getHours());

      return i.reply({
        content: `🟢 Aktualny Event: **${current.toUpperCase()}**`,
        ephemeral: true
      });
    }

    if (i.customId === "next") {
      const next = getNextEvent();

      return i.reply({
        content: `🔜 Następny Event: **${next.type.toUpperCase()}**\n<t:${next.timestamp}:R>`,
        ephemeral: true
      });
    }
  }

  // ===== SELECT =====
  if (i.isStringSelectMenu()) {

    if (i.customId === "roles") {
      const member = await i.guild.members.fetch(i.user.id);

      for (const role of i.values) {
        if (member.roles.cache.has(role)) {
          await member.roles.remove(role);
        } else {
          await member.roles.add(role);
        }
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
  console.log("🔥 BOT 100% GOTOWY");
  await registerCommands();
});

client.login(TOKEN);
