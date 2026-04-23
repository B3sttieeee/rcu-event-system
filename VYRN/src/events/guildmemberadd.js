// ====================== WELCOME EMBED ======================
const welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL_ID) ||
                       await guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);

if (!welcomeChannel?.isTextBased()) return;

const embed = new EmbedBuilder()
  .setColor("#0a0a0a")
  .setAuthor({
    name: "VYRN CLAN • OFFICIAL",
    iconURL: guild.iconURL({ dynamic: true })
  })
  .setTitle(`Welcome ${member.user.username}!`)
  .setDescription(
    `**Welcome to VYRN Clan!** 👋\n\n` +

    `**Start Here**\n` +
    `・ **<#1475526080361140344>** • Server Rules\n` +
    `・ **<#1475970436650237962>** • Verification\n\n` +

    `**Join The Clan**\n` +
    `・ **<#1475558248487583805>** • Clan Information\n\n` +

    `To verify, use the command **\`/verify\`** in this channel\n` +
    `and follow the instructions from Blox.link.\n\n` +

    `🔥 **Good luck and have fun!**`
  )
  .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
  .setImage("https://media.discordapp.net/attachments/1475992778554216448/1496214765406650489/ezgif.com-animated-gif-maker.gif")
  .setFooter({
    text: `New Member #${guild.memberCount} • VYRN Clan`,
    iconURL: guild.iconURL({ dynamic: true })
  })
  .setTimestamp();

await welcomeChannel.send({ embeds: [embed] });
