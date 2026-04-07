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

  // Godziny eventów
  MERCHANT_HOURS: [2, 5, 8, 11, 14, 17, 20, 23],
  EGG_HOURS: [0, 3, 6, 9, 12, 15, 18, 21],

  // Ustawienia
  REFRESH_INTERVAL: 10000,
  START_MESSAGE_DELETE_AFTER: 15 * 60 * 1000,   // 15 minut
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

  for (const [userId, subscriptions] of Object.entries(db.dm || {})) {
    if (!subscriptions.includes(type)) continue;
    const user = await client.users.fetch(userId).catch(() => null);
    if (user) user.send(message).catch(() => {});
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
function startEventSystem(client) {
  console.log("🚀 Event System uruchomiony – monitorowanie godzin...");

  // Przechowujemy ID wiadomości z pre-pingiem, żeby móc je usunąć
  const prePingMessages = new Map(); // key: "m-14" lub "e-12" → message object

  setInterval(async () => {
    const now = getNow();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // ====================== HONEY MERCHANT ======================
    for (const eventHour of CONFIG.MERCHANT_HOURS) {
      const prePingKey = `m-${eventHour}`;

      // 5 minut przed
      if (hour === eventHour - 1 && minute === 55) {
        if (!prePingMessages.has(prePingKey)) {
          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            const pingMsg = await channel.send(`<@&${CONFIG.MERCHANT_ROLE}> ⏳ **Honey Merchant** za 5 minut!`).catch(() => null);
            if (pingMsg) prePingMessages.set(prePingKey, pingMsg);
          }
        }
      }

      // Start eventu
      if (hour === eventHour && minute === 0) {
        // Usuń pre-ping jeśli istnieje
        const preMsg = prePingMessages.get(prePingKey);
        if (preMsg) {
          preMsg.delete().catch(() => {});
          prePingMessages.delete(prePingKey);
        }

        const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
        if (channel) {
          const startMsg = await channel.send({
            content: `<@&${CONFIG.MERCHANT_ROLE}>`,
            embeds: [createMerchantStartEmbed()]
          }).catch(() => null);

          sendDMNotifications(client, "merchant");

          // Usuń wiadomość startową po 15 minutach
          if (startMsg) {
            setTimeout(() => {
              startMsg.delete().catch(() => {});
            }, CONFIG.START_MESSAGE_DELETE_AFTER);
          }
        }
      }
    }

    // ====================== EGG HUNT ======================
    for (const eventHour of CONFIG.EGG_HOURS) {
      const prePingKey = `e-${eventHour}`;

      // 5 minut przed
      if (hour === eventHour - 1 && minute === 55) {
        if (!prePingMessages.has(prePingKey)) {
          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            const pingMsg = await channel.send(`<@&${CONFIG.EGG_ROLE}> ⏳ **Egg Hunt** za 5 minut!`).catch(() => null);
            if (pingMsg) prePingMessages.set(prePingKey, pingMsg);
          }
        }
      }

      // Start eventu
      if (hour === eventHour && minute === 0) {
        // Usuń pre-ping jeśli istnieje
        const preMsg = prePingMessages.get(prePingKey);
        if (preMsg) {
          preMsg.delete().catch(() => {});
          prePingMessages.delete(prePingKey);
        }

        const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
        if (channel) {
          const startMsg = await channel.send({
            content: `<@&${CONFIG.EGG_ROLE}>`,
            embeds: [createEggStartEmbed()]
          }).catch(() => null);

          sendDMNotifications(client, "egg");

          if (startMsg) {
            setTimeout(() => {
              startMsg.delete().catch(() => {});
            }, CONFIG.START_MESSAGE_DELETE_AFTER);
          }
        }
      }
    }
  }, CONFIG.REFRESH_INTERVAL);
}

// ====================== INTERACTION HANDLER ======================
async function handleEventInteraction(interaction) {
  try {
    if (interaction.customId === "refresh") {
      return await interaction.update({
        embeds: [createPanelEmbed()],
        components: [getControlButtons()]
      });
    }

    if (interaction.customId === "roles") {
      return await interaction.reply({
        content: "🎭 **Wybierz role eventowe:**",
        components: [getRoleSelectMenu()],
        ephemeral: true
      });
    }

    if (interaction.customId === "dm") {
      return await interaction.reply({
        content: "📩 **Wybierz powiadomienia DM:**",
        components: [getDMSelectMenu()],
        ephemeral: true
      });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "role_menu") {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await member.roles.remove([CONFIG.MERCHANT_ROLE, CONFIG.EGG_ROLE]).catch(() => {});

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
