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

// ===== PANEL IMAGE =====
const PANEL_IMAGE = "https://imgur.com/AybkuW5.png";

// ===== MERCHANT DATA =====
const EVENT = {
  name: "HONEY MERCHANT",
  color: "#ef4444",
  image: "https://imgur.com/txWUEQE.png", // 🔥 podmień na swoje
  tip: "Przygotuj walutę!"
};

// ===== ROLE =====
const ROLE_ID = "1476000993660502139";

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

// 🔥 Merchant co 3h (00, 03, 06, 09, 10, 13, 16, 19, 22)
function getNextMerchant() {
  const now = getNow();
  const hour = now.getHours();

  let nextHour = Math.ceil(hour / 3) * 3;

  const next = new Date(now);
  next.setMinutes(0, 0, 0);

  if (nextHour >= 24) nextHour = 0;

  next.setHours(nextHour);

  if (next <= now) {
    next.setHours(nextHour + 3);
  }

  return next;
}

function getCountdown() {
  const now = getNow();
  const next = getNextMerchant();

  const diff = next - now;

  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return `${m}m ${s}s`;
}

// ===== PANEL EMBED =====
function panelEmbed() {
  return new EmbedBuilder()
    .setColor(EVENT.color)
    .setTitle("✨ MERCHANT PANEL")
    .setDescription(
`🛒 **Merchant Tracker**

⏳ Następny merchant za:
\`${getCountdown()}\`

🎁 Event:
\`${EVENT.name}\``
    )
    .setImage(PANEL_IMAGE);
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
      .setPlaceholder("Select role")
      .addOptions([
        { label: "MERCHANT", value: "merchant" }
      ])
  );
}

function dmMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dm_menu")
      .setPlaceholder("Select DM")
      .addOptions([
        { label: "MERCHANT", value: "merchant" }
      ])
  );
}

// ===== PANEL START =====
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

  let lastPing = null;

  setInterval(async () => {
    const now = getNow();
    const next = getNextMerchant();

    const diff = next - now;
    const minutes = Math.floor(diff / 60000);

    // 🔔 5 min before
    if (minutes === 5 && lastPing !== "pre") {
      lastPing = "pre";

      await channel.send({
        content: `<@&${ROLE_ID}> ⏳ MERCHANT ZA 5 MIN!`
      }).catch(()=>{});
    }

    // 🚀 start
    if (minutes === 0 && lastPing !== "start") {
      lastPing = "start";

      await channel.send({
        content: `<@&${ROLE_ID}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(EVENT.color)
            .setTitle(`🚀 ${EVENT.name} START!`)
            .setDescription(`💡 ${EVENT.tip}`)
            .setImage(EVENT.image)
        ]
      }).catch(()=>{});
    }

    // reset blokady
    if (minutes > 5) {
      lastPing = null;
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
      content: "🎭 Role:",
      components: [rolesMenu()],
      ephemeral: true
    });
  }

  if (interaction.customId === "dm") {
    return interaction.reply({
      content: "📩 Powiadomienia DM:",
      components: [dmMenu()],
      ephemeral: true
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "roles_menu") {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    await member.roles.remove(ROLE_ID).catch(()=>{});

    if (interaction.values.includes("merchant")) {
      await member.roles.add(ROLE_ID).catch(()=>{});
    }

    return interaction.reply({ content: "✅ Role updated", ephemeral: true });
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
