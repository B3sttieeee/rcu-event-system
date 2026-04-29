// src/systems/rules/index.js
const { EmbedBuilder } = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  RULES_CHANNEL_ID: "1475526080361140344",
  VERIFICATION_LINK_CHANNEL: "1475970436650237962",
  
  // Prestiżowy motyw VYRN (Złoto/Czerń)
  THEME: {
    GOLD: "#FFD700",
    BLACK: "#0a0a0a"
  },
  
  // Twój nowy banner graficzny
  PANEL_IMAGE: "https://imgur.com/BCuOFX2.png"
};

// ====================== CREATE RULES PANEL ======================
async function createRulesPanel(client) {
  const channel = await client.channels.fetch(CONFIG.RULES_CHANNEL_ID).catch(() => null);
  if (!channel) return console.warn(`❌ [RULES] Channel not found: ${CONFIG.RULES_CHANNEL_ID}`);

  const embed = new EmbedBuilder()
    .setColor(CONFIG.THEME.GOLD)
    .setTitle("🚨 VYRN CLAN • OFFICIAL SERVER RULES")
    .setDescription(
      `Welcome to **VYRN CLAN**. Please read and follow all the rules listed below. Ignorance is not an excuse.\n\n` +
      
      `**🚨 GENERAL CONDUCT**\n` +
      `• Follow the [Discord Terms of Service](https://discord.com/terms) & [Roblox Terms of Use](https://en.help.roblox.com/hc/en-us/articles/115004647846) strictly.\n` +
      `• **NSFW IS STRICTLY PROHIBITED.** No images, messages, avatars, or nicknames that are inappropriate for a broad audience.\n` +
      `• Respect all members. Harassment, toxicity, or hate speech will result in an immediate ban.\n\n` +
      
      `**🛑 CHAT ETIQUETTE**\n` +
      `• **No Begging.** Begging for pets, items, Robux, or anything else is not allowed.\n` +
      `• **No Advertising.** Advertising YouTube channels, Discord servers, etc., will result in a permanent ban.\n` +
      `• Use channels for their intended purpose.\n\n` +
      
      `**✅ HOW TO JOIN THE CLAN**\n` +
      `• To join the clan, your Roblox account **must** be linked via Blox.link.\n` +
      `• Connect your account here: <#${CONFIG.VERIFICATION_LINK_CHANNEL}>\n` +
      `• Applications without a linked account will **not** be accepted.\n\n` +
      
      `**🔒 STAFF AUTHORITY**\n` +
      `• The Staff team has the final say in any conflict. Do not argue with them.\n` +
      `• Submitting fake applications or creating false support tickets will result in permanent disqualification.`
    )
    .setImage(CONFIG.PANEL_IMAGE)
    .setFooter({ 
      text: "VYRN CLAN • Official Rules", 
      iconURL: channel.guild.iconURL({ dynamic: true }) 
    })
    .setTimestamp();

  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    const existing = messages.find(msg =>
      msg.embeds.length > 0 && msg.embeds[0].title?.includes("OFFICIAL SERVER RULES")
    );

    if (existing) {
      // Zaktualizuj i wyczyść przyciski (components: []), jeśli były wcześniej
      await existing.edit({ embeds: [embed], components: [] });
      console.log("[RULES] Rules panel updated successfully");
    } else {
      await channel.send({ embeds: [embed] });
      console.log("[RULES] Rules panel created successfully");
    }
  } catch (err) {
    console.error("[RULES] Error posting rules panel:", err);
  }
}

// ====================== INIT ======================
function init(client) {
  console.log("📜 Rules System → Loaded");
  
  if (client.isReady()) {
    createRulesPanel(client).catch(console.error);
  } else {
    client.once("ready", () => createRulesPanel(client).catch(console.error));
  }
}

module.exports = { 
  init, 
  createRulesPanel 
};
