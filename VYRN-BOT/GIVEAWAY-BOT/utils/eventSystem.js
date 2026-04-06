const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// ====================== CONFIG ======================
const CONFIG = {
  CHANNEL_ID: "1484937784283369502",
  MERCHANT_ROLE: "1476000993660502139",
  EGG_ROLE: "1489930030166573150",
  
  // Obrazy
  PANEL_IMAGE: "https://imgur.com/AybkuW5.png",
  START_MERCHANT_IMAGE: "https://imgur.com/7GBAq8Z.png",
  EGG_IMAGE: "https://imgur.com/xppQUWX.png",

  // Godziny eventów (w strefie Europe/Warsaw)
  MERCHANT_HOURS: [2, 5, 8, 11, 14, 17, 20, 23],
  EGG_HOURS: [0, 3, 6, 9, 12, 15, 18, 21],

  // Ustawienia
  REFRESH_INTERVAL: 10000,        // co ile odświeżać panel (ms)
  START_MESSAGE_DELETE_AFTER: 15 * 60 * 1000, // 15 minut
  PRE_PING_MINUTES: 5
};

const DB_PATH = path.join(__dirname, "..", "eventDB.json");

// ====================== DATABASE ======================
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const defaultData = { dm: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (err) {
    console.error("❌ Błąd odczytu eventDB.json:", err.message);
    return { dm: {} };
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Błąd zapisu eventDB.json:", err.message);
  }
}

// ====================== TIME HELPERS ======================
function getNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
}

function getNextEvent(hours) {
  const now = getNow();
  const currentHour = now.getHours();

  for (const hour of hours) {
    if (hour > currentHour) return hour;
  }
  return hours[0]; // następny dzień
}

function getCountdown(hours) {
  const now = getNow();
  let target = new Date(now);
  const nextHour = getNextEvent(hours);

  if (nextHour <= now.getHours()) {
    target.setDate(target.getDate() + 1);
  }

  target.setHours(nextHour, 0, 0, 0);

  const diff = target - now;
  const totalSeconds = Math.floor(diff / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return `${h}h ${m}m ${s}s`;
}

// ====================== EMBEDS ======================
function createPanelEmbed() {
  return new EmbedBuilder()
    .setColor("#f59e0b")
    .setTitle("🎉 EVENT TRACKER")
    .setDescription(
      `🍯 **Honey Merchant**\n` +
      `\`${getNextEvent(CONFIG.MERCHANT_HOURS)}:00\` • ${getCountdown(CONFIG.MERCHANT_HOURS)}\n\n` +
      `🐣 **Egg Hunt**\n` +
      `\`${getNextEvent(CONFIG.EGG_HOURS)}:00\` • ${getCountdown(CONFIG.EGG_HOURS)}`
    )
    .setImage(CONFIG.PANEL_IMAGE)
    .setFooter({ text: "VYRN • Event System" })
    .setTimestamp();
}

function createMerchantStartEmbed() {
  return new EmbedBuilder()
    .setColor("#f59e0b")
    .setTitle("🍯 HONEY MERCHANT START!")
    .setImage(CONFIG.START_MERCHANT_IMAGE)
    .setTimestamp();
}

function createEggStartEmbed() {
  return new EmbedBuilder()
    .setColor("#ff69b4")
    .setTitle("🐣 EGG HUNT START!")
    .setDescription(
      `🇵🇱 **Zbieraj 5 jajek** na eventowej mapie!\n` +
      `🇬🇧 **Collect 5 eggs** on the event map!`
    )
    .setImage(CONFIG.EGG_IMAGE)
    .setTimestamp();
}

// ====================== BUTTONS & MENUS ======================
function getControlButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("refresh")
      .setLabel("🔄 Odśwież")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("roles")
      .setLabel("🎭 Role")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("dm")
      .setLabel("📩 Powiadomienia DM")
      .setStyle(ButtonStyle.Primary)
  );
}

function getRoleSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("role_menu")
      .setPlaceholder("Wybierz role eventowe")
      .addOptions([
        { label: "Honey Merchant", value: "merchant", emoji: "🍯" },
        { label: "Egg Hunt", value: "egg", emoji: "🐣" }
      ])
  );
}

function getDMSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dm_menu")
      .setPlaceholder("Powiadomienia w DM")
      .addOptions([
        { label: "Honey Merchant", value: "merchant", emoji: "🍯" },
        { label: "Egg Hunt", value: "egg", emoji: "🐣" }
      ])
      .setMinValues(0)
      .setMaxValues(2)
  );
}

// ====================== DM NOTIFICATIONS ======================
async function sendDMNotifications(client, type) {
  const db = loadDB();
  const message = type === "merchant"
    ? "🍯 **Honey Merchant właśnie się rozpoczął!**"
    : `🐣 **EGG HUNT START!**\n\n🇵🇱 Zbieraj 5 jajek na eventowej mapie!\n🇬🇧 Collect 5 eggs on the event map!`;

  for (const [userId, subscriptions] of Object.entries(db.dm)) {
    if (!subscriptions.includes(type)) continue;

    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) continue;

    user.send(message).catch(() => {}); // ignorujemy błędy (DM zamknięte)
  }
}

// ====================== PANEL ======================
async function startPanel(client) {
  try {
    const channel = await client.channels.fetch(CONFIG.CHANNEL_ID);
    if (!channel?.isTextBased()) {
      console.error("❌ Kanał event panel nie istnieje lub nie jest tekstowy!");
      return;
    }

    const embed = createPanelEmbed();
    const components = [getControlButtons()];

    const message = await channel.send({ embeds: [embed], components });

    // Auto-refresh co 10 sekund
    setInterval(async () => {
      try {
        await message.edit({
          embeds: [createPanelEmbed()],
          components
        });
      } catch (err) {
        if (err.code !== 10008) console.error("Panel refresh error:", err.message);
      }
    }, CONFIG.REFRESH_INTERVAL);

    console.log("✅ Event Panel uruchomiony pomyślnie");
  } catch (err) {
    console.error("❌ Błąd uruchamiania panelu eventowego:", err);
  }
}

// ====================== MAIN EVENT SYSTEM ======================
async function startEventSystem(client) {
  console.log("🚀 Event System uruchomiony – monitorowanie godzin...");

  let lastPrePing = new Set();
  let lastStart = new Set();

  setInterval(async () => {
    const now = getNow();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // ====================== HONEY MERCHANT ======================
    for (const eventHour of CONFIG.MERCHANT_HOURS) {
      const prePingKey = `m-pre-${eventHour}`;

      // 5 minut przed
      if (hour === eventHour - 1 && minute === 55 && !lastPrePing.has(prePingKey)) {
        lastPrePing.add(prePingKey);
        const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
        if (channel) {
          await channel.send(`<@&${CONFIG.MERCHANT_ROLE}> ⏳ **Honey Merchant** za 5 minut!`).catch(() => {});
        }
      }

      // Start eventu
      const startKey = `m-start-${eventHour}`;
      if (hour === eventHour && minute === 0 && !lastStart.has(startKey)) {
        lastStart.add(startKey);
        lastPrePing.delete(`m-pre-${eventHour}`);

        const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
        if (channel) {
          const startMsg = await channel.send({
            content: `<@&${CONFIG.MERCHANT_ROLE}>`,
            embeds: [createMerchantStartEmbed()]
          }).catch(() => null);

          sendDMNotifications(client, "merchant");

          // Usuń wiadomość po 15 minutach
          if (startMsg) {
            setTimeout(() => startMsg.delete().catch(() => {}), CONFIG.START_MESSAGE_DELETE_AFTER);
          }
        }
      }
    }

    // ====================== EGG HUNT ======================
    for (const eventHour of CONFIG.EGG_HOURS) {
      const prePingKey = `e-pre-${eventHour}`;

      if (hour === eventHour - 1 && minute === 55 && !lastPrePing.has(prePingKey)) {
        lastPrePing.add(prePingKey);
        const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
        if (channel) {
          await channel.send(`<@&${CONFIG.EGG_ROLE}> ⏳ **Egg Hunt** za 5 minut!`).catch(() => {});
        }
      }

      const startKey = `e-start-${eventHour}`;
      if (hour === eventHour && minute === 0 && !lastStart.has(startKey)) {
        lastStart.add(startKey);
        lastPrePing.delete(`e-pre-${eventHour}`);

        const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
        if (channel) {
          const startMsg = await channel.send({
            content: `<@&${CONFIG.EGG_ROLE}>`,
            embeds: [createEggStartEmbed()]
          }).catch(() => null);

          sendDMNotifications(client, "egg");

          if (startMsg) {
            setTimeout(() => startMsg.delete().catch(() => {}), CONFIG.START_MESSAGE_DELETE_AFTER);
          }
        }
      }
    }
  }, CONFIG.REFRESH_INTERVAL);
}

// ====================== INTERACTION HANDLER ======================
async function handleEventInteraction(interaction) {
  try {
    // Refresh panelu
    if (interaction.customId === "refresh") {
      return await interaction.update({
        embeds: [createPanelEmbed()],
        components: [getControlButtons()]
      });
    }

    // Role menu
    if (interaction.customId === "roles") {
      return await interaction.reply({
        content: "🎭 **Wybierz role eventowe:**",
        components: [getRoleSelectMenu()],
        ephemeral: true
      });
    }

    // DM menu
    if (interaction.customId === "dm") {
      return await interaction.reply({
        content: "📩 **Wybierz powiadomienia DM:**",
        components: [getDMSelectMenu()],
        ephemeral: true
      });
    }

    // Role select
    if (interaction.isStringSelectMenu() && interaction.customId === "role_menu") {
      const member = await interaction.guild.members.fetch(interaction.user.id);

      // Usuń stare role
      await member.roles.remove([CONFIG.MERCHANT_ROLE, CONFIG.EGG_ROLE]).catch(() => {});

      // Dodaj wybrane
      if (interaction.values.includes("merchant")) {
        await member.roles.add(CONFIG.MERCHANT_ROLE).catch(() => {});
      }
      if (interaction.values.includes("egg")) {
        await member.roles.add(CONFIG.EGG_ROLE).catch(() => {});
      }

      return await interaction.reply({
        content: "✅ **Role eventowe zostały zaktualizowane!**",
        ephemeral: true
      });
    }

    // DM select
    if (interaction.isStringSelectMenu() && interaction.customId === "dm_menu") {
      const db = loadDB();
      db.dm[interaction.user.id] = interaction.values;
      saveDB(db);

      return await interaction.reply({
        content: "✅ **Ustawienia powiadomień DM zostały zapisane!**",
        ephemeral: true
      });
    }

  } catch (err) {
    console.error("❌ Błąd w handleEventInteraction:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Wystąpił błąd.", ephemeral: true }).catch(() => {});
    }
  }
}

// ====================== EXPORT ======================
module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction
};
