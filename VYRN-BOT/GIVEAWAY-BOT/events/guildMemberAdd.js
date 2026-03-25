const { EmbedBuilder } = require("discord.js");

const WELCOME_CHANNEL = "1475559296594084007";
const AUTO_ROLE = "1475572275095929022";

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {

    try {

      // ===== AUTO ROLE =====
      const role = member.guild.roles.cache.get(AUTO_ROLE);
      if (role) await member.roles.add(role).catch(() => {});

      // ===== CHANNEL =====
      const channel = member.guild.channels.cache.get(WELCOME_CHANNEL);
      if (!channel) return;

      // ===== EMBED =====
      const embed = new EmbedBuilder()
        .setColor("#ff6600")
        .setAuthor({
          name: "VYRN SYSTEM",
          iconURL: member.guild.iconURL()
        })
        .setDescription(
`🎉 **Welcome ${member}**

📌 **1. Check rules**
<#1475526080361140344>

🔗 **2. Connect your account**
<#1475970436650237962>

🎟 **3. Join clan ticket**
<#1475558248487583805>

🔥 Good Luck!`
        )
        .setImage("https://media.discordapp.net/attachments/1475993508535074816/1476584792048013312/Fallen-Knight-in-Burning-Forest.gif")
        .setFooter({ text: "Administrations | VYRN" });

      channel.send({ embeds: [embed] });

    } catch (err) {
      console.log("❌ WELCOME ERROR:", err);
    }

  }
};
