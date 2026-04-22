// src/events/guildmemberadd.js
const { EmbedBuilder } = require("discord.js");

const WELCOME_CHANNEL_ID = "1475559296594084007";
const AUTO_ROLE_ID = "1475572275095929022";
const AUTO_ROLE_DELAY = 1500;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    if (member.user.bot) return;

    try {
      const guild = member.guild;
      const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
      if (!me) return;

      // Auto role
      if (AUTO_ROLE_ID) {
        const role = guild.roles.cache.get(AUTO_ROLE_ID) || await guild.roles.fetch(AUTO_ROLE_ID).catch(() => null);
        if (role && me.permissions.has("ManageRoles") && me.roles.highest.comparePositionTo(role) > 0) {
          await sleep(AUTO_ROLE_DELAY);
          await member.roles.add(role).catch(() => {});
        }
      }

      // Welcome embed
      const welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL_ID) || await guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
      if (!welcomeChannel?.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor("#0a0a0a")
        .setAuthor({ name: "VYRN CLAN • OFFICIAL", iconURL: guild.iconURL({ dynamic: true }) })
        .setDescription(
          `**Welcome ${member} to VYRN Clan!**\n\n` +
          `**Start Here**\n` +
          `• **<#1475526080361140344>** • Server Rules\n` +
          `• **<#1475970436650237962>** • Verification\n\n` +
          `**Join The Clan**\n` +
          `• **<#1475558248487583805>** • Clan Information\n\n` +
          `If you want to verify, use the command **\`/verify\`**.\n\n` +
          `🔥 **Good luck and have fun!**`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage("https://media.discordapp.net/attachments/1475992778554216448/1496214765406650489/ezgif.com-animated-gif-maker.gif")
        .setFooter({ text: `Member #${guild.memberCount} • VYRN`, iconURL: guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await welcomeChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`[JOIN] Error for ${member.user.tag}:`, error);
    }
  }
};
