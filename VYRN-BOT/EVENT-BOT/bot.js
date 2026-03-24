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
    tip: "Znajdź serwer i farm Tier!"
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
    tip: "Zakręć kołem!"
  }
};

const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

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

// ================= EVENT LOGIC =================
function getEventByHour(hour) {
  if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
  return "spin";
}

function getCurrentEvent() {
  return getEventByHour(new Date().getHours());
}

function getNextEvent() {
  const nextHour = (new Date().getHours() + 1) % 24;
  return getEventByHour(nextHour);
}

// ================= COUNTDOWN =================
function getCountdownToNext() {
  const now = new Date();

  let m = 59 - now.getMinutes();
  let s = 60 - now.getSeconds();

  if (s === 60) {
    s = 0;
  } else {
    m -= 1;
  }

  return `${m}m ${s}s`;
}

// ile minęło od startu aktualnego eventu
function getElapsedCurrent() {
  const now = new Date();
  const m = now.getMinutes();
  const s = now.getSeconds();
  return `${m}m ${s}s`;
}

// ================= EMBED =================
function panelEmbed() {
  const current = getCurrentEvent();
  const next = getNextEvent();

  const currentData = EVENT_DATA[current];
  const nextData = EVENT_DATA[next];

  return new EmbedBuilder()
    .setColor(currentData.color)
    .setTitle("✨ Event Panel")
    .setDescription(
`🎮 **Live Event Tracking**

\`\`\`
🟢 CURRENT        ⏭️ NEXT
${currentData.name.padEnd(14)} ${nextData.name}

⏱️ ${getElapsedCurrent().padEnd(14)} ⏳ ${getCountdownToNext()}
\`\`\`
`
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
  console.log("🔥 FINAL PERFECT");
  await startPanel();
});

client.login(TOKEN);
