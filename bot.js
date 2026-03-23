const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
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

// ================= ROLE =================

function getRole(type) {
  if (type === "egg") return `<@&${ROLE_EGG}>`;
  if (type === "merchant") return `<@&${ROLE_MERCHANT}>`;
  return `<@&${ROLE_SPIN}>`;
}

// ================= EMBED BUILDER =================

function baseFooter(embed) {
  return embed
    .setFooter({ text: "Twórca: B3sttiee" })
    .setTimestamp();
}

// ===== MAIN EVENT EMBEDS =====

function getEventEmbed(type) {

  if (type === "egg") {
    return new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("🥚 RNG EGG EVENT")
      .setDescription(
`**➤ Otwieraj jajka i zdobywaj punkty!**

► Im lepsze pety zdobędziesz, tym więcej punktów  
► Więcej punktów = wyższy tier  
► Wyższy tier = lepsze nagrody na koniec  

✨ Graj aktywnie i zgarnij najlepsze bonusy!`
      )
      .setThumbnail("https://imgur.com/JqyeITl.png");
  }

  if (type === "merchant") {
    return [
      new EmbedBuilder()
        .setColor("#f39c12")
        .setTitle("🍯 HONEY MERCHANT")
        .setDescription(
`**➤ Zdobywaj miód i kupuj itemy!**

► 🌍 Bee World  
► 🛒 Specjalne oferty  
► 💎 Szansa na Supreme (110%)`
        )
        .setThumbnail("https://imgur.com/zhLC0zn.png"),

      new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("💀 BOSS MERCHANT")
        .setDescription(
`**➤ Zdobywaj Tokeny Bossa i kupuj nagrody!**

► ⚔️ Tokeny z bossów  
► 🛒 Sklep eventowy  
► 💎 Szansa na Supreme (125%)`
        )
        .setThumbnail("https://imgur.com/yFvb6jY.png")
    ];
  }

  if (type === "spin") {
    return new EmbedBuilder()
      .setColor("#9b59b6")
      .setTitle("🎡 DEV SPIN EVENT")
      .setDescription(
`**➤ Zakręć kołem i wygraj nagrody!**

► 🎁 Losowe nagrody  
► 💎 Rzadkie dropy  
► ✨ Szansa na Supreme  

🎯 Spróbuj swojego szczęścia!`
      )
      .setThumbnail("https://imgur.com/NJI7052.png");
  }
}

// ===== REMINDER EMBED =====

function reminderEmbed(type) {
  return baseFooter(
    new EmbedBuilder()
      .setColor("#e67e22")
      .setTitle("⏳ EVENT ZA 5 MINUT!")
      .setDescription(`Przygotuj się na **${type.toUpperCase()}**! 🔥`)
  );
}

// ================= DM =================

async function sendDM(type, embed) {
  const db = loadDB();

  for (const id in db.dm) {
    if (!db.dm[id].includes(type)) continue;

    try {
      const user = await client.users.fetch(id);
      await user.send({ embeds: [embed] });
    } catch {}
  }
}

// ================= EVENT =================

let lastHour = null;
let lastReminder = null;

async function sendEvent() {
  const now = getNowPL();
  const hour = now.getHours();

  if (lastHour === hour) return;
  lastHour = hour;

  const channel = await client.channels.fetch(CHANNEL_ID);
  const type = getEventByHour(hour);

  await channel.send(`${getRole(type)} 🚀 **EVENT WYSTARTOWAŁ!**`);

  const embed = getEventEmbed(type);

  if (Array.isArray(embed)) {
    for (const e of embed) {
      await channel.send({ embeds: [baseFooter(e)] });
    }
  } else {
    await channel.send({ embeds: [baseFooter(embed)] });
  }

  await sendDM(type, baseFooter(getEventEmbed(type)));
}

// ================= REMINDER =================

async function reminder() {
  const now = getNowPL();
  const hour = now.getHours();

  if (now.getMinutes() === 55 && lastReminder !== hour) {
    lastReminder = hour;

    const nextType = getEventByHour((hour + 1) % 24);
    const channel = await client.channels.fetch(CHANNEL_ID);

    const embed = reminderEmbed(nextType);

    await channel.send({
      content: `${getRole(nextType)}`,
      embeds: [embed]
    });

    await sendDM(nextType, embed);
  }
}

// ================= LOOP =================

setInterval(() => {
  const now = getNowPL();

  if (now.getMinutes() === 0) sendEvent();

  reminder();

}, 1000);

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
        .setPlaceholder("🎭 Role eventów")
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

// ================= COMMAND =================

const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Wyślij panel eventów")
    .addChannelOption(opt =>
      opt.setName("kanał")
        .setDescription("Gdzie wysłać panel")
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

  if (i.isChatInputCommand()) {
    if (i.commandName === "panel") {

      const channel = i.options.getChannel("kanał");

      await channel.send({
        content: "🎮 **PANEL EVENTÓW**",
        components: getPanel()
      });

      return i.reply({ content: "✅ Panel wysłany", ephemeral: true });
    }
  }

  if (i.isButton()) {
    if (i.customId === "refresh") {
      return i.reply({ content: "🔄 Odświeżono", ephemeral: true });
    }
  }

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
  console.log("🔥 BOT ONLINE ULTRA");
  await registerCommands();
});

client.login(TOKEN);
