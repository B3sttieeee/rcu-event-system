const fs = require("fs").promises;
const path = require("path");
const { EmbedBuilder, Collection } = require("discord.js");

// ====================== CONFIG & STATE ======================
const DATA_DIR = process.env.DATA_DIR || "/data";
const LEVELS_PATH = path.join(DATA_DIR, "levels.json");

const CONFIG = {
    CHANNEL_ID: "1475999590716018719",
    XP_COOLDOWN: 60000, 
    XP_PER_MSG: { min: 15, max: 25 },
    XP_PER_VOICE_MIN: 10,
    THEME: { GOLD: "#FFD700" },
    RANKS: [
        { level: 75, roleId: "1476000992351879229", name: "Legend", emoji: "<:LegeRank:1488756343190847538>" },
        { level: 60, roleId: "1476000991823532032", name: "Ruby", emoji: "<:RubyRank:1488756400514404372>" },
        { level: 45, roleId: "1476000991206707221", name: "Diamond", emoji: "<:DiaxRank:1488756482924089404>" },
        { level: 30, roleId: "1476000459595448442", name: "Platinum", emoji: "<:PlatRank:1488756557863845958>" },
        { level: 15, roleId: "1476000995501670534", name: "Gold", emoji: "<:GoldRank:1488756524854808686>" },
        { level: 5,  roleId: "1476000458987278397", name: "Bronze", emoji: "<:BronzeRank:1488756638285565962>" },
        { level: 0,  roleId: null,                   name: "Iron", emoji: "<:Ironrank:1488756604277887039>" }
    ]
};

let db = { users: {} };
const xpCooldowns = new Collection();

// ====================== DATABASE ENGINE ======================

async function loadDatabase() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const data = await fs.readFile(LEVELS_PATH, 'utf8').catch(() => '{"users":{}}');
        const parsed = JSON.parse(data);
        db.users = parsed.users || parsed;
        console.log(`✅ [ACTIVITY] Wczytano ${Object.keys(db.users).length} profili.`);
    } catch (err) {
        console.error("❌ [ACTIVITY] Błąd bazy:", err);
    }
}

async function saveDatabase() {
    try {
        await fs.writeFile(LEVELS_PATH, JSON.stringify({ users: db.users }, null, 2));
    } catch (err) {
        console.error("❌ [ACTIVITY] Błąd zapisu:", err);
    }
}

// ====================== HELPERS ======================

function ensureUser(userId) {
    if (!db.users[userId]) {
        db.users[userId] = { xp: 0, level: 0, totalXP: 0, voiceMinutes: 0 };
    }
    return db.users[userId];
}

const getNeededXP = (lvl) => Math.floor(100 * Math.pow(lvl + 1, 1.5));

// ====================== LOGIC ======================

async function syncRoles(member, level) {
    if (!member || !member.manageable) return;

    const currentRank = CONFIG.RANKS.find(r => level >= r.level);
    const allRankIds = CONFIG.RANKS.map(r => r.roleId).filter(id => id);

    try {
        // Usuń wszystkie rangi rankingowe, których gracz nie powinien mieć
        const toRemove = allRankIds.filter(id => id !== currentRank?.roleId && member.roles.cache.has(id));
        if (toRemove.length) await member.roles.remove(toRemove);

        // Dodaj obecną rangę
        if (currentRank?.roleId && !member.roles.cache.has(currentRank.roleId)) {
            await member.roles.add(currentRank.roleId);
        }
    } catch (e) {
        console.warn(`[ROLES] Synchronizacja nieudana dla ${member.user.tag}`);
    }
}

async function addXP(member, amount) {
    if (!member || member.user.bot) return;

    // --- INTEGRACJA Z SYSTEMEM BOOSTÓW ---
    let multiplier = 1;
    try {
        const boostSystem = require("../boost"); // Ścieżka do Twojego poprawionego systemu boost
        multiplier = boostSystem.getCurrentBoost(member.id);
    } catch (e) {}

    const finalAmount = Math.floor(amount * multiplier);
    const userData = ensureUser(member.id);

    userData.xp += finalAmount;
    userData.totalXP += finalAmount;

    let leveledUp = false;
    while (userData.xp >= getNeededXP(userData.level)) {
        userData.xp -= getNeededXP(userData.level);
        userData.level++;
        leveledUp = true;
    }

    if (leveledUp) {
        await syncRoles(member, userData.level);
        notifyLevelUp(member, userData.level);
    }
}

async function notifyLevelUp(member, newLevel) {
    const channel = member.guild.channels.cache.get(CONFIG.CHANNEL_ID);
    if (!channel) return;

    const rank = CONFIG.RANKS.find(r => newLevel >= r.level);
    const embed = new EmbedBuilder()
        .setColor(CONFIG.THEME.GOLD)
        .setTitle("✨ AWANS W HIERARCHII")
        .setDescription(`Gratulacje ${member}! Wbiłeś **${newLevel} poziom**!\nObecna ranga: ${rank.emoji} **${rank.name}**`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

    channel.send({ content: `🎊 Brawo ${member}!`, embeds: [embed] }).catch(() => {});
}

// ====================== EXPORTS ======================

module.exports = {
    init: (client) => {
        loadDatabase();
        setInterval(saveDatabase, 60000);

        client.on("messageCreate", async (msg) => {
            if (msg.author.bot || !msg.guild) return;
            const lastXP = xpCooldowns.get(msg.author.id) || 0;
            if (Date.now() - lastXP < CONFIG.XP_COOLDOWN) return;

            xpCooldowns.set(msg.author.id, Date.now());
            const randomXP = Math.floor(Math.random() * (CONFIG.XP_PER_MSG.max - CONFIG.XP_PER_MSG.min + 1)) + CONFIG.XP_PER_MSG.min;
            await addXP(msg.member, randomXP);
        });

        setInterval(() => {
            client.guilds.cache.forEach(guild => {
                guild.voiceStates.cache.forEach(async (vs) => {
                    if (vs.member && !vs.member.user.bot && vs.channelId && !vs.mute && !vs.deaf) {
                        const userData = ensureUser(vs.id);
                        userData.voiceMinutes += 1;
                        await addXP(vs.member, CONFIG.XP_PER_VOICE_MIN);
                    }
                });
            });
        }, 60000);
    },

    // TE DANE LECĄ PROSTO DO TWOJEGO CARDGENERATORA
    getCardData: async (member) => {
        const userData = ensureUser(member.id);
        const needed = getNeededXP(userData.level);
        const rank = CONFIG.RANKS.find(r => userData.level >= r.level);
        
        // Pobieramy monety z Twojej ekonomii (zakładając ścieżkę)
        let coins = 0;
        try {
            const economy = require("../economy");
            coins = economy.getBalance(member.id);
        } catch(e) {}

        return {
            title: member.user.username,
            subtitle: `${rank.name.toUpperCase()} RANK`,
            avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 256 }),
            rankUrl: null, // Tu możesz przypisać URL do ikon rangi jeśli masz
            stats: [
                { label: "LVL", value: userData.level.toString() },
                { label: "VAULT", value: coins.toLocaleString() },
                { label: "XP", value: userData.totalXP.toLocaleString() }
            ],
            progress: userData.xp / needed,
            progressText: `${userData.xp.toLocaleString()} / ${needed.toLocaleString()} XP`
        };
    }
};