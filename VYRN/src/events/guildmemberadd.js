// src/events/guildmemberadd.js
const { EmbedBuilder, Events } = require("discord.js");

// ====================== CONFIGURATION ======================
const CONFIG = {
  WELCOME_CHANNEL_ID: "1475559296594084007",
  AUTO_ROLE_ID: "1475572275095929022",
  AUTO_ROLE_DELAY: 1500, // Time in ms before giving role
  IMAGE_URL: "https://imgur.com/XvQ7eih.png", // The new requested image
  THEME_COLOR: "#FFD700", // VYRN Gold Prestige Color

  // Key Channels for Description
  CHANNELS: {
    RULES: "1475526080361140344",
    VERIFY: "1475970436650237962",
    INFO: "1475558248487583805"
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    // Ignore bots joining
    if (member.user.bot) return;

    try {
      const guild = member.guild;
      
      // Safety check for bot permissions
      const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
      if (!me) return;

      // ====================== AUTO ROLE SYSTEM ======================
      if (CONFIG.AUTO_ROLE_ID) {
        const role = guild.roles.cache.get(CONFIG.AUTO_ROLE_ID) ||
                     await guild.roles.fetch(CONFIG.AUTO_ROLE_ID).catch(() => null);

        // Check if role exists, bot can manage roles, and role is below bot's highest role
        if (role &&
            me.permissions.has("ManageRoles") &&
            me.roles.highest.comparePositionTo(role) > 0) {

          await sleep(CONFIG.AUTO_ROLE_DELAY);
          await member.roles.add(role).catch(err => console.error(`[JOIN] Failed to add auto role:`, err.message));
        } else {
            console.warn(`[JOIN] Unable to assign auto role: Permissions issue or role not found/higher than bot.`);
        }
      }

      // ====================== WELCOME EMBED SYSTEM ======================
      const welcomeChannel = guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID) ||
                             await guild.channels.fetch(CONFIG.WELCOME_CHANNEL_ID).catch(() => null);

      if (!welcomeChannel?.isTextBased()) {
        console.warn(`[JOIN] Welcome channel not found or not text-based`);
        return;
      }

      // Build the prestige welcome embed
      const embed = new EmbedBuilder()
        .setColor(CONFIG.THEME_COLOR)
        .setAuthor({
          name: "VYRN CLAN • OFFICIAL HQ",
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTitle(`Welcome ${member.user.username}!`)
        .setDescription(
          `**Welcome ${member} to the Official VYRN Clan HQ!**👋\n` +
          `Your path towards prestige begins here.\n\n` +

          `📋 **ESSENTIAL FIRST STEPS**\n` +
          `> ▬・<#${CONFIG.CHANNELS.RULES}> ┃ Review Server Rules\n` +
          `> ▬・<#${CONFIG.CHANNELS.VERIFY}> ┃ Complete Verification\n\n` +

          `🏆 **EXPLORE THE CLAN**\n` +
          `> ▬・<#${CONFIG.CHANNELS.INFO}> ┃ Clan Information & Ranks\n\n` +

          `Check the **Verification** channel to link your account and unlock the server.\n\n` +

          `🔥 **Keep grinding harder. Rise to the top.**`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage(CONFIG.IMAGE_URL) // Set to the new requested image
        .setFooter({
          text: `New Member #${guild.memberCount} • official VYRN system`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await welcomeChannel.send({ embeds: [embed] });

      console.log(`[JOIN] Welcome embed sent to ${member.user.tag}`);

    } catch (error) {
      console.error(`[JOIN] Critical Error for ${member.user.tag}:`, error);
    }
  }
};
