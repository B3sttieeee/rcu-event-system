const { EmbedBuilder } = require('discord.js');
const config = require('../config');

// ===== CONFIG =====
const WELCOME_CHANNEL = "1475559296594084007";
const AUTO_ROLE = "1475572275095929022";

const RULES_CHANNEL = "1475526080361140344";
const VERIFY_CHANNEL = "1475970436650237962";
const CLAN_CHANNEL = "1475558248487583805";

module.exports = {
  name: 'guildMemberAdd',

  async execute(member) {

    // ===== AUTO ROLE =====
    try {
      await member.roles.add(AUTO_ROLE);
    } catch (err) {
      console.log("❌ AUTO ROLE ERROR:", err);
    }

    // ===== CHANNEL =====
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL);
    if (!channel) return;

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setAuthor({ name: 'VYRN - SYSTEM' })
      .setDescription(`
🎉 **Welcome ${member}!**

📌 **1. Check <#${RULES_CHANNEL}> to familiarize yourself with the server rules.**

🔗 **2. Connect your account in <#${VERIFY_CHANNEL}> using command \`/verify\`**

👥 **3. If you want join clan check <#${CLAN_CHANNEL}>**

✨ Good Luck ${member}

**Administrations | VYRN**
`)
      .setImage(config.IMAGE)
      .setFooter({ text: `User ID: ${member.id}` });

    channel.send({ embeds: [embed] });
  }
};
