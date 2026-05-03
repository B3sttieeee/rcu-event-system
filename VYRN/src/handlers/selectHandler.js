// src/handlers/selectHandler.js
const { EmbedBuilder, MessageFlags } = require("discord.js");
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const eventSystem = require("../systems/event");
const boostSystem = require("../systems/boost");

/**
 * ========================================================
 * VYRN • SELECT MENU ROUTER (PRESTIGE EDITION)
 * Central processing for all dropdown interactions
 * ========================================================
 */
module.exports = async function selectHandler(interaction) {
  // Pobieramy ID oraz użytkownika w bezpieczny sposób
  const customId = interaction.customId;
  const user = interaction.user;

  if (!customId) return;

  // Logowanie interakcji w konsoli HQ
  console.log(`[INTERACTION] ⬇️ ${user.tag} used menu: ${customId}`);

  try {
    // 1. DYNAMIC PREFIXES (Pattern matching)
    // Obsługa systemów, gdzie ID zaczyna się od konkretnego prefiksu
    if (customId.startsWith("vc_")) {
      // Obsługa menu w prywatnych kanałach głosowych (permit, kick, ban)
      return await privateVC.handlePrivateSelect(interaction);
    }

    // 2. STATIC IDs (Fast Switch)
    // Obsługa konkretnych, stałych identyfikatorów menu
    switch (customId) {
      case "clan_ticket_select":
        // Przekazanie interakcji bezpośrednio do systemu ticketów GOLD
        return await ticketSystem.handle(interaction, interaction.client);

      case "role_menu":
      case "dm_menu":
        // Obsługa menu ról i powiadomień w systemie eventów
        return await eventSystem.handleEventInteraction(interaction);

      case "shop_select_boost":
        // Obsługa zakupu boosterów w sklepie
        return await handleShopBoost(interaction);

      default:
        // ==================== UNHANDLED SELECT ====================
        // Jeśli ID nie pasuje do żadnego z powyższych
        console.warn(`[SELECT] ⚠️ Unhandled select menu: ${customId}`);
        
        if (!interaction.replied && !interaction.deferred) {
          return await interaction.reply({
            content: "❌ **System Alert:** This menu interaction is not registered in the HQ database.",
            flags: [MessageFlags.Ephemeral]
          });
        }
    }

  } catch (error) {
    console.error("🔥 [SELECT HANDLER ERROR]:", error);

    // EMERGENCY FALLBACK - Zabezpieczenie przed crashem bota
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ **Critical Error:** Failed to process menu selection. Contact HQ Staff.",
          flags: [MessageFlags.Ephemeral]
        });
      } catch (e) {
        console.error("[SELECT] Critical failure in Discord API response.");
      }
    }
  }
};

/**
 * ========================================================
 * INTERNAL MODULES (Logic Separation)
 * ========================================================
 */

// Handles the purchase of boosters from the /shop
async function handleShopBoost(interaction) {
  // Pobieramy pierwszą wybraną wartość z menu
  const boostId = interaction.values?.[0];

  if (!boostId) {
    return interaction.reply({
      content: "❌ No item selected. Operation cancelled.",
      flags: [MessageFlags.Ephemeral]
    });
  }

  // Szukanie boostera w konfiguracji systemu boostów
  const boost = (boostSystem.SHOP_BOOSTS || []).find(b => b.id === boostId);

  if (!boost) {
    return interaction.reply({
      content: "❌ **Error:** Selected booster no longer exists in the store rotation.",
      flags: [MessageFlags.Ephemeral]
    });
  }

  // Próba wykonania transakcji zakupu
  const result = await boostSystem.buyBoost(interaction.user.id, boostId);

  if (!result.success) {
    let errorMessage = "Transaction declined.";
    
    if (result.reason === "INSUFFICIENT_FUNDS") {
      errorMessage = "You do not have enough coins in your vault for this booster.";
    } else if (result.reason === "INTERNAL_ERROR") {
      errorMessage = "Financial system is currently offline. Try again later.";
    }

    return interaction.reply({
      content: `❌ **Purchase Failed:** ${errorMessage}`,
      flags: [MessageFlags.Ephemeral]
    });
  }

  // GENEROWANIE EMBEDA SUKCESU (Prestige Gold)
  // Przeliczenie czasu zakończenia na timestamp Discorda
  const expiryTimestamp = Math.floor(result.endTime / 1000);
  
  const successEmbed = new EmbedBuilder()
    .setColor("#FFD700") // Charakterystyczny złoty kolor VYRN
    .setAuthor({ 
      name: "VYRN HQ • PURCHASE SUCCESSFUL", 
      iconURL: interaction.guild ? interaction.guild.iconURL() : null 
    })
    .setTitle(`⚡ ${boost.name} Activated`)
    .setDescription(
      `Your XP multiplier has been successfully deployed to your account.\n\n` +
      `**Active Multiplier:** \`${boost.multiplier}x XP\`\n` +
      `**Expiration:** <t:${expiryTimestamp}:F> (<t:${expiryTimestamp}:R>)\n\n` +
      `*Multipliers of the same value stack their duration.*`
    )
    .setThumbnail(interaction.user.displayAvatarURL())
    .setFooter({ text: "VYRN Clan • Economy Management" })
    .setTimestamp();

  return interaction.reply({
    embeds: [successEmbed],
    flags: [MessageFlags.Ephemeral]
  });
}
