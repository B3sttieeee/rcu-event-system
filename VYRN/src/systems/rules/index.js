// src/systems/rules/index.js
const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits 
} = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  RULES_CHANNEL_ID: "1475526080361140344",
  
  // Rola, którą gracz dostanie PO kliknięciu weryfikacji
  MEMBER_ROLE_ID: "1475572190337433781", // Staff [VYRN CLAN]
  
  // Kanał, do którego prowadzi przycisk "Blox.link Connect" (jeśli używasz zewnętrznego bota)
  VERIFICATION_LINK_CHANNEL: "1475970436650237962", // Taki sam jak w starym kodzie
  
  // Prestiżowy motyw VYRN (Złoto/Czerń)
  THEME: {
    GOLD: "#FFD700",
    BLACK: "#0a0a0a",
    DANGER: "#ff4757"
  },
  
  // Nowy, statyczny banner VYRN (Ten, który wysłałeś)
  PANEL_IMAGE: "https://imgur.com/BCuOFX2.png"
};

// ====================== CREATE HUB (VERIFY + RULES) ======================
async function createRulesHub(client) {
  const channel = await client.channels.fetch(CONFIG.RULES_CHANNEL_ID).catch(() => null);
  if (!channel) return console.warn(`❌ [RULES] Channel not found: ${CONFIG.RULES_CHANNEL_ID}`);

  // 1. EMBED 1: Banner graficzny (Zawsze na górze)
  const bannerEmbed = new EmbedBuilder()
    .setColor(CONFIG.THEME.BLACK)
    .setImage(CONFIG.PANEL_IMAGE);

  // 2. EMBED 2: Sekcja Weryfikacji (Niebieskie obramowanie, tak jak w bannerze)
  const verifyEmbed = new EmbedBuilder()
    .setColor("#3a86ff") // Czysty Niebieski
    .setTitle("👑 VYRN CLAN • MEMBER VERIFICATION")
    .setDescription(
      `Welcome to **VYRN CLAN**.\n` +
      `To prevent bots and maintain a secure community, you **must** verify your account before accessing the clan categories.\n\n` +
      `**STEPS TO VERIFY:**\n` +
      `> **1.** Link your Roblox account via **Blox.link** (Official Discord Bot).\n` +
      `> **2.** Go to the Connect channel: <#${CONFIG.VERIFICATION_LINK_CHANNEL}> and run the linking process.\n` +
      `> **3.** Once linked, click the **'Access Clan'** button below.`
    )
    .setTimestamp();

  // 3. EMBED 3: Sekcja Regulaminu (Rozbudowane zasady)
  const rulesEmbed = new EmbedBuilder()
    .setColor(CONFIG.THEME.GOLD)
    .setTitle("🚨 OFFICIAL SERVER RULES")
    .setDescription(
      `Please read and follow all rules listed below. Ignorance is no excuse.\n\n` +
      `**🚨 GENERAL CONDUCT**\n` +
      `• Follow the [Discord ToS](https://discord.com/terms) & [Roblox ToU](https://en.help.roblox.com/hc/en-us/articles/115004647846) strictly.\n` +
      `• **NSFW IS STRICTLY PROHIBITED.** No images, messages, or nicknames that are inappropriate for a broad audience.\n` +
      `• Respect all members. Harassment, toxicity, or hate speech will result in an immediate ban.\n\n` +
      `**🛑 CHAT ETIQUETTE**\n` +
      `• **No Begging.** Begging for pets, items, Robux, or anything else is not allowed.\n` +
      `• **No Advertising.** Advertising YouTube channels, Discord servers, etc. will result in a permanent ban.\n` +
      `• Use channels for their intended purpose. (e.g. trading in the trading channel).\n\n` +
      `**🔒 STAFF AUTHORITY**\n` +
      `• The Staff team has the final say in any conflict. Do not argue with them.\n` +
      `• Do not create fake applications or false support tickets. This will result in permanent disqualification.`
    )
    .setFooter({ text: "By clicking Access, you agree to these rules." });

  // 4. PRZYCISK: Interakcja (Weryfikacja)
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_access")
      .setLabel("✅ Access Clan")
      .setStyle(ButtonStyle.Success)
  );

  // Pobierz i zaktualizuj panel
  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    const existing = messages.find(msg =>
      msg.embeds.length > 0 && msg.embeds[1]?.title?.includes("SERVER RULES")
    );

    if (existing) {
      await existing.edit({ embeds: [bannerEmbed, verifyEmbed, rulesEmbed], components: [row] });
      console.log("[RULES] Rules & Verify Hub updated successfully");
    } else {
      await channel.send({ embeds: [bannerEmbed, verifyEmbed, rulesEmbed], components: [row] });
      console.log("[RULES] Rules & Verify Hub created successfully");
    }
  } catch (err) {
    console.error("[RULES] Error creating hub:", err);
  }
}

// ====================== INTERACTION HANDLER ======================
async function handleRulesInteraction(interaction) {
  const { customId, member } = interaction;

  if (customId === "verify_access") {
    const roleId = CONFIG.MEMBER_ROLE_ID;
    const role = member.guild.roles.cache.get(roleId);
    if (!role) return interaction.reply({ content: "❌ Error: The verified role is missing. Contact Staff.", ephemeral: true });

    // Sprawdź, czy gracz ma już rolę
    if (member.roles.cache.has(roleId)) {
      return interaction.reply({ content: "✅ You are already verified and have clan access!", ephemeral: true });
    }

    try {
      await member.roles.add(role);
      await interaction.reply({ content: "🎉 Welcome! Your verification is complete. You now have full clan access.", ephemeral: true });
      console.log(`[RULES] Verified: ${member.user.tag}`);
    } catch (error) {
      console.error("[RULES] Error adding role:", error);
      await interaction.reply({ content: "❌ Error: Could not grant you access. This is likely a permission issue with the bot.", ephemeral: true });
    }
  }
}

// ====================== INIT ======================
function init(client) {
  console.log("📜 Rules & Verification System → Loaded and listening");
  // Panel tworzony/aktualizowany automatycznie przy starcie
  if (client.isReady()) {
    createRulesHub(client).catch(console.error);
  } else {
    client.once("ready", () => createRulesHub(client).catch(console.error));
  }
}

module.exports = {
  init,
  createRulesHub,
  handleRulesInteraction
};
