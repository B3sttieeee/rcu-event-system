// src/systems/rules/index.js
const { EmbedBuilder } = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  RULES_CHANNEL_ID: "1475526080361140344",
  VERIFICATION_LINK_CHANNEL: "1475970436650237962",
  
  // Prestiżowy motyw VYRN
  THEME: {
    GOLD: "#FFD700",
    BLACK: "#0a0a0a",
    BLUE: "#3a86ff" // Kolor weryfikacji
  },
  
  // Twój banner graficzny
  PANEL_IMAGE: "https://imgur.com/BCuOFX2.png"
};

// ====================== CREATE RULES PANEL ======================
async function createRulesPanel(client) {
  const channel = await client.channels.fetch(CONFIG.RULES_CHANNEL_ID).catch(() => null);
  if (!channel) return console.warn(`❌ [RULES] Channel not found: ${CONFIG.RULES_CHANNEL_ID}`);

  // --- EMBED 1: GŁÓWNY REGULAMIN ---
  const rulesEmbed = new EmbedBuilder()
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
      
      `**🔒 STAFF AUTHORITY**\n` +
      `• The Staff team has the final say in any conflict. Do not argue with them.\n` +
      `• Submitting fake applications or creating false support tickets will result in permanent disqualification.`
    )
    .setImage(CONFIG.PANEL_IMAGE) // Banner idzie tutaj
    .setTimestamp();

  // --- EMBED 2: OSOBNY KAFELEK DLA WERYFIKACJI ---
  const verifyEmbed = new EmbedBuilder()
    .setColor(CONFIG.THEME.BLUE)
    .setTitle("🔗 ACCOUNT VERIFICATION (BLOXLINK)")
    .setDescription(
      `To ensure a safe community, your Roblox account **must** be linked.\n` +
      `Applications without a linked account will not be accepted.\n\n` +
      
      `**HOW TO VERIFY:**\n` +
      `> **1.** Go to the verification channel: <#${CONFIG.VERIFICATION_LINK_CHANNEL}>\n` +
      `> **2.** Type the \`/verify\` command and press Enter.\n` +
      `> **3.** The Bloxlink bot will give you a secure link. Click it to open the official Bloxlink site.\n` +
      `> **4.** Log into your Roblox account on the site and follow the instructions.\n` +
      `> **5.** Once done, return to Discord! Your account is now linked.`
    )
    .setFooter({ 
      text: "VYRN CLAN • Secure Verification", 
      iconURL: channel.guild.iconURL({ dynamic: true }) 
    });

  // WYSYŁANIE/AKTUALIZACJA
  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    // Szukamy wiadomości, która ma pierwszy embed z tytułem RULES
    const existing = messages.find(msg =>
      msg.embeds.length > 0 && msg.embeds[0].title?.includes("OFFICIAL SERVER RULES")
    );

    if (existing) {
      // Aktualizujemy wiadomość wgrywając oba embedy
      await existing.edit({ embeds: [rulesEmbed, verifyEmbed], components: [] });
      console.log("[RULES] Rules & Verify panel updated successfully");
    } else {
      // Wysyłamy nową wiadomość z dwoma embedami naraz
      await channel.send({ embeds: [rulesEmbed, verifyEmbed] });
      console.log("[RULES] Rules & Verify panel created successfully");
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
