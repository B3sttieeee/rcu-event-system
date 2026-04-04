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

// ROLES
const MERCHANT_ROLE = "1476000993660502139";
const EGG_ROLE = "1489930030166573150";

// ===== IMAGES =====
const PANEL_IMAGE = "https://imgur.com/AybkuW5.png";
const START_MERCHANT_IMAGE = "https://imgur.com/7GBAq8Z.png";
const EGG_IMAGE = "https://imgur.com/xppQUWX.png";

// ===== HOURS =====
const MERCHANT_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
const EGG_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

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
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
}

// ===== NEXT & COUNTDOWN =====
function getNext(HOURS) {
  const now = getNow();
  const h = now.getHours();

  for (let x of HOURS) {
    if (x > h) return x;
  }
  return HOURS[0];
}

function getCountdown(HOURS) {
  const now = getNow();
  let target = new Date(now);
  const next = getNext(HOURS);

  if (next <= now.getHours()) target.setDate(target.getDate() + 1);
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
    .setTitle("🎉 EVENT TRACKER")
    .setDescription(
      `🍯 Honey Merchant
\`${getNext(MERCHANT_HOURS)}:00\` • ${getCountdown(MERCHANT_HOURS)}

🐣 Egg Hunt
\`${getNext(EGG_HOURS)}:00\` • ${getCountdown(EGG_HOURS)}`
    )
    .setImage(PANEL_IMAGE);
}

// ===== BUTTONS & MENUS =====
function getButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("refresh").setLabel("🔄 Refresh").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("roles").setLabel("🎭 Role").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("dm").setLabel("📩 Notifications").setStyle(ButtonStyle.Primary)
    )
  ];
}

function roleMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("role_menu")
      .setPlaceholder("Wybierz rolę")
      .addOptions([
        { label: "Honey Merchant", value: "merchant" },
        { label: "Egg Hunt", value: "egg" }
      ])
  );
}

function dmMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dm_menu")
      .setPlaceholder("Powiadomienia DM")
      .addOptions([
        { label: "Honey Merchant", value: "merchant" },
        { label: "Egg Hunt", value: "egg" }
      ])
  );
}

// ===== SEND DM =====
async function sendDM(client, type) {
  const db = loadDB();
  for (let userId in db.dm) {
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) continue;
    if (!db.dm[userId].includes(type)) continue;

    if (type === "merchant") user.send("🍯 Honey Merchant starting now!").catch(() => {});
    if (type === "egg")
      user.send(
        `🐣 EGG HUNT START!\n\n🇵🇱 Zbieraj 5 jajek na eventowej mapie!\n🇬🇧 Collect 5 eggs on the event map!`
      ).catch(() => {});
  }
}

// ===== START PANEL =====
async function startPanel(client) {
  const ch = await client.channels.fetch(CHANNEL_ID);
  const msg = await ch.send({ embeds: [panelEmbed()], components: getButtons() });

  setInterval(() => {
    msg.edit({ embeds: [panelEmbed()], components: getButtons() }).catch(() => {});
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

    // ===== MERCHANT =====
    for (let x of MERCHANT_HOURS) {
      // 5 MIN BEFORE
      if (h === x - 1 && m === 55 && lastPing !== `m-${x}`) {
        lastPing = `m-${x}`;
        prePingMsg = await ch.send(`<@&${MERCHANT_ROLE}> ⏳ Merchant in 5 minutes!`).catch(() => {});
      }

      // START
      if (h === x && m === 0 && lastStart !== `m-${x}`) {
        lastStart = `m-${x}`;

        if (prePingMsg) {
          prePingMsg.delete().catch(() => {});
          prePingMsg = null;
        }

        const startMsg = await ch.send({
          content: `<@&${MERCHANT_ROLE}>`,
          embeds: [
            new EmbedBuilder()
              .setColor("#f59e0b")
              .setTitle("🍯 HONEY MERCHANT START!")
              .setImage(START_MERCHANT_IMAGE)
          ]
        }).catch(() => {});

        sendDM(client, "merchant");

        // DELETE START MSG AFTER 15 MIN
        setTimeout(() => {
          startMsg?.delete().catch(() => {});
        }, 15 * 60 * 1000);
      }
    }

    // ===== EGG HUNT =====
    for (let x of EGG_HOURS) {
      if (h === x - 1 && m === 55 && lastPing !== `e-${x}`) {
        lastPing = `e-${x}`;
        prePingMsg = await ch.send(`<@&${EGG_ROLE}> ⏳ Egg Hunt in 5 minutes!`).catch(() => {});
      }

      if (h === x && m === 0 && lastStart !== `e-${x}`) {
        lastStart = `e-${x}`;

        if (prePingMsg) {
          prePingMsg.delete().catch(() => {});
          prePingMsg = null;
        }

        const startMsg = await ch.send({
          content: `<@&${EGG_ROLE}>`,
          embeds: [
            new EmbedBuilder()
              .setColor("#ff69b4")
              .setTitle("🐣 EGG HUNT START!")
              .setDescription(
                `🇵🇱 Zbieraj 5 jajek na eventowej mapie!\n🇬🇧 Collect 5 eggs on the event map!`
              )
              .setImage(EGG_IMAGE)
          ]
        }).catch(() => {});

        sendDM(client, "egg");

        setTimeout(() => {
          startMsg?.delete().catch(() => {});
        }, 15 * 60 * 1000);
      }
    }
  }, 10000);
}

// ===== INTERACTIONS =====
async function handleEventInteraction(interaction) {
  if (interaction.customId === "refresh") {
    return interaction.update({ embeds: [panelEmbed()], components: getButtons() });
  }

  if (interaction.customId === "roles") {
    return interaction.reply({ content: "🎭 Wybierz rolę:", components: [roleMenu()], ephemeral: true });
  }

  if (interaction.customId === "dm") {
    return interaction.reply({ content: "📩 Powiadomienia:", components: [dmMenu()], ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "role_menu") {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    await member.roles.remove(MERCHANT_ROLE).catch(() => {});
    await member.roles.remove(EGG_ROLE).catch(() => {});

    if (interaction.values.includes("merchant")) await member.roles.add(MERCHANT_ROLE);
    if (interaction.values.includes("egg")) await member.roles.add(EGG_ROLE);

    return interaction.reply({ content: "✅ Role ustawione", ephemeral: true });
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
