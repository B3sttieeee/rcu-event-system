const { EmbedBuilder } = require("discord.js");

const WELCOME_CHANNEL = "1475559296594084007";
const AUTO_ROLE = "1475572275095929022";

module.exports = {
  name: "guildMemberAdd",

  async execute(member) {
    try {

      console.log(`👤 New member: ${member.user.tag}`);

      // ===== AUTO ROLE =====
      const role = member.guild.roles.cache.get(AUTO_ROLE);

      if (role) {
        await member.roles.add(role).catch(err => {
          console.log("❌ ROLE ERROR:", err);
        });
      } else {
        console.log("❌ Role not found");
      }

      // ===== CHANNEL =====
      const channel = member.guild.channels.cache.get(WELCOME_CHANNEL);

      if (!channel) {
        console.log("❌ Channel not found");
        return;
      }

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
        .setThumbnail(member.user.displayAvatarURL())
        .setImage("https://media.discordapp.net/attachments/1475993508535074816/1476584792048013312/Fallen-Knight-in-Burning-Forest.gif")
        .setFooter({ text: "Administrations | VYRN" });

      await channel.send({ embeds: [embed] });

      console.log("✅ Welcome sent");

    } catch (err) {
      console.log("❌ WELCOME ERROR:", err);
    }
  }
};
