const { EmbedBuilder } = require("discord.js");

const RULES_CHANNEL_ID = "1475526080361140344";

const RULES_GIF = "https://cdn.discordapp.com/attachments/1475526080361140344/1496238476671320125/ezgif.com-animated-gif-maker_1.gif?ex=69e9282b&is=69e7d6ab&hm=fcbe28efd6b0e4bb8415f5638ee1473edb8b5678cdb7228e360f10654c0e5589&";

async function createRulesPanel(client) {
  const channel = await client.channels.fetch(RULES_CHANNEL_ID).catch(() => null);
  if (!channel) {
    console.warn(`[RULES] Channel not found: ${RULES_CHANNEL_ID}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🚨 VYRN CLAN — SERVER RULES")
    .setDescription(
      `**Welcome to VYRN Clan!**\n\n` +

      `Please read and follow all the rules listed below.\n\n` +

      `> **🚨 Follow the rules of Discord and Roblox!** 🚨\n\n` +

      `• [Discord Terms of Service](https://discord.com/terms)\n` +
      `• [Roblox Terms of Use](https://en.help.roblox.com/hc/en-us/articles/115004647846-Roblox-Terms-of-Use)\n\n` +

      `━━━━━━━━━━━━━━━━━━\n\n` +

      `> **🛑 1. NSFW is strictly prohibited**\n` +
      `This includes messages, images, videos, avatars, nicknames, and any other content.\n\n` +

      `> **🛑 2. No begging for pets, items or anything else**\n` +
      `Begging clutters the chat. Keep the server clean.\n\n` +

      `> **🛑 3. No advertising**\n` +
      `Advertising other Discord servers, YouTube channels, etc. will result in a permanent ban.\n\n` +

      `> **🛑 4. Use channels for their intended purpose**\n\n` +

      `> **🛑 5. How to join the CLAN?**\n` +
      `To join the clan, your Roblox account **must** be linked via Blox.link.\n` +
      `✅ Connect your account here: <#1475970436650237962>\n` +
      `❗ Applications without a linked account will **not** be accepted.\n\n` +

      `━━━━━━━━━━━━━━━━━━\n\n` +

      `> **🚨 False Applications & Tickets**\n` +
      `Submitting fake applications or creating unnecessary/fake tickets may result in permanent disqualification from applying.`
    )
    .setImage(RULES_GIF)
    .setFooter({
      text: "VYRN CLAN • Official Rules",
      iconURL: channel.guild.iconURL({ dynamic: true })
    })
    .setTimestamp();

  // Usuń stare wiadomości z regulaminem i wyślij/zaktualizuj nową
  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    const existing = messages.find(msg => 
      msg.embeds.length > 0 && msg.embeds[0].title?.includes("SERVER RULES")
    );

    if (existing) {
      await existing.edit({ embeds: [embed] });
      console.log("[RULES] Rules panel updated successfully");
    } else {
      await channel.send({ embeds: [embed] });
      console.log("[RULES] Rules panel created successfully");
    }
  } catch (err) {
    console.error("[RULES] Error posting rules panel:", err);
  }
}

module.exports = { createRulesPanel };
