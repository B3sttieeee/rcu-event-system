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

// ================= EMBED BASE =================

function base(embed) {
  return embed
    .setFooter({ text: "Start: 2026-03-22 • Twórca: B3sttiee" })
    .setTimestamp();
}

// ================= EMBEDS =================

function getEmbed(type) {

  if (type === "egg") {
    return base(
      new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle("🥚 RNG EGG EVENT")
        .setDescription(
`**🎯 Otwieraj jajka i zdobywaj punkty!**

➤ 🐾 Lepsze pety → więcej punktów  
➤ 📈 Więcej punktów → wyższy tier  
➤ 💎 Wyższy tier → lepsze nagrody  

🔥 **Im więcej grasz, tym więcej zyskujesz!**`
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
`**🐝 Zdobywaj miód i wymieniaj na nagrody!**

➤ 🌍 Bee World  
➤ 🛒 Oferty eventowe  
➤ 💎 Szansa na Supreme (110%)`
          )
          .setThumbnail("https://imgur.com/zhLC0zn.png")
      ),
      base(
        new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("💀 BOSS MERCHANT")
          .setDescription(
`**⚔️ Pokonuj bossy i zdobywaj Tokeny Bossa!**

➤ 🪙 Tokeny Bossa  
➤ 🛒 Sklep eventowy  
➤ 💎 Szansa na Supreme (125%)`
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

// ================= NEXT EVENTS =================

function getNextEvents() {
  const now = getTime();
  const currentHour = now.getHours();

  const list = [];

  for (let i = 1; i <= 3; i++) {
    const hour = (currentHour + i) % 24;

    const date = new Date(now);
    date.setHours(hour, 0, 0, 0);

    if (hour <= currentHour) {
      date.setDate(date.getDate() + 1);
    }

    list.push({
      type: getEventByHour(hour),
      timestamp: Math.floor(date.getTime() / 1000)
    });
  }

  return list;
}

// ================= PANEL =================

function getPanel() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("current")
        .setLabel("Aktualny Event")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Następne Eventy")
        .setStyle(ButtonStyle.Success)
    )
  ];
}

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

  // ===== BUTTONS =====

  if (i.isButton()) {

    if (i.customId === "current") {
      return i.reply({
        embeds: [getEmbed(getEventByHour(getTime().getHours()))],
        ephemeral: true
      });
    }

    if (i.customId === "next") {

      const events = getNextEvents();

      const embed = base(
        new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle("📅 NASTĘPNE EVENTY")
      );

      events.forEach(e => {
        embed.addFields({
          name: `➤ ${e.type.toUpperCase()}`,
          value: `<t:${e.timestamp}:R>\n<t:${e.timestamp}:F>`
        });
      });

      return i.reply({ embeds: [embed], ephemeral: true });
    }
  }
});

// ================= READY =================

client.once("clientReady", async () => {
  console.log("🔥 BOT ONLINE");
  await registerCommands();
});

client.login(TOKEN);
