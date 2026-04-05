const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "guildMemberAdd",

  async execute(member) {
    try {
      console.log(`👤 New member: ${member.user.tag}`);

      const WELCOME_CHANNEL = "1475559296594084007";
      const AUTO_ROLE = "1475572275095929022";

      // =========================
      // 🎭 AUTO ROLE (CACHE ✅)
      // =========================
      const role = member.guild.roles.cache.get(AUTO_ROLE);

      if (role) {
        // mały delay żeby uniknąć rate limit
        await new Promise(res => setTimeout(res, 500));

        await member.roles.add(role).catch(err => {
          console.log("❌ ROLE ERROR:", err.message);
        });

        console.log("✅ Auto role added");
      } else {
        console.log("❌ Role not found");
      }

      // =========================
      // 🎉 WELCOME (CACHE ✅)
      // =========================
      const channel = member.guild.channels.cache.get(WELCOME_CHANNEL);

      if (!channel) {
        console.log("❌ Channel not found");
        return;
      }

      const embed = new EmbedBuilder()
        .setColor("#b8a672")
        .setAuthor({
          name: "VYRN CLAN",
          iconURL: member.guild.iconURL()
        })
        .setDescription(
`🎉 **Welcome ${member}**

📌 Check rules  
<#1475526080361140344>

🔗 Verify your account in this channel with BLOXLINK
<#1475970436650237962>

🎟 Open ticket if You want to clan 
<#1475558248487583805>

🔥 Good luck & have fun!`
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setImage("https://media.discordapp.net/attachments/1475993709240778904/1486898592491896882/ezgif.com-video-to-gif-converter.gif")
        .setFooter({ text: "Administrations | VYRN" })
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(err => {
        console.log("❌ SEND ERROR:", err.message);
      });

      console.log("✅ Welcome sent");

    } catch (err) {
      console.log("❌ WELCOME ERROR:", err);
    }
  }
};
