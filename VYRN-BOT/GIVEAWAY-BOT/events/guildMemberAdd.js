const { EmbedBuilder, Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    if (member.user.bot) return;

    try {
      console.log(`👤 JOIN → ${member.user.tag} (${member.id})`);

      const WELCOME_CHANNEL_ID = "1475559296594084007";
      const AUTO_ROLE_ID = "1475572275095929022";

      // ====================== AUTO ROLE ======================
      const role = member.guild.roles.cache.get(AUTO_ROLE_ID);

      if (role) {
        await new Promise((r) => setTimeout(r, 1200));

        await member.roles.add(role).catch((err) => {
          console.error(`❌ ROLE ERROR → ${member.user.tag}`, err.message);
        });

        console.log(`✅ ROLE → ${role.name} → ${member.user.tag}`);
      }

      // ====================== CHANNEL ======================
      const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);

      if (!channel?.isTextBased()) {
        console.warn(`⚠️ CHANNEL ERROR → ${WELCOME_CHANNEL_ID}`);
        return;
      }

      // ====================== EMBED ======================
      const embed = new EmbedBuilder()
        .setColor("#b8a672")
        .setAuthor({
          name: "VYRN CLAN • OFFICIAL",
          iconURL: member.guild.iconURL({ size: 256 }) || undefined,
        })
        .setDescription(
[
`🎉 **Welcome ${member} to VYRN**`,
"",
"━━━━━━━━━━━━━━━━━━",
"",
"📌 **START HERE**",
"",
"• <#1475526080361140344> ・ Rules",
"• <#1475970436650237962> ・ Verification",
"",
"━━━━━━━━━━━━━━━━━━",
"",
"🎟 **JOIN THE CLAN**",
"",
"• <#1475558248487583805>",
"",
"━━━━━━━━━━━━━━━━━━",
"",
"🔥 **Good luck & have fun!**",
""
].join("\n")
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256, dynamic: true }))
        .setImage("https://media.discordapp.net/attachments/1475993709240778904/1486898592491896882/ezgif.com-video-to-gif-converter.gif")
        .setFooter({
          text: `Member #${member.guild.memberCount} • VYRN`,
        })
        .setTimestamp();

      // ====================== SEND ======================
      await channel.send({ embeds: [embed] }).catch((err) => {
        console.error(`❌ SEND ERROR → ${member.user.tag}`, err.message);
      });

      console.log(`✅ WELCOME SENT → ${member.user.tag}`);

    } catch (err) {
      console.error(`❌ MAIN ERROR (${member.user.tag})`, err);
    }
  },
};
