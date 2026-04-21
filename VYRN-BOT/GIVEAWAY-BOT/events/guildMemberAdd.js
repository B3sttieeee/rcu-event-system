const { Events, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const WELCOME_CHANNEL_ID = "1475559296594084007";
const AUTO_ROLE_ID = "1475572275095929022";
const AUTO_ROLE_DELAY = 1500;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    if (member.user.bot) return;

    console.log(`[JOIN] ${member.user.tag} (${member.id}) joined the server`);

    try {
      const guild = member.guild;
      const me = guild.members.me || await guild.members.fetchMe().catch(() => null);

      if (!me) {
        console.warn(`[JOIN] Bot member not found`);
        return;
      }

      // ====================== AUTO ROLE ======================
      if (AUTO_ROLE_ID) {
        const role = guild.roles.cache.get(AUTO_ROLE_ID) ||
                     await guild.roles.fetch(AUTO_ROLE_ID).catch(() => null);

        if (role && 
            me.permissions.has(PermissionFlagsBits.ManageRoles) && 
            me.roles.highest.comparePositionTo(role) > 0) {

          await sleep(AUTO_ROLE_DELAY);
          
          await member.roles.add(role)
            .then(() => console.log(`[JOIN] Auto-role assigned to ${member.user.tag}`))
            .catch(err => console.error(`[JOIN] Auto-role failed:`, err.message));
        }
      }

      // ====================== WELCOME EMBED ======================
      const welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL_ID) ||
                             await guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);

      if (!welcomeChannel || !welcomeChannel.isTextBased()) {
        console.warn(`[JOIN] Welcome channel not found`);
        return;
      }

      const perms = welcomeChannel.permissionsFor(me);
      if (!perms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        console.warn(`[JOIN] Missing permissions in welcome channel`);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor("#0a0a0a")
        .setAuthor({
          name: "VYRN CLAN • OFFICIAL",
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTitle(`Welcome ${member} to VYRN Clan!`)   // <-- tutaj pinguje poprawnie
        .setDescription(
          `> **Start Here**\n\n` +

          `> • **<#1475526080361140344>** • Server Rules\n` +
          `> • **<#1475970436650237962>** • Verification\n\n` +

          `> **Join The Clan**\n\n` +
          `> • **<#1475558248487583805>** • Clan Information\n\n` +

          `If you want to verify, use the command **\`/verify\`** in this channel ` +
          `and follow the instructions from Blox.link.\n\n` +

          `🔥 **Good luck and have fun!**`
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256, dynamic: true }))
        .setImage("https://media.discordapp.net/attachments/1475992778554216448/1496214765406650489/ezgif.com-animated-gif-maker.gif")
        .setFooter({
          text: `Member #${guild.memberCount} • VYRN`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await welcomeChannel.send({ embeds: [embed] });
      console.log(`[JOIN] Welcome embed sent → ${member.user.tag}`);

    } catch (error) {
      console.error(`[JOIN] Error for ${member.user.tag}:`, error);
    }
  }
};
