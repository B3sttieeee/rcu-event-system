// =====================================================
// VYRN • EVENT SYSTEM (GOLD PRESTIGE EDITION 👑)
// =====================================================
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
  THEME: {
    GOLD: "#FFD700",
    WHITE: "#FFFFFF",
    SUCCESS: "#00FF7F",
    WARNING: "#FFA500"
  },
  ROLES: {
    MERCHANT: "1476000993660502139",
    BOSS: "1111111111111111111",   // DO ZMIANY: ID roli powiadomień o bossie
    BOOST: "2222222222222222222",  // DO ZMIANY: ID roli powiadomień o booście
  },
  IMAGES: {
    PANEL: "https://imgur.com/DOVs2GQ.png",
    MERCHANT: "https://imgur.com/4hELXcL.png",
    BOSS: "https://imgur.com/YOUR_BOSS_IMG.png",
    BOOST: "https://imgur.com/YOUR_BOOST_IMG.png",
  },
  EVENTS: {
    merchant: { 
      name: "Honey Merchant", 
      hours: [2, 5, 8, 11, 14, 17, 20, 23], 
      roleKey: "MERCHANT", 
      emoji: "🍯",
      desc: "Kupiec przybywa z rzadkimi przedmiotami i mnożnikami!"
    },
    boss: {
      name: "World Boss Spawns",
      hours: [0, 4, 8, 12, 16, 20],
      roleKey: "BOSS",
      emoji: "👹",
      desc: "Zjednocz klan i pokonaj Bossa po Mityczne nagrody!"
    },
    boost: {
      name: "Global 2x Boost",
      hours: [6, 18],
      roleKey: "BOOST",
      emoji: "⚡",
      desc: "Globalny podwójny mnożnik Rebirthów i Szczęścia aktywowany!"
    }
  },
  DELETE_AFTER: 15 * 60 * 1000, // Usuń info o evencie po 15 min
};

const DB_PATH = path.join(process.env.DATA_DIR || "./", "eventDB.json");

// ====================== DATABASE ======================
const loadDB = () => {
  if (!fs.existsSync(DB_PATH)) return { dm: {} };
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8")); } catch { return { dm: {} }; }
};
const saveDB = (db) => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

// ====================== TIME CALCULATOR (UNIX) ======================
// Zwraca timestamp UNIX, który Discord automatycznie formatuje na licznik!
const getNextEventTimestamp = (hours) => {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
  const currentH = now.getHours();
  
  let nextH = hours.find(h => h > currentH);
  let isNextDay = false;

  if (nextH === undefined) {
    nextH = hours[0];
    isNextDay = true;
  }

  const target = new Date(now);
  if (isNextDay) target.setDate(target.getDate() + 1);
  target.setHours(nextH, 0, 0, 0);

  return Math.floor(target.getTime() / 1000);
};

// ====================== EMBEDS ======================
const buildPanelEmbed = () => {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.THEME.GOLD)
    .setTitle("👑 VYRN • CENTRUM EVENTÓW")
    .setImage(CONFIG.IMAGES.PANEL)
    .setFooter({ text: "Oficjalny System Klanowy VYRN" })
    .setTimestamp();

  const description = Object.entries(CONFIG.EVENTS).map(([key, e]) => {
    const nextUnix = getNextEventTimestamp(e.hours);
    return `### ${e.emoji} ${e.name.toUpperCase()}\n` +
           `> _${e.desc}_\n` +
           `> ⏳ Start: <t:${nextUnix}:R> ┃ <t:${nextUnix}:t>`;
  }).join("\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n");

  embed.setDescription(
    "Witamy w panelu eventowym klanu **VYRN**. Poniżej znajdują się odliczenia do najważniejszych wydarzeń na serwerze. Wybierz role, aby otrzymywać powiadomienia.\n\n" + 
    description
  );
  
  return embed;
};

// ====================== COMPONENTS ======================
const buildButtons = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("refresh_events").setLabel("Odśwież Panel").setEmoji("🔄").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("get_event_roles").setLabel("Role Ping (Serwer)").setEmoji("🔔").setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId("get_event_dm").setLabel("Powiadomienia DM").setEmoji("📩").setStyle(ButtonStyle.Secondary)
);

const buildMenu = (id, placeholder) => {
  const options = Object.entries(CONFIG.EVENTS).map(([key, e]) => ({
    label: e.name, 
    value: key, 
    emoji: e.emoji,
    description: `Subskrybuj powiadomienia dla ${e.name}`
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(id)
      .setPlaceholder(placeholder)
      .setMinValues(0) // Pozwala na odznaczenie wszystkiego
      .setMaxValues(options.length) // Pozwala wybrać kilka naraz!
      .addOptions(options)
  );
};

// ====================== CORE ENGINE ======================
const processed = new Set();
let panelMessage = null;

async function checkEvents(client) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
  const h = now.getHours();
  const m = now.getMinutes();
  const day = now.getDate();

  for (const [key, e] of Object.entries(CONFIG.EVENTS)) {
    const roleId = CONFIG.ROLES[e.roleKey];

    for (const eventH of e.hours) {
      // 5 min przed startem (Ostrzeżenie)
      const preH = eventH === 0 ? 23 : eventH - 1;
      const preKey = `pre-${key}-${eventH}-${day}`;
      if (h === preH && m === 55 && !processed.has(preKey)) {
        processed.add(preKey);
        const ch = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
        
        const preEmbed = new EmbedBuilder()
          .setColor(CONFIG.THEME.WARNING)
          .setDescription(`⏳ **Przygotujcie się!** Event ${e.emoji} **${e.name}** rozpocznie się za 5 minut!`);
          
        if (ch) ch.send({ content: `<@&${roleId}>`, embeds: [preEmbed] }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5 * 60 * 1000));
      }

      // Start eventu
      const startKey = `start-${key}-${eventH}-${day}`;
      if (h === eventH && m === 0 && !processed.has(startKey)) {
        processed.add(startKey);
        await triggerEvent(client, key, e, roleId);
        // Odśwież główny panel po starcie eventu, aby zaktualizować timery na następny!
        if (panelMessage) await panelMessage.edit({ embeds: [buildPanelEmbed()] }).catch(() => {});
      }
    }
  }
  // Czyszczenie cache procesów o północy
  if (h === 0 && m === 5) processed.clear();
}

async function triggerEvent(client, key, eventData, roleId) {
  const ch = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(CONFIG.THEME.GOLD)
    .setAuthor({ name: `🔥 EVENT AKTYWNY: ${eventData.name.toUpperCase()}` })
    .setDescription(`> 📢 Wydarzenie właśnie się rozpoczęło!\n> ⚔️ Wejdź do gry, aby zdobyć przewagę dla klanu **VYRN**.`)
    .setImage(CONFIG.IMAGES[key.toUpperCase()] || null)
    .setTimestamp();

  const msg = await ch.send({ content: `**Pobudka!** <@&${roleId}>`, embeds: [embed] });

  // Wysyłanie DM do zapisanych użytkowników
  const db = loadDB();
  for (const [uid, subs] of Object.entries(db.dm)) {
    if (subs.includes(key)) {
      const user = await client.users.fetch(uid).catch(() => null);
      if (user) {
        const dmEmbed = new EmbedBuilder(embed.toJSON()).setFooter({ text: "Otrzymujesz to, bo zapisałeś się w Panelu VYRN." });
        user.send({ content: `👑 **VYRN EVENT:** ${eventData.emoji} **${eventData.name}** wystartował!`, embeds: [dmEmbed] }).catch(() => {});
      }
    }
  }

  // Auto-usuwanie powiadomienia po ustalonym czasie
  setTimeout(() => msg.delete().catch(() => {}), CONFIG.DELETE_AFTER);
}

// ====================== HANDLER ======================
async function handleEventInteraction(interaction) {
  const { customId, member, values, user } = interaction;

  if (customId === "refresh_events") {
    return await interaction.update({ embeds: [buildPanelEmbed()] });
  }

  if (customId === "get_event_roles") {
    return await interaction.reply({ 
      content: "🎭 **Wybierz role powiadomień:**\nMożesz zaznaczyć kilka opcji naraz.", 
      components: [buildMenu("role_menu", "Wybierz eventy...")], 
      ephemeral: true 
    });
  }

  if (customId === "get_event_dm") {
    return await interaction.reply({ 
      content: "📩 **Powiadomienia Prywatne (DM):**\nOtrzymasz wiadomość bezpośrednio od bota.", 
      components: [buildMenu("dm_menu", "Wybierz powiadomienia DM...")], 
      ephemeral: true 
    });
  }

  if (customId === "role_menu") {
    // Odczytywanie wszystkich wybranych wartości
    const selectedKeys = values; 
    let added = [], removed = [];

    // Pobieramy ID ról ze wszystkich dostepnych eventów
    for (const [key, e] of Object.entries(CONFIG.EVENTS)) {
      const roleId = CONFIG.ROLES[e.roleKey];
      if (!roleId) continue;

      if (selectedKeys.includes(key)) {
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId).catch(() => {});
          added.push(e.name);
        }
      } else {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId).catch(() => {});
          removed.push(e.name);
        }
      }
    }

    let response = "Zaktualizowano role powiadomień!\n";
    if (added.length) response += `✅ **Dodano:** ${added.join(", ")}\n`;
    if (removed.length) response += `❌ **Usunięto:** ${removed.join(", ")}`;
    if (!added.length && !removed.length) response = "Brak zmian w rolach.";

    return await interaction.update({ content: response, components: [] });
  }

  if (customId === "dm_menu") {
    const db = loadDB();
    db.dm[user.id] = values;
    saveDB(db);
    return await interaction.update({ content: "✅ Pomyślnie zaktualizowano Twoje preferencje powiadomień DM!", components: [] });
  }
}

// ====================== INIT ======================
async function syncPanel(client) {
  const ch = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
  if (!ch) return;
  const msgs = await ch.messages.fetch({ limit: 10 });
  panelMessage = msgs.find(m => m.embeds[0]?.title?.includes("CENTRUM EVENTÓW"));

  if (panelMessage) await panelMessage.edit({ embeds: [buildPanelEmbed()], components: [buildButtons()] });
  else panelMessage = await ch.send({ embeds: [buildPanelEmbed()], components: [buildButtons()] });
}

function init(client) {
  syncPanel(client);
  // Sprawdza start eventu co minutę (wystarczy, bo liczniki na ekranie aktualizują się same przez Discorda)
  setInterval(() => checkEvents(client), 60000); 
  
  // Wymuszony resync panelu co 30 minut, aby upewnić się, że wszystko jest na miejscu
  setInterval(() => {
    if (panelMessage) panelMessage.edit({ embeds: [buildPanelEmbed()] }).catch(() => syncPanel(client));
  }, 30 * 60 * 1000); 
  
  console.log("👑 System Eventów VYRN aktywowany.");
}

module.exports = { init, handleEventInteraction };
