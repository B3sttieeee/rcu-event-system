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

// ================= DATA =================

const DB_PATH = "./data.json";

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ================= CZAS =================

function getTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

// ================= EVENT =================

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

// ================= EMBEDS (PRO DESIGN) =================

function base(embed) {
  return embed
    .setFooter({ text: "Start: 2026-03-22 • Twórca: B3sttiee" })
    .setTimestamp();
}

function getEmbed(type) {

  if (type === "egg") {
    return base(
      new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle("🥚 RNG EGG EVENT")
        .setDescription(
`**🎯 Zbieraj punkty otwierając jajka!**

➤ 🐾 Lepsze pety → więcej punktów  
➤ 📈 Więcej punktów → wyższy tier  
➤ 💎 Wyższy tier → lepsze nagrody  

🔥 **Farm teraz i dominuj ranking!**`
        )
        .setThumbnail("https://imgur.com/JqyeITl.png")
    );
  }

  if (type === "merchant") {
    return [
      base(
        new EmbedBuilder()
          .setColor("#FFA500")
          .setTitle("🍯 HONEY MERCHANT")
          .setDescription(
`**🐝 Zdobywaj miód i kupuj itemy!**

➤ 🌍 Bee World  
➤ 🛒 Specjalne oferty  
➤ 💎 Supreme (110%)`
          )
          .setThumbnail("https://imgur.com/zhLC0zn.png")
      ),
      base(
        new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("💀 BOSS MERCHANT")
          .setDescription(
`**⚔️ Zabij bossy i zdobywaj tokeny!**

➤ 🪙 Tokeny  
➤ 🛒 Sklep eventowy  
➤ 💎 Supreme (125%)`
          )
          .setThumbnail("https://imgur.com/yFvb6jY.png")
      )
    ];
  }

  if (type === "spin") {
    return base(
      new EmbedBuilder()
        .setColor("#8A2BE2")
        .setTitle("🎡 DEV SPIN EVENT")
        .setDescription(
`**🎯 Zakręć kołem i wygraj nagrody!**

➤ 🎁 Losowe nagrody  
➤ 💎 Rzadkie dropy  
➤ ✨ Szansa na Supreme`
        )
        .setThumbnail("https://imgur.com/NJI7052.png")
    );
  }
}

// ================= DM SYSTEM =================

async function sendDM(type) {
  const db = loadDB();

  for (const userId in db.dm) {
    if (!db.dm[userId].includes(type)) continue;

    try {
      const user = await client.users.fetch(userId);
      await user.send(`🔔 Event ${type.toUpperCase()} wystartował!`);
    } catch {}
  }
}

// ================= SEND EVENT =================

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const now = getTime();
  const type = getEventByHour(now.getHours());

  await channel.send(`${getRole(type)} 🚀 **EVENT WYSTARTOWAŁ!**`);

  const embed = getEmbed(type);

  if (Array.isArray(embed)) {
    for (const e of embed) await channel.send({ embeds: [e] });
  } else {
    await channel.send({ embeds: [embed] });
  }

  await sendDM(type);
}

// ================= REMINDER =================

async function reminder() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const now = getTime();
  const next = (now.getHours() + 1) % 24;
  const type = getEventByHour(next);

  await channel.send(`${getRole(type)} ⏳ **EVENT ZA 5 MINUT!**`);
}

// ================= PANEL =================

function getPanel() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("event").setLabel("Aktualny").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("next").setLabel("Następne").setStyle(ButtonStyle.Success)
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("roles")
        .setPlaceholder("🎭 Wybierz role")
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

// ================= LOOP =================

setInterval(() => {
  const now = getTime();

  if (now.getMinutes() === 0) sendEvent();
  if (now.getMinutes() === 55) reminder();

}, 60000);

// ================= COMMANDS =================

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

client.on("interactionCreate", async (i) => {

  if (i.isChatInputCommand()) {
    if (i.commandName === "panel") {
      return i.reply({
        content: "🎮 **PANEL EVENTÓW**",
        components: getPanel(),
        ephemeral: true
      });
    }
  }

  if (i.isStringSelectMenu()) {

    // ROLE
    if (i.customId === "roles") {
      const role = i.values[0];
      const member = await i.guild.members.fetch(i.user.id);

      if (member.roles.cache.has(role)) {
        await member.roles.remove(role);
        return i.reply({ content: "❌ Usunięto rolę", ephemeral: true });
      } else {
        await member.roles.add(role);
        return i.reply({ content: "✅ Dodano rolę", ephemeral: true });
      }
    }

    // DM
    if (i.customId === "dm") {
      const db = loadDB();

      if (!db.dm[i.user.id]) db.dm[i.user.id] = [];

      const val = i.values[0];

      if (db.dm[i.user.id].includes(val)) {
        db.dm[i.user.id] = db.dm[i.user.id].filter(x => x !== val);
        saveDB(db);
        return i.reply({ content: "❌ Wyłączono DM", ephemeral: true });
      } else {
        db.dm[i.user.id].push(val);
        saveDB(db);
        return i.reply({ content: "✅ Włączono DM", ephemeral: true });
      }
    }
  }
});

// ================= READY =================

client.once("clientReady", async () => {
  console.log("🔥 BOT ONLINE");
  await registerCommands();
});

client.login(TOKEN);
