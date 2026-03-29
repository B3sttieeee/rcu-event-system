const { EmbedBuilder } = require("discord.js");
const { getConfig } = require("../utils/configSystem");

module.exports = {
  name: "guildMemberAdd",

  async execute(member) {
    try {
      console.log(`👤 New member: ${member.user.tag}`);

      const config = getConfig(member.guild.id);

      const WELCOME_CHANNEL = config.welcomeChannel;
      const AUTO_ROLE = config.autoRole;
      const LOG_CHANNEL = config.logChannel;

      // ===== AUTO ROLE =====
      if (AUTO_ROLE) {
        const role = member.guild.roles.cache.get(AUTO_ROLE);

        if (role) {
          await member.roles.add(role).catch(err => {
            console.log("❌ ROLE ERROR:", err);
          });
        } else {
          console.log("❌ Role not found");
        }
      }

      // ===== WELCOME CHANNEL =====
      if (WELCOME_CHANNEL) {
        const channel = member.guild.channels.cache.get(WELCOME_CHANNEL);

        if (!channel) {
          console.log("❌ Welcome channel not found");
        } else {

          const embed = new EmbedBuilder()
            .setColor("#b8a672")
            .setAuthor({
              name: "VYRN CLAN",
              iconURL: member.guild.iconURL()
            })
            .setDescription(
`🎉 **Welcome ${member}**

📌 **1. Check rules**
<#1475526080361140344>

🔗 **2. Connect your account with Blox Link /verify**
<#1475970436650237962>

🎟 **3. If u want Join to clan create ticket!!**
<#1475558248487583805>

🔥 Good Luck!`
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setImage("https://media.discordapp.net/attachments/1475993709240778904/1486898592491896882/ezgif.com-video-to-gif-converter.gif")
            .setFooter({ text: "Administrations | VYRN" });

          await channel.send({ embeds: [embed] });

          console.log("✅ Welcome sent");
        }
      }

      // ===== LOG CHANNEL =====
      if (LOG_CHANNEL) {
        const log = member.guild.channels.cache.get(LOG_CHANNEL);

        if (log) {
          const logEmbed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({
              name: "Member Joined",
              iconURL: member.user.displayAvatarURL()
            })
            .setDescription(
              `${member} **${member.user.tag}**\n\n` +
              `📅 Account Age: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
              `🆔 ID: ${member.id}`
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

          await log.send({ embeds: [logEmbed] });
        } else {
          console.log("❌ Log channel not found");
        }
      }

    } catch (err) {
      console.log("❌ WELCOME ERROR:", err);
    }
  }
};
