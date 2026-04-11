const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

// ====================== CONFIG ======================
const CONFIG = {
  CHANNEL_ID: "1484937784283369502",
  MERCHANT_ROLE: "1476000993660502139",
  EGG_ROLE: "1489930030166573150",
  PANEL_IMAGE: "https://imgur.com/AybkuW5.png",
  START_MERCHANT_IMAGE: "https://imgur.com/7GBAq8Z.png",
  EGG_IMAGE: "https://imgur.com/xppQUWX.png",
  MERCHANT_HOURS: [2, 5, 8, 11, 14, 17, 20, 23],
  EGG_HOURS: [0, 3, 6, 9, 12, 15, 18, 21],

  // === NOWY SPRING MERCHANT (co godzinę) ===
  SPRING_MERCHANT_HOURS: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
  SPRING_MERCHANT_ROLE: "1476000993119568105", // ← ZMIEŃ NA ID ROLI SPRING MERCHANT
  SPRING_MERCHANT_IMAGE: "https://imgur.com/89tmfpV",

  REFRESH_INTERVAL: 10000, // 10 sekund
  START_MESSAGE_DELETE_AFTER: 15 * 60 * 1000, // 15 minut
};

// ====================== DATABASE ======================
const DB_PATH = path.join(__dirname, "..", "eventDB.json");

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
  return hours[0];
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

// ====================== NOWY EMBED DLA SPRING MERCHANT ======================
function createSpringMerchantStartEmbed() {
  return new EmbedBuilder()
    .setColor("#22c55e") // zielony wiosenny kolor
    .setTitle("🌸 SPRING MERCHANT START!")
    .setImage(CONFIG.SPRING_MERCHANT_IMAGE)
    .setTimestamp();
}

// ====================== BUTTONS & MENUS ======================
function getControlButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("refresh").setLabel("🔄 Odśwież").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("roles").setLabel("🎭 Role").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("dm").setLabel("📩 Powiadomienia DM").setStyle(ButtonStyle.Primary)
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
      return console.error("❌ Kanał event panel nie istnieje lub nie jest tekstowy!");
    }

    const embed = createPanelEmbed();
    const message = await channel.send({ embeds: [embed], components: [getControlButtons()] });

    // Odświeżanie panelu co 10 sekund
    setInterval(async () => {
      try {
        await message.edit({ embeds: [createPanelEmbed()], components: [getControlButtons()] });
      } catch (err) {
        if (err.code !== 10008) console.error("Panel refresh error:", err.message);
      }
    }, CONFIG.REFRESH_INTERVAL);

    console.log("✅ Event Panel uruchomiony pomyślnie");
  } catch (err) {
    console.error("❌ Błąd uruchamiania panelu:", err);
  }
}

// ====================== MAIN EVENT SYSTEM ======================
function startEventSystem(client) {
  console.log("🚀 Event System uruchomiony – monitorowanie godzin...");

  setInterval(async () => {
    const now = getNow();
    const hour = now.getHours();
    const minute = now.getMinutes();

    const processedEvents = new Map(); // anti-spam + przechowywanie ID wiadomości "za 5 minut"

    // ====================== HONEY MERCHANT ======================
    for (const eventHour of CONFIG.MERCHANT_HOURS) {
      const eventKey = `merchant-${eventHour}`;

      // 5 minut przed (poprawione o zawijanie godziny 0 → 23)
      const preHour = (eventHour - 1 + 24) % 24;
      if (hour === preHour && minute === 55) {
        if (!processedEvents.has(eventKey + "-pre")) {
          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            const preMsg = await channel.send(`<@&${CONFIG.MERCHANT_ROLE}> ⏳ **Honey Merchant** za 5 minut!`).catch(() => null);
            if (preMsg) processedEvents.set(eventKey + "-pre", preMsg.id);
          }
        }
      }

      // Start eventu + USUNIĘCIE powiadomienia 5 minut przed
      if (hour === eventHour && minute === 0) {
        if (!processedEvents.has(eventKey + "-started")) {
          // Usuwamy powiadomienie "za 5 minut"
          const preKey = eventKey + "-pre";
          if (processedEvents.has(preKey)) {
            const preId = processedEvents.get(preKey);
            if (preId) {
              const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
              if (channel) {
                const preMessage = await channel.messages.fetch(preId).catch(() => null);
                if (preMessage) await preMessage.delete().catch(() => {});
              }
            }
            processedEvents.delete(preKey);
          }

          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            const startMsg = await channel.send({
              content: `<@&${CONFIG.MERCHANT_ROLE}>`,
              embeds: [createMerchantStartEmbed()]
            }).catch(() => null);

            sendDMNotifications(client, "merchant");

            if (startMsg) {
              setTimeout(() => startMsg.delete().catch(() => {}), CONFIG.START_MESSAGE_DELETE_AFTER);
            }
          }
          processedEvents.set(eventKey + "-started", true);
        }
      }
    }

    // ====================== EGG HUNT ======================
    for (const eventHour of CONFIG.EGG_HOURS) {
      const eventKey = `egg-${eventHour}`;

      // 5 minut przed (poprawione o zawijanie)
      const preHour = (eventHour - 1 + 24) % 24;
      if (hour === preHour && minute === 55) {
        if (!processedEvents.has(eventKey + "-pre")) {
          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            const preMsg = await channel.send(`<@&${CONFIG.EGG_ROLE}> ⏳ **Egg Hunt** za 5 minut!`).catch(() => null);
            if (preMsg) processedEvents.set(eventKey + "-pre", preMsg.id);
          }
        }
      }

      // Start eventu + USUNIĘCIE powiadomienia 5 minut przed
      if (hour === eventHour && minute === 0) {
        if (!processedEvents.has(eventKey + "-started")) {
          const preKey = eventKey + "-pre";
          if (processedEvents.has(preKey)) {
            const preId = processedEvents.get(preKey);
            if (preId) {
              const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
              if (channel) {
                const preMessage = await channel.messages.fetch(preId).catch(() => null);
                if (preMessage) await preMessage.delete().catch(() => {});
              }
            }
            processedEvents.delete(preKey);
          }

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
          processedEvents.set(eventKey + "-started", true);
        }
      }
    }

    // ====================== SPRING MERCHANT (nowy – co godzinę) ======================
    for (const eventHour of CONFIG.SPRING_MERCHANT_HOURS) {
      const eventKey = `spring-${eventHour}`;

      // 5 minut przed (poprawione o zawijanie godziny)
      const preHour = (eventHour - 1 + 24) % 24;
      if (hour === preHour && minute === 55) {
        if (!processedEvents.has(eventKey + "-pre")) {
          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            const preMsg = await channel.send(`<@&${CONFIG.SPRING_MERCHANT_ROLE}> ⏳ **Spring Merchant** za 5 minut!`).catch(() => null);
            if (preMsg) processedEvents.set(eventKey + "-pre", preMsg.id);
          }
        }
      }

      // Start eventu + USUNIĘCIE powiadomienia 5 minut przed
      if (hour === eventHour && minute === 0) {
        if (!processedEvents.has(eventKey + "-started")) {
          const preKey = eventKey + "-pre";
          if (processedEvents.has(preKey)) {
            const preId = processedEvents.get(preKey);
            if (preId) {
              const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
              if (channel) {
                const preMessage = await channel.messages.fetch(preId).catch(() => null);
                if (preMessage) await preMessage.delete().catch(() => {});
              }
            }
            processedEvents.delete(preKey);
          }

          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            const startMsg = await channel.send({
              content: `<@&${CONFIG.SPRING_MERCHANT_ROLE}>`,
              embeds: [createSpringMerchantStartEmbed()]
            }).catch(() => null);

            // (nie dodajemy DM dla Spring Merchant – jak chcesz, daj znać)

            if (startMsg) {
              setTimeout(() => startMsg.delete().catch(() => {}), CONFIG.START_MESSAGE_DELETE_AFTER);
            }
          }
          processedEvents.set(eventKey + "-started", true);
        }
      }
    }

    // Czyszczenie pamięci co godzinę (po 5 minucie)
    if (minute === 5) {
      processedEvents.clear();
    }
  }, CONFIG.REFRESH_INTERVAL);
}

// ====================== INTERACTION HANDLER ======================
async function handleEventInteraction(interaction) {
  try {
    if (interaction.customId === "refresh") {
      return await interaction.update({ embeds: [createPanelEmbed()], components: [getControlButtons()] });
    }

    if (interaction.customId === "roles") {
      return await interaction.reply({ content: "🎭 **Wybierz role eventowe:**", components: [getRoleSelectMenu()], ephemeral: true });
    }

    if (interaction.customId === "dm") {
      return await interaction.reply({ content: "📩 **Wybierz powiadomienia DM:**", components: [getDMSelectMenu()], ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "role_menu") {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await member.roles.remove([CONFIG.MERCHANT_ROLE, CONFIG.EGG_ROLE]).catch(() => {});
      if (interaction.values.includes("merchant")) await member.roles.add(CONFIG.MERCHANT_ROLE).catch(() => {});
      if (interaction.values.includes("egg")) await member.roles.add(CONFIG.EGG_ROLE).catch(() => {});
      return await interaction.reply({ content: "✅ Role eventowe zaktualizowane!", ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "dm_menu") {
      const db = loadDB();
      db.dm[interaction.user.id] = interaction.values;
      saveDB(db);
      return await interaction.reply({ content: "✅ Powiadomienia DM zapisane!", ephemeral: true });
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
