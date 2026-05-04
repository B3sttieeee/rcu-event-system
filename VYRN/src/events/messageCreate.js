// src/events/messageCreate.js
const { Events, EmbedBuilder } = require("discord.js");
const activity = require("../systems/activity");
const economy = require("../systems/economy");

// ====================== CONFIG & CACHE ======================
const COOLDOWN_TIME = 5000;
const messageCooldowns = new Map();

const THEME = {
  GOLD: "#FFD700"
};

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    try {
      // ====================== BASIC CHECKS ======================
      if (!message.guild || !message.author || message.author.bot) return;
      if (message.webhookId || message.system) return;

      let member = message.member;
      if (!member) {
        member = await message.guild.members.fetch(message.author.id).catch(() => null);
      }
      if (!member) return;

      const content = message.content.trim();
      const lower = content.toLowerCase();

      // ====================== ANTI-SPAM & REWARDS ======================
      const now = Date.now();
      const lastMsgTime = messageCooldowns.get(message.author.id) || 0;

      if (now - lastMsgTime > COOLDOWN_TIME) {
        const xpAdded = Math.floor(Math.random() * 10) + 5;
        let coinsAdded = Math.floor(Math.random() * 5) + 3;

        if (content.length > 50) coinsAdded += 2;
        if (content.length > 150) coinsAdded += 4;
        if (message.attachments.size > 0) coinsAdded += 3;
        if (message.mentions.users.size > 0) coinsAdded += 1;

        activity.addActivityXP(member, xpAdded);
        economy.addCoins(member.id, coinsAdded);
        messageCooldowns.set(message.author.id, now);
      }

      // ====================== SMART CHAT INTERACTION ======================
      const exactWords = lower.split(/\s+/);
      
      // Szansa na reakcję (20% - lepiej rzadziej a konkretniej)
      const shouldRespond = Math.random() < 0.20;

      if (shouldRespond) {
        // 1. Klanowy Pride (Zawsze mile widziane)
        if (exactWords.includes("vyrn")) {
          const vyrnQuotes = [
            "🛡️ Chwała klanowi **VYRN**!",
            "🔥 **VYRN** rośnie w siłę!",
            "👑 Najlepsi z najlepszych. #VYRN"
          ];
          return message.channel.send(vyrnQuotes[Math.floor(Math.random() * vyrnQuotes.length)]);
        }

        // 2. Gratulacje (W formie "podrzucenia" hype'u)
        if (exactWords.some(w => ["gg", "brawo", "congrats", "w"].includes(w))) {
          return message.channel.send(`> 🏆 **${member.displayName}** ma rację, dobra robota!`);
        }

        // 3. Reakcja na śmiech (Tylko jeśli to krótka wiadomość, żeby nie przerywać dyskusji)
        if (content.length < 10 && exactWords.some(w => ["xd", "lol", "haha", "lmao"].includes(w))) {
          const laughResponses = ["XDD", "Dobre!", "Też mnie to rozwaliło", "😂"];
          return message.channel.send(laughResponses[Math.floor(Math.random() * laughResponses.length)]);
        }
      }

      // 4. Bonus: Specjalne przywitanie (Raz na jakiś czas)
      if (exactWords.some(w => ["siema", "hej", "cześć", "czesc", "hello"].includes(w)) && Math.random() < 0.1) {
        return message.channel.send(`Siema **${member.displayName}**, jak tam dzionek w klanie?`);
      }

      // ====================== QUICK COMMANDS (Legacy) ======================
      const quickCmds = ["!stats", "!profile", "!level", "!rank", "staty"];
      
      if (quickCmds.includes(lower)) {
        const embed = new EmbedBuilder()
          .setColor(THEME.GOLD)
          .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
          .setDescription(`💡 Hej! Systemy klanowe zostały przeniesione na **slash commands**.\n\nWpisz **\`/profile\`**, aby zobaczyć swoje statystyki!`)
          .setFooter({ text: "VYRN Clan Intelligence" });

        return message.reply({ 
          embeds: [embed], 
          allowedMentions: { repliedUser: false } 
        });
      }

    } catch (err) {
      console.error("🔥 [MESSAGE CREATE ERROR]", err);
    }
  }
};
