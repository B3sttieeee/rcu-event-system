// src/events/memberjoinlog.js
const { Events, EmbedBuilder } = require("discord.js");
const { LOGS, sendLog } = require("../systems/log");

module.exports = {
  name: Events.GuildMemberAdd,
  
  async execute(member) {
    if (!member || !member.guild) return;

    const isBot = member.user.bot;
    const createdUnix = Math.floor(member.user.createdTimestamp / 1000);

    // Dynamiczne kolory: Złoty dla botów, Zielony dla zwykłych graczy
    const embedColor = isBot ? "#FFD700" : "#00FF7F"; 
    const embedTitle = isBot ? "🤖 VYRN LOG • BOT ADDED" : "📥 VYRN LOG • MEMBER JOINED";
    const embedDesc = isBot ? "**A new bot has been added to the server.**" : "**A new user has joined the server.**";

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setAuthor({ 
        name: embedTitle, 
        iconURL: member.guild.iconURL({ dynamic: true }) 
      })
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(embedDesc)
      .addFields(
        { name: "👤 User", value: `${member} (\`${member.user.tag}\`)`, inline: true },
        { name: "🆔 ID", value: `\`${member.id}\``, inline: true },
        { name: "🤖 Bot", value: isBot ? "✅ Yes" : "❌ No", inline: true },
        { name: "📅 Account Created", value: `<t:${createdUnix}:R> (<t:${createdUnix}:f>)`, inline: false },
        { name: "👥 Total Members", value: `\`${member.guild.memberCount}\``, inline: false }
      )
      .setFooter({ text: "Official VYRN Log System" })
      .setTimestamp();

    // Dodatkowe ostrzeżenie dla administracji, gdy wbija bot
    if (isBot) {
      embed.addFields({ 
        name: "⚠️ Security Notice", 
        value: "> Please verify if this bot was added intentionally by an authorized administrator." 
      });
    }

    // Wysyłanie loga na kanał JOIN_LEAVE
    await sendLog(member.guild, LOGS.JOIN_LEAVE, embed);
  }
};
