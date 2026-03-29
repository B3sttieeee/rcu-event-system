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
const MERCHANT_ROLE = "1476000993660502139";

// ===== IMAGES =====
const PANEL_IMAGE = "https://imgur.com/AybkuW5.png";
const START_IMAGE = "https://imgur.com/7GBAq8Z.png";

// ===== GODZINY =====
const HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

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

// ===== NEXT =====
function getNextMerchantHour() {
  const now = getNow();
  const h = now.getHours();

  for (let x of HOURS) {
    if (x > h) return x;
  }

  return HOURS[0];
}

// ===== COUNTDOWN =====
function getCountdown() {
  const now = getNow();
  let target = new Date(now);

  const next = getNextMerchantHour();

  if (next <= now.getHours()) {
    target.setDate(target.getDate() + 1);
  }

  target.setHours(next, 0, 0, 0);

  const diff = target - now;

  const s = Math.floor(diff / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return `${h}h ${m}m ${sec}s`;
}

// ===== PANEL =====
function panelEmbed() {
  return new EmbedBuilder()
    .setColor("#f59e0b")
    .setTitle("🍯 MERCHANT TRACKER")
    .setDescription(
`🏆 Next Merchant
\`${getNextMerchantHour()}:00\`

⏳ Countdown
\`${getCountdown()}\``
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
        .setLabel("🎭 Role")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("dm")
        .setLabel("📩 Notifications")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

// ===== MENUS =====
function roleMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("role_menu")
      .setPlaceholder("Wybierz rolę")
      .addOptions([
        {
          label: "Honey Merchant",
          value: "merchant"
        }
      ])
  );
}

function dmMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dm_menu")
      .setPlaceholder("Powiadomienia DM")
      .addOptions([
        {
          label: "Honey Merchant",
          value: "merchant"
        }
      ])
  );
}

// ===== PANEL START =====
async function startPanel(client) {
  const ch = await client.channels.fetch(CHANNEL_ID);

  const msg = await ch.send({
    embeds: [panelEmbed()],
    components: getButtons()
  });

  setInterval(() => {
    msg.edit({
      embeds: [panelEmbed()],
      components: getButtons()
    }).catch(()=>{});
  }, 10000);
}

// ===== EVENT SYSTEM =====
async function startEventSystem(client) {
  const ch = await client.channels.fetch(CHANNEL_ID);

  let lastPing = null;
  let lastStart = null;

  let prePingMsg = null;

  setInterval(async () => {
    const now = getNow();
    const h = now.getHours();
    const m = now.getMinutes();

    // ===== PING 5 MIN BEFORE =====
    for (let x of HOURS) {
      if (h === x - 1 && m === 55) {

        const key = `${x}-ping`;
        if (lastPing === key) return;
        lastPing = key;

        prePingMsg = await ch.send({
          content: `<@&${MERCHANT_ROLE}> ⏳ Merchant za 5 minut!`
        }).catch(()=>{});
      }
    }

    // ===== START =====
    for (let x of HOURS) {
      if (h === x && m === 0) {

        const key = `${x}-start`;
        if (lastStart === key) return;
        lastStart = key;

        if (prePingMsg) {
          prePingMsg.delete().catch(()=>{});
          prePingMsg = null;
        }

        const msg = await ch.send({
          content: `<@&${MERCHANT_ROLE}>`,
          embeds: [
            new EmbedBuilder()
              .setColor("#f59e0b")
              .setTitle("🍯 HONEY MERCHANT START!")
              .setDescription("💡 Przygotuj walutę!")
              .setImage(START_IMAGE)
          ]
        }).catch(()=>{});

        setTimeout(() => {
          msg?.delete().catch(()=>{});
        }, 15 * 60 * 1000);
      }
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
      content: "🎭 Wybierz rolę:",
      components: [roleMenu()],
      ephemeral: true
    });
  }

  if (interaction.customId === "dm") {
    return interaction.reply({
      content: "📩 Powiadomienia:",
      components: [dmMenu()],
      ephemeral: true
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "role_menu") {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    await member.roles.remove(MERCHANT_ROLE).catch(()=>{});

    if (interaction.values.includes("merchant")) {
      await member.roles.add(MERCHANT_ROLE).catch(()=>{});
    }

    return interaction.reply({ content: "✅ Rola ustawiona", ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "dm_menu") {
    const db = loadDB();
    db.dm[interaction.user.id] = interaction.values;
    saveDB(db);

    return interaction.reply({ content: "✅ DM zapisane", ephemeral: true });
  }
}

module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction
};
