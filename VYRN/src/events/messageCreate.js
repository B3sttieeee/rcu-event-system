// src/events/messageCreate.js
const { Events, EmbedBuilder } = require("discord.js");
const activity = require("../systems/activity");
const economy = require("../systems/economy");

// ====================== CONFIG & CACHE ======================
const COOLDOWN_TIME = 5000; // 5 sekund cooldownu (zapobiega spamowaniu XP/Monet)
const messageCooldowns = new Map(); // Przechowuje czas ostatniej wiadomości gracza

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

      // Jeśli minęło wystarczająco dużo czasu od ostatniej wiadomości (Cooldown)
      if (now - lastMsgTime > COOLDOWN_TIME) {
        // Losowa ilość XP i Monet (wygląda to naturalniej niż stałe "5")
        const xpAdded = Math.floor(Math.random() * 10) + 5;  // Od 5 do 14 XP
        let coinsAdded = Math.floor(Math.random() * 5) + 3;  // Od 3 do 7 Monet

        // Bonusy za jakość wiadomości
        if (content.length > 50) coinsAdded += 2;
        if (content.length > 150) coinsAdded += 4;
        if (message.attachments.size > 0) coinsAdded += 3; // Bonus za wysłanie zdjęcia/filmu
        if (message.mentions.users.size > 0) coinsAdded += 1; // Bonus za oznaczenie kogoś

        // Przydzielanie nagród
        activity.addActivityXP(member, xpAdded);
        economy.addCoins(member.id, coinsAdded);

        // Zapisz czas wiadomości, aby zresetować cooldown
        messageCooldowns.set(message.author.id, now);
      }

      // ====================== AUTO RESPONSES (Instead of Reactions) ======================
      const exactWords = lower.split(/\s+/);
      const responseChance = 0.4; // 40% szans na odpowiedź, żeby bot nie był zbyt namolny

      if (Math.random() < responseChance) {
        // Easter Egg: Klan VYRN
        if (exactWords.includes("vyrn")) {
          return message.channel.send("👑 **VYRN on top!** Chwała klanowi!").catch(() => {});
        }
        
        // Gratulacje i GG
        if (lower.includes("gg") || lower.includes("good game")) {
          return message.channel.send("Dobra gierka, gratulacje! 👏").catch(() => {});
        }
        
        if (exactWords.some(w => ["congrats", "gratz", "w", "brawo"].includes(w))) {
          return message.channel.send("Wielkie brawa! 🎉").catch(() => {});
        }
        
        // Śmiech
        if (exactWords.some(w => ["lmao", "lol", "xd", "haha"].includes(w))) {
          const laughs = ["Haha, niezłe! 😂", "Dobre xd", "Padłem! 💀"];
          const randomLaugh = laughs[Math.floor(Math.random() * laughs.length)];
          return message.channel.send(randomLaugh).catch(() => {});
        }
      }

      // ====================== QUICK COMMANDS (Legacy) ======================
      // Szybkie przekierowanie, jeśli ktoś próbuje używać starych prefiksów (np. !stats)
      const quickCmds = ["!stats", "!profile", "!level", "!rank", "staty"];
      
      if (quickCmds.includes(lower)) {
        const embed = new EmbedBuilder()
          .setColor(THEME.GOLD)
          .setDescription(`📊 **${member.user.username}**, please use the **\`/profile\`** slash command to view your full VYRN Clan statistics!`)
          .setFooter({ text: "VYRN Clan System" });

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
