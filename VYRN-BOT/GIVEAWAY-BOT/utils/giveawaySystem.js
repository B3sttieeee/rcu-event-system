const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const fs = require("fs").promises;
const path = require("path");

// ====================== CONFIG ======================
const DATA_DIR = "./data";
const DB_PATH = path.join(DATA_DIR, "giveaways.json");
const BONUS_ROLES = {
  "1476000458987278397": 1,
  "1476000995501670534": 3,
  "1476000459595448442": 5,
  "1476000991206707221": 7,
  "1476000991823532032": 10,
  "1476000992351879229": 15
};
const REQUIRED_ROLE_TO_CREATE = "1476000458987278397";

// ====================== DATABASE ======================
const giveaways = new Map();

/**
 * Używamy async/await do zapisu i odczytu plików (zamiast fs.existsSync).
 */
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch (err) {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (mkdirErr) {
      console.error("❌ Błąd tworzenia katalogu danych:", mkdirErr.message);
    }
  }
}

/**
 * Ładuje dane z pliku giveaways.json.
 */
async function loadDB() {
  try {
    await ensureDataDir();
    if (!(await fs.exists(DB_PATH))) {
      await fs.writeFile(DB_PATH, JSON.stringify({}, null, 2));
      return {};
    }

    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("❌ Błąd odczytu giveaways.json:", err.message);
    return {};
  }
}

/**
 * Zapisuje dane do pliku giveaways.json.
 */
async function saveDB() {
  try {
    const data = Object.fromEntries(giveaways);
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Błąd zapisu giveaways.json:", err.message);
  }
}

// ====================== LOAD & RESUME ======================
/**
 * Ładuje dane giveaway i wznawia aktywne.
 */
async function loadGiveaways(client) {
  try {
    const data = await loadDB();
    giveaways.clear();
    for (const [messageId, giveawayData] of Object.entries(data)) {
      giveaways.set(messageId, giveawayData);
      if (!giveawayData.ended) {
        resumeGiveaway(client, messageId);
      }
    }

    console.log(`🎁 Załadowano ${giveaways.size} giveawayów`);
  } catch (err) {
    console.error("❌ Błąd ładowania giveawayów:", err.message);
  }
}

/**
 * Wznawia giveaway po ponownym uruchomieniu bota.
 */
async function resumeGiveaway(client, messageId) {
  try {
    const data = giveaways.get(messageId);
    if (!data || data.ended) return;

    const channel = await client.channels.fetch(data.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (message) startTimer(message);
  } catch (err) {
    console.error("❌ Błąd przy wznawianiu giveawaya:", err.message);
  }
}

// ====================== HELPERS ======================
/**
 * Parsuje czas z formatu np. "10m", "2h".
 */
function parseTime(timeStr) {
  const match = timeStr.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case "s": return num * 1000;
    case "m": return num * 60000;
    case "h": return num * 3600000;
    case "d": return num * 86400000;
  }
  return null;
}

/**
 * Zlicza uczestników z uwzględnieniem bonusów.
 */
function getEntries(member) {
  try {
    let entries = 1;
    for (const [roleId, bonus] of Object.entries(BONUS_ROLES)) {
      if (member.roles.cache.has(roleId)) entries += bonus;
    }
    return entries;
  } catch (err) {
    console.error("❌ Błąd przy obliczaniu boostów:", err.message);
    return 1;
  }
}

/**
 * Formatuje czas do zakończenia giveawayu.
 */
function formatTimeLeft(ms) {
  try {
    if (ms < 0) return "0s";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  } catch (err) {
    console.error("❌ Błąd formatowania czasu:", err.message);
    return "0s";
  }
}

/**
 * Buduje bardziej estetyczny embed z danymi giveaway.
 */
function buildEmbed(data) {
  try {
    const timeLeft = Math.max(0, data.end - Date.now());

    // Oblicz liczbę uczestników
    let totalEntries = 0;
    if (data.users && Array.isArray(data.users)) {
      totalEntries = data.users.length;
    }

    const embed = new EmbedBuilder()
      .setColor(data.ended ? "#ef4444" : "#10b981")
      .setTitle(`🎉 ${data.prize}`)
      .setDescription(data.description || "Kliknij przycisk poniżej, aby dołączyć!")
      .setThumbnail("https://cdn.discordapp.com/attachments/1275632154075225907/1275632158684650516.png")
      .addFields(
        { name: "🏆 Liczba zwycięzców", value: `\`${data.winners}\``, inline: true },
        { name: "👥 Liczba uczestników", value: `\`${totalEntries}\``, inline: true },
        { name: "⏳ Czas do końca", value: `\`${formatTimeLeft(timeLeft)}\``, inline: true }
      );

    // Dodaj informacje o boostach
    if (Object.keys(BONUS_ROLES).length > 0) {
      embed.addFields({
        name: "🎟 System Boostów",
        value: Object.entries(BONUS_ROLES)
          .map(([r, b]) => `<@&${r}> → **+${b}**`)
          .join("\n"),
        inline: false
      });
    }

    embed.setFooter({ 
      text: `VYRN • Giveaway System | Organizator: <@${data.hostId}>`, 
      iconURL: "https://cdn.discordapp.com/attachments/1275632154075225907/1275632158684650516.png"
    })
      .setTimestamp();

    return embed;
  } catch (err) {
    console.error("❌ Błąd budowania embedu:", err.message);
    // Zwróć podstawowy embed w przypadku błędu
    return new EmbedBuilder()
      .setColor("#ef4444")
      .setTitle("❌ Błąd systemu giveaway")
      .setDescription("Wystąpił błąd podczas wyświetlania informacji o giveaway.")
      .setTimestamp();
  }
}

// ====================== CREATE ======================
/**
 * Tworzy nowy giveaway.
 */
async function createGiveaway(interaction, options) {
  try {
    // Walidacja wejściowych opcji
    if (!options.prize || !options.time) {
      await interaction.reply({ content: "❌ Wymagane są nagroda i czas (np. 10m).", ephemeral: true });
      return;
    }

    const duration = parseTime(options.time);
    if (!duration) throw new Error("Nieprawidłowy format czasu!");

    const giveawayData = {
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      prize: options.prize,
      winners: parseInt(options.winners) || 1,
      end: Date.now() + duration,
      users: [],
      ended: false,
      hostId: interaction.user.id,
      description: options.description || null,
      requiredRole: options.requiredRole || null,
      createdAt: Date.now()
    };

    // Zwaliduj liczbę zwycięzców
    if (giveawayData.winners <= 0) {
      giveawayData.winners = 1;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("gw_join").setLabel("🎟 Dołącz").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("gw_leave").setLabel("❌ Wypisz się").setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.channel.send({
      embeds: [buildEmbed(giveawayData)],
      components: [row]
    });

    giveawayData.messageId = msg.id;
    giveaways.set(msg.id, giveawayData);
    await saveDB();
    startTimer(msg);

    // Logowanie
    console.log(`✅ Użytkownik ${interaction.user.id} utworzył giveaway ID: ${msg.id}`);

    await interaction.reply({ content: `✅ Giveaway utworzony! ID: \`${msg.id}\``, ephemeral: true });
  } catch (err) {
    console.error("❌ Błąd tworzenia giveawaya:", err.message);
    try {
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas tworzenia giveawaya.",
        ephemeral: true
      });
    } catch (replyErr) {
      console.error("❌ Błąd odpowiedzi na komendę:", replyErr.message);
    }
  }
}

// ====================== TIMER ======================
function startTimer(message) {
  try {
    const interval = setInterval(async () => {
      try {
        const data = giveaways.get(message.id);
        if (!data || data.ended) {
          clearInterval(interval);
          return;
        }

        if (Date.now() >= data.end) {
          console.log(`[TIMER] Czas minął → kończę giveaway ${message.id}`);
          data.ended = true;
          clearInterval(interval);
          await endGiveaway(message, data);
          return;
        }

        // Aktualizuj embed co 5 sekund
        try {
          await message.edit({ embeds: [buildEmbed(data)] });
        } catch (err) {
          console.error("❌ Błąd edycji embedu:", err.message);
        }
      } catch (err) {
        console.error("❌ Błąd w timerze:", err.message);
        clearInterval(interval);
      }
    }, 5000);

    console.log(`[TIMER] Uruchomiono timer dla giveawaya ${message.id}`);
  } catch (err) {
    console.error("❌ Błąd uruchamiania timera:", err.message);
  }
}

// ====================== END GIVEAWAY ======================
async function endGiveaway(message, data) {
  try {
    data.ended = true;
    await saveDB();

    if (!data.users || data.users.length === 0) {
      await message.channel.send("❌ Giveaway zakończony – brak uczestników.").catch(err => {
        console.error("❌ Błąd wysyłania wiadomości:", err.message);
      });
      return;
    }

    const guild = await message.guild.fetch().catch(() => null);
    if (!guild) {
      await message.channel.send("❌ Nie mogę pobrać informacji o serwerze.").catch(err => {
        console.error("❌ Błąd wysyłania wiadomości:", err.message);
      });
      return;
    }

    let weightedUsers = [];
    const userPromises = data.users.map(async userId => {
      try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          const entries = getEntries(member);
          for (let i = 0; i < entries; i++) {
            weightedUsers.push(userId);
          }
        }
      } catch (err) {
        console.error("❌ Błąd pobierania uczestnika:", err.message);
      }
    });

    await Promise.all(userPromises);

    if (weightedUsers.length === 0) {
      await message.channel.send("❌ Brak ważnych uczestników do losowania.").catch(err => {
        console.error("❌ Błąd wysyłania wiadomości:", err.message);
      });
      return;
    }

    const winners = [];
    const uniqueWinners = new Set();

    let attempts = 0;
    const maxAttempts = weightedUsers.length * 2;

    while (winners.length < data.winners && weightedUsers.length > 0 && attempts < maxAttempts) {
      attempts++;
      const randomIndex = Math.floor(Math.random() * weightedUsers.length);
      const winnerId = weightedUsers[randomIndex];

      if (!uniqueWinners.has(winnerId)) {
        uniqueWinners.add(winnerId);
        winners.push(winnerId);
        weightedUsers.splice(randomIndex, 1); // Usuń wylosowanego uczestnika
      } else {
        weightedUsers.splice(randomIndex, 1);
      }
    }

    if (winners.length === 0) {
      await message.channel.send("❌ Nie udało się wylosować zwycięzców.").catch(err => {
        console.error("❌ Błąd wysyłania wiadomości:", err.message);
      });
      return;
    }

    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
    const winnerCount = winners.length;

    const endEmbed = new EmbedBuilder()
      .setColor("#10b981")
      .setTitle("🎉 Giveaway Zakończony!")
      .setDescription(`**Nagroda:** ${data.prize}\n\n**Zwycięzcy:** ${winnerMentions}`)
      .addFields(
        { name: "🏆 Liczba zwycięzców", value: `\`${winnerCount}\``, inline: true },
        { name: "👥 Całkowita liczba uczestników", value: `\`${data.users.length}\``, inline: true }
      )
      .setFooter({
        text: `VYRN • Giveaway System | Organizator: <@${data.hostId}>`,
        iconURL: "https://cdn.discordapp.com/attachments/1275632154075225907/1275632158684650516.png"
      })
      .setTimestamp();

    await message.channel.send({ embeds: [endEmbed] }).catch(err => {
      console.error("❌ Błąd wysyłania wiadomości z wynikami:", err.message);
    });

    // Wyłącz przyciski
    try {
      await message.edit({ components: [] });
    } catch (err) {
      console.error("❌ Błąd edycji komponentów:", err.message);
    }

    console.log(`[GIVEAWAY] Zakończono giveaway z ${winners.length} zwycięzcami`);

  } catch (err) {
    console.error("❌ Błąd kończenia giveawaya:", err.message);
    try {
      await message.channel.send("❌ Wystąpił błąd podczas kończenia giveawaya.").catch(() => {});
    } catch (sendErr) {
      console.error("❌ Błąd wysyłania wiadomości o błędzie:", sendErr.message);
    }
  }
}

// ====================== REROLL ======================
async function reroll(client, messageId) {
  try {
    console.log(`[REROLL] === ROZPOCZYNAM REROLL DLA ID: ${messageId} ===`);

    let data = giveaways.get(messageId);

    if (!data) {
      console.log(`[REROLL] Szukam w giveaways.json...`);
      const allData = await loadDB();
      data = allData[messageId];
      console.log(`[REROLL] W pliku JSON: ${data ? "✅ ZNALEZIONO" : "❌ NIE ZNALEZIONO"}`);
    }

    if (!data) {
      console.log(`[REROLL] ❌ GIVEAWAY CAŁKOWICIE NIE ZNALEZIONY!`);
      return "❌ Giveaway o podanym ID nie został znaleziony.";
    }

    console.log(`[REROLL] Dane giveawayu → ended: ${data.ended} | users: ${data.users?.length || 0} | guildId: ${data.guildId}`);

    if (!data.ended && Date.now() >= data.end) {
      data.ended = true;
      await saveDB();
      console.log(`[REROLL] ✅ Automatycznie oznaczono jako ended`);
    }

    if (!data.ended) return "❌ Ten giveaway jeszcze się nie zakończył!";

    if (!data.users || data.users.length === 0) {
      return "❌ Brak uczestników do rerolla.";
    }

    const guild = await client.guilds.fetch(data.guildId).catch(() => null);
    if (!guild) return "❌ Nie mogę znaleźć serwera.";

    let weightedUsers = [];
    const userPromises = data.users.map(async userId => {
      try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          const entries = getEntries(member);
          for (let i = 0; i < entries; i++) {
            weightedUsers.push(userId);
          }
        }
      } catch (err) {
        console.error("❌ Błąd pobierania uczestnika:", err.message);
      }
    });

    await Promise.all(userPromises);

    if (weightedUsers.length === 0) return "❌ Żaden uczestnik nie jest już na serwerze.";

    const randomIndex = Math.floor(Math.random() * weightedUsers.length);
    const winnerId = weightedUsers[randomIndex];

    console.log(`[REROLL] ✅ Sukces - wylosowano: ${winnerId}`);

    return `🎉 **Reroll!** Nowy zwycięzca:\n<@${winnerId}>`;

  } catch (err) {
    console.error("❌ Błąd rerolla:", err.message);
    return "❌ Wystąpił błąd podczas rerolla.";
  }
}

// ====================== BUTTON HANDLER ======================
async function handleGiveaway(interaction) {
  try {
    const data = giveaways.get(interaction.message.id);
    if (!data || data.ended) {
      return interaction.reply({ content: "❌ Ten giveaway jest już zakończony.", ephemeral: true });
    }

    const userId = interaction.user.id;

    if (interaction.customId === "gw_join") {
      if (data.users.includes(userId)) return interaction.reply({ content: "✅ Już bierzesz udział!", ephemeral: true });

      if (data.requiredRole && !interaction.member.roles.cache.has(data.requiredRole)) {
        return interaction.reply({ content: "❌ Nie posiadasz wymaganej roli.", ephemeral: true });
      }

      data.users.push(userId);
      await saveDB();
      await interaction.reply({ content: "🎟 Dołączyłeś do giveaway!", ephemeral: true });
    }

    if (interaction.customId === "gw_leave") {
      if (!data.users.includes(userId)) return interaction.reply({ content: "❌ Nie brałeś udziału.", ephemeral: true });
      data.users = data.users.filter(id => id !== userId);
      await saveDB();
      await interaction.reply({ content: "❌ Wypisałeś się z giveaway.", ephemeral: true });
    }

    // Aktualizuj embed
    try {
      await interaction.message.edit({ embeds: [buildEmbed(data)] });
    } catch (err) {
      console.error("❌ Błąd edycji embedu:", err.message);
    }

  } catch (err) {
    console.error("❌ Błąd handlera giveawaya:", err.message);
    try {
      await interaction.reply({ content: "❌ Wystąpił błąd podczas obsługi przycisku.", ephemeral: true });
    } catch (replyErr) {
      console.error("❌ Błąd odpowiedzi na interakcję:", replyErr.message);
    }
  }
}

// ====================== EXPORTS ======================
/**
 * @typedef {Object} GiveawayOptions
 * @property {string} prize - Nagroda w giveawayie.
 * @property {string} time - Czas trwania (np. "10m", "2h").
 * @property {number} [winners=1] - Liczba zwycięzców.
 * @property {string} [description] - Opis giveawayu.
 * @property {string} [requiredRole] - Rola wymagana do udziału.
 */

/**
 * Tworzy nowy giveaway.
 *
 * @param {Interaction} interaction
 * @param {GiveawayOptions} options - Opcje giveawayu.
 */
module.exports = {
  createGiveaway,
  handleGiveaway,
  reroll,
  loadGiveaways,
  resumeGiveaway,
  endGiveaway
};
