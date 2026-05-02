const fs = require("fs").promises;
const path = require("path");
const { EmbedBuilder, Collection } = require("discord.js");

// ====================== CONFIG & STATE ======================
// Ścieżka do wolumenu Railway lub lokalnego folderu /data
const DATA_DIR = process.env.DATA_DIR || "/data";
const LEVELS_PATH = path.join(DATA_DIR, "levels.json");

const CONFIG = {
    // Kanał, na którym bot wysyła powiadomienia o awansie
    CHANNEL_ID: "1475999590716018719",
    // Czas oczekiwania na kolejną porcję XP za pisanie (60 sekund)
    XP_COOLDOWN: 60000, 
    // Zakres XP przyznawanego za wiadomość
    XP_PER_MSG: { min: 15, max: 25 },
    // XP przyznawane co minutę na kanale głosowym
    XP_PER_VOICE_MIN: 10,
    THEME: { GOLD: "#FFD700" },
    // Definicje rang - poziom, ID roli w Discordzie, nazwa i emoji
    RANKS: [
        { level: 75, roleId: "1476000992351879229", name: "Legend", emoji: "<:LegeRank:1488756343190847538>", icon: "https://i.imgur.com/akK0M5T.png" },
        { level: 60, roleId: "1476000991823532032", name: "Ruby", emoji: "<:RubyRank:1488756400514404372>", icon: "https://i.imgur.com/akK0M5T.png" },
        { level: 45, roleId: "1476000991206707221", name: "Diamond", emoji: "<:DiaxRank:1488756482924089404>", icon: "https://i.imgur.com/akK0M5T.png" },
        { level: 30, roleId: "1476000459595448442", name: "Platinum", emoji: "<:PlatRank:1488756557863845958>", icon: "https://i.imgur.com/tHDiY6h.png" },
        { level: 15, roleId: "1476000995501670534", name: "Gold", emoji: "<:GoldRank:1488756524854808686>", icon: "https://i.imgur.com/rZFNUMd.png" },
        { level: 5,  roleId: "1476000458987278397", name: "Bronze", emoji: "<:BronzeRank:1488756638285565962>", icon: "https://i.imgur.com/4SGN8tf.png" },
        { level: 0,  roleId: null,                   name: "Iron", emoji: "<:Ironrank:1488756604277887039>", icon: "https://i.imgur.com/4SGN8tf.png" }
    ]
};

// Baza danych w pamięci RAM
let db = { users: {} };
// Kolekcja do obsługi cooldownów XP dla każdego użytkownika
const xpCooldowns = new Collection();

// ====================== DATABASE ENGINE ======================

/**
 * Ładuje bazę danych z pliku JSON. Tworzy folder i plik, jeśli nie istnieją.
 */
async function loadDatabase() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const data = await fs.readFile(LEVELS_PATH, 'utf8').catch(() => '{"users":{}}');
        const parsed = JSON.parse(data);
        // Obsługa różnych struktur JSON (z kluczem users lub bez)
        db.users = parsed.users || parsed;
        console.log(`✅ [ACTIVITY] Wczytano ${Object.keys(db.users).length} profili aktywności.`);
    } catch (err) {
        console.error("❌ [ACTIVITY] Krytyczny błąd ładowania bazy danych:", err);
    }
}

/**
 * Zapisuje aktualny stan bazy danych do pliku JSON.
 */
async function saveDatabase() {
    try {
        await fs.writeFile(LEVELS_PATH, JSON.stringify({ users: db.users }, null, 2));
    } catch (err) {
        console.error("❌ [ACTIVITY] Krytyczny błąd zapisu bazy danych:", err);
    }
}

// ====================== HELPERS ======================

/**
 * Upewnia się, że użytkownik istnieje w bazie. Jeśli nie, tworzy nowy profil.
 */
function ensureUser(userId) {
    if (!db.users[userId]) {
        db.users[userId] = { 
            xp: 0, 
            level: 0, 
            totalXP: 0, 
            voiceMinutes: 0 
        };
    }
    return db.users[userId];
}

/**
 * Oblicza ilość XP wymaganą na dany poziom.
 * Wzór: 100 * (poziom + 1)^1.5
 */
const getNeededXP = (lvl) => Math.floor(100 * Math.pow(lvl + 1, 1.5));

// ====================== LOGIC ======================

/**
 * Synchronizuje role użytkownika na podstawie jego poziomu.
 * Usuwa stare rangi i dodaje aktualną.
 */
async function syncRoles(member, level) {
    // Sprawdzenie, czy bot ma uprawnienia do zarządzania członkiem
    if (!member || !member.manageable) return;

    // Znalezienie najwyższej możliwej rangi dla danego poziomu
    const currentRank = CONFIG.RANKS.find(r => level >= r.level);
    // Pobranie wszystkich ID ról zdefiniowanych w systemie
    const allRankIds = CONFIG.RANKS.map(r => r.roleId).filter(id => id);

    try {
        // 1. Znalezienie i usunięcie ról, których użytkownik nie powinien już mieć
        const toRemove = allRankIds.filter(id => id !== currentRank?.roleId && member.roles.cache.has(id));
        if (toRemove.length > 0) {
            await member.roles.remove(toRemove);
        }

        // 2. Dodanie aktualnej roli, jeśli użytkownik jej nie posiada
        if (currentRank?.roleId && !member.roles.cache.has(currentRank.roleId)) {
            await member.roles.add(currentRank.roleId);
        }
    } catch (e) {
        console.warn(`⚠️ [ROLES] Nie udało się zsynchronizować ról dla ${member.user.tag}: ${e.message}`);
    }
}

/**
 * Główna funkcja dodająca XP. Uwzględnia mnożniki z systemu boostów.
 */
async function addXP(member, amount) {
    if (!member || member.user.bot) return;

    // --- INTEGRACJA Z SYSTEMEM BOOSTÓW (Dynamiczny Import) ---
    let multiplier = 1;
    try {
        // Importujemy boosty tutaj, aby uniknąć błędów zapętlenia (Circular Dependency)
        const boostSystem = require("../boost"); 
        multiplier = boostSystem.getCurrentBoost(member.id) || 1;
    } catch (e) {
        // Jeśli system boostów nie istnieje lub błąd, mnożnik zostaje 1
    }

    const finalAmount = Math.floor(amount * multiplier);
    const userData = ensureUser(member.id);

    userData.xp += finalAmount;
    userData.totalXP += finalAmount;

    let leveledUp = false;
    // Sprawdzanie awansu (obsługuje przeskoczenie kilku poziomów naraz)
    while (userData.xp >= getNeededXP(userData.level)) {
        userData.xp -= getNeededXP(userData.level);
        userData.level++;
        leveledUp = true;
    }

    if (leveledUp) {
        await syncRoles(member, userData.level);
        await notifyLevelUp(member, userData.level);
    }
}

/**
 * Wysyła powiadomienie o awansie na dedykowany kanał.
 */
async function notifyLevelUp(member, newLevel) {
    const channel = member.guild.channels.cache.get(CONFIG.CHANNEL_ID);
    if (!channel) return;

    const rank = CONFIG.RANKS.find(r => newLevel >= r.level);
    
    const embed = new EmbedBuilder()
        .setColor(CONFIG.THEME.GOLD)
        .setTitle("✨ AWANS W HIERARCHII")
        .setAuthor({ name: member.guild.name, iconURL: member.guild.iconURL() })
        .setDescription(
            `Gratulacje ${member}! Właśnie awansowałeś na **${newLevel} Poziom**!\n\n` +
            `Twoja aktualna ranga: ${rank.emoji} **${rank.name}**`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Vyrn System • Gratulujemy postępu", iconURL: member.user.displayAvatarURL() })
        .setTimestamp();

    try {
        await channel.send({ content: `🎊 Brawo ${member}!`, embeds: [embed] });
    } catch (e) {
        console.error("❌ [ACTIVITY] Błąd wysyłania powiadomienia o Level Up:", e);
    }
}

// ====================== EXPORTS & INITIALIZATION ======================

module.exports = {
    /**
     * Inicjalizuje system, ładuje bazę i ustawia listenery oraz interwały.
     */
    init: (client) => {
        loadDatabase();
        
        // Zapis bazy danych co 60 sekund
        setInterval(saveDatabase, 60000);

        // --- OBSŁUGA XP ZA WIADOMOŚCI ---
        client.on("messageCreate", async (msg) => {
            if (msg.author.bot || !msg.guild) return;

            // Sprawdzenie cooldownu użytkownika
            const lastXP = xpCooldowns.get(msg.author.id) || 0;
            if (Date.now() - lastXP < CONFIG.XP_COOLDOWN) return;

            // Ustawienie nowego czasu cooldownu i przyznanie losowego XP
            xpCooldowns.set(msg.author.id, Date.now());
            const randomXP = Math.floor(Math.random() * (CONFIG.XP_PER_MSG.max - CONFIG.XP_PER_MSG.min + 1)) + CONFIG.XP_PER_MSG.min;
            
            await addXP(msg.member, randomXP);
        });

        // --- OBSŁUGA XP ZA KANAŁY GŁOSOWE ---
        // Pętla sprawdzająca aktywność na Voice co 60 sekund
        setInterval(() => {
            client.guilds.cache.forEach(guild => {
                guild.voiceStates.cache.forEach(async (vs) => {
                    // Warunki przyznania XP: nie bot, połączony z kanałem, nie wyciszony, nie ogłuszony
                    if (vs.member && !vs.member.user.bot && vs.channelId && !vs.mute && !vs.deaf) {
                        const userData = ensureUser(vs.id);
                        userData.voiceMinutes += 1;
                        await addXP(vs.member, CONFIG.XP_PER_VOICE_MIN);
                    }
                });
            });
        }, 60000);

        console.log("👑 [VYRN] Clan Activity & Leveling System Loaded!");
    },

    /**
     * Zwraca sformatowane dane gotowe do przesłania do CardGeneratora.
     */
    getCardData: async (member) => {
        const userData = ensureUser(member.id);
        const needed = getNeededXP(userData.level);
        const rank = CONFIG.RANKS.find(r => userData.level >= r.level) || CONFIG.RANKS[CONFIG.RANKS.length - 1];
        
        // Pobieramy monety z systemu ekonomii
        let coins = 0;
        try {
            // Dynamiczny import ekonomii
            const economy = require("../economy");
            coins = economy.getBalance(member.id) || 0;
        } catch(e) {
            // Jeśli system ekonomii nie zwróci danych, zostaje 0
        }

        return {
            title: member.user.username,
            subtitle: `${rank.name.toUpperCase()} RANK`,
            avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 256 }),
            rankUrl: rank.icon, // Pobiera ikonę PNG z konfiguracji rang
            stats: [
                { label: "LVL", value: userData.level.toString() },
                { label: "VAULT", value: coins.toLocaleString() },
                { label: "TOTAL XP", value: userData.totalXP.toLocaleString() }
            ],
            // Procent postępu do paska (0.0 - 1.0)
            progress: userData.xp / needed,
            progressText: `${userData.xp.toLocaleString()} / ${needed.toLocaleString()} XP`
        };
    }
};