const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "guildMemberAdd",

  async execute(member) {
    try {
      console.log(`👤 New member: ${member.user.tag}`);

      const WELCOME_CHANNEL = "1475559296594084007";
      const AUTO_ROLE = "1475572275095929022";

      // =========================
      // 🎭 AUTO ROLE
      // =========================
      try {
        const role = await member.guild.roles.fetch(AUTO_ROLE);

        if (role) {
          await member.roles.add(role);
          console.log("✅ Auto role added");
        } else {
          console.log("❌ Role not found");
        }
      } catch (err) {
        console.log("❌ ROLE ERROR:", err);
      }

      // =========================
      // 🎉 WELCOME
      // =========================
      let channel;

      try {
        channel = await member.guild.channels.fetch(WELCOME_CHANNEL);
      } catch {
        console.log("❌ Channel fetch failed");
        return;
      }

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

🔗 Verify your account  
<#1475970436650237962>

🎟 Open ticket if needed  
<#1475558248487583805>

🔥 Good luck & have fun!`
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setImage("https://media.discordapp.net/attachments/1475993709240778904/1486898592491896882/ezgif.com-video-to-gif-converter.gif")
        .setFooter({ text: "Administrations | VYRN" });

      await channel.send({ embeds: [embed] });

      console.log("✅ Welcome sent");

    } catch (err) {
      console.log("❌ WELCOME ERROR:", err);
    }
  }
};
