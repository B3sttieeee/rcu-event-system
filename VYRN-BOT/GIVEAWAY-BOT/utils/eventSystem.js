const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");

// ===== CONFIG =====
const CHANNEL_ID = "1484937784283369502";

// ===== EVENT DATA (UPDATED IMAGES) =====
const EVENT_DATA = {
  egg: {
    name: "RNG EGG",
    color: "#f59e0b",
    image: "https://imgur.com/PfhYZnf.png",
    tip: "Znajdź serwer i farm Tier!"
  },
  merchant: {
    name: "BOSS / HONEY MERCHANT",
    color: "#ef4444",
    image: "https://imgur.com/GQIFzx7.png",
    tip: "Przygotuj walutę!"
  },
  spin: {
    name: "DEV SPIN",
    color: "#dc2626",
    image: "https://imgur.com/mGVojBN.png",
    tip: "Zakręć kołem!"
  }
};

// ===== ROLE IDs =====
const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

// ===== DB =====
const DB_PATH = "./eventDB.json";

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ dm: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== TIME =====
function getNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

function getEventByHour(h) {
  if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(h)) return "spin";
}

function getCurrent() {
  return getEventByHour(getNow().getHours());
}

function getNext() {
  return getEventByHour((getNow().getHours() + 1) % 24);
}

function getCountdown() {
  const now = getNow();
  let m = 59 - now.getMinutes();
  let s = 60 - now.getSeconds();
  if (s === 60) s = 0; else m--;
  return `${m}m ${s}s`;
}

// ===== EMBED =====
function panelEmbed() {
  const current = getCurrent();
  const next = getNext();

  return new EmbedBuilder()
    .setColor(EVENT_DATA[current].color)
    .setTitle("✨ EVENT PANEL")
    .setDescription(
`🎮 **Live Event Tracking**

🟢 **Current**
\`${EVENT_DATA[current].name}\`
⏳ ${getCountdown()}

⏭️ **Next**
\`${EVENT_DATA[next].name}\`
⏱️ ${getCountdown()}`
    )
    .setImage(EVENT_DATA[current].image);
}

// ===== BUTTONS =====
function getButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("refresh")
        .setLabel("🔄 Refresh")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("roles")
        .setLabel("🎭 Roles")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("dm")
        .setLabel("📩 Notifications")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

// ===== MENUS =====
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

// ===== PANEL =====
async function startPanel(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const panel = await channel.send({
    embeds: [panelEmbed()],
    components: getButtons()
  });

  setInterval(() => {
    panel.edit({
      embeds: [panelEmbed()],
      components: getButtons()
    }).catch(()=>{});
  }, 10000);
}

// ===== EVENT SYSTEM =====
async function startEventSystem(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);

  let lastPrePingHour = null;
  let lastStartHour = null;

  let prePingMsg = null;
  let startMsg = null;

  setInterval(async () => {
    const now = getNow();
    const hour = now.getHours();
    const min = now.getMinutes();

    const NEXT = getEventByHour((hour + 1) % 24);
    const CURRENT = getEventByHour(hour);

    // ===== 5 MIN BEFORE =====
    if (min === 55 && lastPrePingHour !== hour) {
      lastPrePingHour = hour;

      const data = EVENT_DATA[NEXT];
      const role = ROLES[NEXT];

      prePingMsg = await channel.send({
        content: `<@&${role}> ⏳ EVENT ZA 5 MIN: **${data.name}**`
      }).catch(()=>{});
    }

    // ===== START =====
    if (min === 0 && lastStartHour !== hour) {
      lastStartHour = hour;

      if (prePingMsg) {
        prePingMsg.delete().catch(()=>{});
        prePingMsg = null;
      }

      const data = EVENT_DATA[CURRENT];
      const role = ROLES[CURRENT];

      startMsg = await channel.send({
        content: `<@&${role}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(data.color)
            .setTitle(`🚀 ${data.name} START!`)
            .setDescription(`💡 ${data.tip}`)
            .setImage(data.image)
        ]
      }).catch(()=>{});

      setTimeout(() => {
        if (startMsg) {
          startMsg.delete().catch(()=>{});
          startMsg = null;
        }
      }, 15 * 60 * 1000);
    }

  }, 10000);
}

// ===== INTERACTION =====
async function handleEventInteraction(interaction) {

  if (interaction.customId === "refresh") {
    return interaction.update({
      embeds: [panelEmbed()],
      components: getButtons()
    });
  }

  if (interaction.customId === "roles") {
    return interaction.reply({
      content: "🎭 Select roles:",
      components: [rolesMenu()],
      ephemeral: true
    });
  }

  if (interaction.customId === "dm") {
    return interaction.reply({
      content: "📩 Select DM notifications:",
      components: [dmMenu()],
      ephemeral: true
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "roles_menu") {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    for (const key in ROLES) {
      await member.roles.remove(ROLES[key]).catch(()=>{});
    }

    for (const val of interaction.values) {
      await member.roles.add(ROLES[val]).catch(()=>{});
    }

    return interaction.reply({ content: "✅ Roles updated", ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "dm_menu") {
    const db = loadDB();
    db.dm[interaction.user.id] = interaction.values;
    saveDB(db);

    return interaction.reply({ content: "✅ DM updated", ephemeral: true });
  }
}

module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction
};
