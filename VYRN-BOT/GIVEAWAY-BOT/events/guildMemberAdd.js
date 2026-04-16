const {
  Events,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const WELCOME_CHANNEL_ID = "1475559296594084007";
const AUTO_ROLE_ID = "1475572275095929022";
const AUTO_ROLE_DELAY = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveRole = async (guild, roleId) => {
  const cachedRole = guild.roles.cache.get(roleId);
  if (cachedRole) return cachedRole;

  return guild.roles.fetch(roleId).catch(() => null);
};

const resolveChannel = async (guild, channelId) => {
  const cachedChannel = guild.channels.cache.get(channelId);
  if (cachedChannel) return cachedChannel;

  return guild.channels.fetch(channelId).catch(() => null);
};

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    if (member.user.bot) return;

    try {
      console.log(`[JOIN] ${member.user.tag} (${member.id})`);

      const me =
        member.guild.members.me ||
        (await member.guild.members.fetchMe().catch(() => null));

      if (!me) {
        console.warn(`[JOIN] Missing guild bot member cache for ${member.guild.id}`);
        return;
      }

      const role = await resolveRole(member.guild, AUTO_ROLE_ID);

      if (!role) {
        console.warn(`[JOIN] Auto-role not found: ${AUTO_ROLE_ID}`);
      } else if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        console.warn(`[JOIN] Missing ManageRoles permission`);
      } else if (me.roles.highest.comparePositionTo(role) <= 0) {
        console.warn(
          `[JOIN] Cannot assign role "${role.name}" because it is above or equal to bot's highest role`
        );
      } else {
        await sleep(AUTO_ROLE_DELAY);

        await member.roles.add(role).then(() => {
          console.log(`[JOIN] Auto-role assigned: ${role.name} -> ${member.user.tag}`);
        }).catch((error) => {
          console.error(
            `[JOIN] Auto-role failed for ${member.user.tag}: ${error.message}`
          );
        });
      }

      const channel = await resolveChannel(member.guild, WELCOME_CHANNEL_ID);

      if (!channel || !channel.isTextBased()) {
        console.warn(`[JOIN] Welcome channel not found or not text-based: ${WELCOME_CHANNEL_ID}`);
        return;
      }

      const channelPerms = channel.permissionsFor(me);
      if (
        !channelPerms?.has([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks
        ])
      ) {
        console.warn(
          `[JOIN] Missing channel permissions in ${WELCOME_CHANNEL_ID} (ViewChannel/SendMessages/EmbedLinks)`
        );
        return;
      }

      const embed = new EmbedBuilder()
        .setColor("#b8a672")
        .setAuthor({
          name: "VYRN CLAN • OFFICIAL",
          iconURL: member.guild.iconURL({ size: 256 }) || undefined
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
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setImage(
          "https://media.discordapp.net/attachments/1475993709240778904/1486898592491896882/ezgif.com-video-to-gif-converter.gif"
        )
        .setFooter({
          text: `Member #${member.guild.memberCount} • VYRN`
        })
        .setTimestamp();

      await channel.send({
        embeds: [embed]
      });

      console.log(`[JOIN] Welcome embed sent -> ${member.user.tag}`);
    } catch (error) {
      console.error(`[JOIN] Main error for ${member.user.tag}:`, error);
    }
  }
};
