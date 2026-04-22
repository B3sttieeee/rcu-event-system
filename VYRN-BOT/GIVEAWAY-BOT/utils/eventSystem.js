const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// ====================== CONFIG ======================
const CONFIG = {
  CHANNEL_ID: "1484937784283369502",
  ROLES: {
    MERCHANT: "1476000993660502139",
  },
  IMAGES: {
    PANEL: "https://imgur.com/l405BQN.png",
    MERCHANT: "https://imgur.com/sasz9j4.png",
  },
  EVENTS: {
    merchant: { hours: [2, 5, 8, 11, 14, 17, 20, 23], role: "MERCHANT" },
  },
  REFRESH_INTERVAL: 10_000,      // 10 sekund
  DELETE_AFTER: 15 * 60 * 1000,  // 15 minut
};

// ====================== DB ======================
const DB_PATH = path.join(__dirname, "..", "eventDB.json");

const loadDB = () => {
  if (!fs.existsSync(DB_PATH)) return { dm: {} };
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return { dm: {} };
  }
};

const saveDB = (db) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
};

// ====================== TIME HELPERS ======================
const getNow = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));

const getNextHour = (hours) => {
  const now = getNow().getHours();
  return hours.find((h) => h > now) ?? hours[0];
};

const getCountdown = (hour) => {
  const now = getNow();
  const target = new Date(now);
  if (hour <= now.getHours()) target.setDate(target.getDate() + 1);
  target.setHours(hour, 0, 0, 0);
  const diff = target - now;
  const s = Math.floor(diff / 1000);
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
};

// ====================== CACHE ======================
const processed = new Map();

// ====================== EMBEDS ======================
const panelEmbed = () =>
  new EmbedBuilder()
    .setColor("#0a0a0a")                    // Czarny motyw
    .setTitle("🎫 EVENT CENTER")
    .setDescription(
      Object.entries(CONFIG.EVENTS)
        .map(([name, e]) => {
          const next = getNextHour(e.hours);
          return [
            `**${name.toUpperCase()} EVENT**`,
            `Next: \`${next}:00\``,
            `Starts in: **${getCountdown(next)}**`,
          ].join("\n");
        })
        .join("\n\n━━━━━━━━━━━━━━\n\n")
    )
    .setImage(CONFIG.IMAGES.PANEL)
    .setFooter({ text: "VYRN • Event Tracker" })
    .setTimestamp();

const eventEmbed = (name, image) =>
  new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle(`🎉 ${name.toUpperCase()} EVENT STARTED`)
    .setDescription("📢 Event is now **ACTIVE**\n\n👉 Join now and participate!")
    .setImage(image || null)
    .setFooter({ text: "VYRN • Event System" })
    .setTimestamp();

// ====================== BUTTONS ======================
const buttons = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("refresh")
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("roles")
      .setLabel("Roles")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("dm")
      .setLabel("Notifications")
      .setStyle(ButtonStyle.Primary)
  );

// ====================== ROLE MENU ======================
const roleMenu = () =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("role_menu")
      .setPlaceholder("Select event roles")
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions([
        { label: "Merchant", value: "merchant", emoji: "🍯" },
      ])
  );

// ====================== DM MENU ======================
const dmMenu = () =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dm_menu")
      .setPlaceholder("Event notifications DM")
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions([
        { label: "Merchant", value: "merchant", emoji: "🍯" },
      ])
  );

// ====================== CORE EVENT ENGINE ======================
function registerEvent(client, key, event, hour, roleId, image) {
  const now = getNow();
  const h = now.getHours();
  const m = now.getMinutes();
  const baseKey = `${key}-${hour}`;
  const preKey = baseKey + "-pre";
  const startKey = baseKey + "-start";

  const fetchChannel = () => client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);

  // 5 minut przed eventem
  if (h === (hour - 1 + 24) % 24 && m === 55 && !processed.has(preKey)) {
    fetchChannel().then((ch) => {
      if (!ch) return;
      ch.send(`<@&${roleId}> ${key.toUpperCase()} starts in 5 minutes!`)
        .then((msg) => processed.set(preKey, msg.id));
    });
  }

  // Start eventu
  if (h === hour && m === 0 && !processed.has(startKey)) {
    fetchChannel().then(async (ch) => {
      if (!ch) return;

      // Usuń powiadomienie "za 5 minut"
      const preId = processed.get(preKey);
      if (preId) {
        const msg = await ch.messages.fetch(preId).catch(() => null);
        msg?.delete().catch(() => {});
        processed.delete(preKey);
      }

      const msg = await ch.send({
        content: `<@&${roleId}>`,
        embeds: [eventEmbed(key, image)],
      });

      // Usuń wiadomość po czasie
      setTimeout(() => msg.delete().catch(() => {}), CONFIG.DELETE_AFTER);
      processed.set(startKey, true);
    });
  }
}

// ====================== START EVENT SYSTEM ======================
function startEventSystem(client) {
  console.log("🎟 Event System uruchomiony.");

  setInterval(() => {
    for (const [name, data] of Object.entries(CONFIG.EVENTS)) {
      for (const hour of data.hours) {
        registerEvent(
          client,
          name,
          data,
          hour,
          CONFIG.ROLES[data.role],
          CONFIG.IMAGES[name.toUpperCase()] || null
        );
      }
    }

    // Czyszczenie cache co godzinę
    if (getNow().getMinutes() === 5) processed.clear();
  }, CONFIG.REFRESH_INTERVAL);
}

// ====================== PANEL (TYLKO JEDEN) ======================
async function startPanel(client) {
  try {
    const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
    if (!channel?.isTextBased()) return;

    // Szukamy istniejącego panelu bota
    const messages = await channel.messages.fetch({ limit: 20 });
    let panelMsg = messages.find(m => 
      m.author.id === client.user.id && 
      m.embeds.length > 0 && 
      m.embeds[0].title?.includes("EVENT CENTER")
    );

    const embed = panelEmbed();
    const components = [buttons()];

    if (panelMsg) {
      await panelMsg.edit({ embeds: [embed], components }).catch(() => {});
      console.log("✅ Event panel zaktualizowany");
    } else {
      panelMsg = await channel.send({ embeds: [embed], components });
      console.log("✅ Event panel stworzony");
    }

    // Odświeżanie co 10 sekund
    setInterval(() => {
      panelMsg.edit({ embeds: [panelEmbed()], components: [buttons()] }).catch(() => {});
    }, CONFIG.REFRESH_INTERVAL);

  } catch (err) {
    console.error("❌ Błąd startPanel:", err.message);
  }
}

// ====================== INTERACTIONS ======================
async function handleEventInteraction(interaction) {
  const id = interaction.customId;

  if (id === "refresh") {
    return interaction.update({
      embeds: [panelEmbed()],
      components: [buttons()],
    });
  }

  if (id === "roles") {
    return interaction.reply({
      content: "🎭 Wybierz role eventowe:",
      components: [roleMenu()],
      ephemeral: true,
    });
  }

  if (id === "dm") {
    return interaction.reply({
      content: "📩 Powiadomienia DM:",
      components: [dmMenu()],
      ephemeral: true,
    });
  }

  if (id === "role_menu") {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const map = { merchant: CONFIG.ROLES.MERCHANT };

    // Usuń wszystkie stare role eventowe
    for (const r of Object.values(map)) {
      if (member.roles.cache.has(r)) await member.roles.remove(r).catch(() => {});
    }

    // Dodaj wybrane
    for (const val of interaction.values) {
      const role = map[val];
      if (role) await member.roles.add(role).catch(() => {});
    }

    return interaction.reply({ content: "✅ Role zaktualizowane!", ephemeral: true });
  }

  if (id === "dm_menu") {
    const db = loadDB();
    db.dm[interaction.user.id] = interaction.values;
    saveDB(db);
    return interaction.reply({ content: "📩 Powiadomienia zapisane!", ephemeral: true });
  }
}

module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction,
};
