// src/handlers/selectHandler.js
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const eventSystem = require("../systems/event");
const { SHOP_BOOSTS, buyBoost } = require("../systems/boost");

/**
 * ========================================================
 * VYRN • Select Menu Router (Black Edition v2)
 * Clean, modular, and highly scalable interaction handler
 * ========================================================
 */
module.exports = async function selectHandler(interaction) {
  const customId = interaction.customId;
  if (!customId) return;

  console.log(`[SELECT] ⬇️ ${interaction.user.tag} użył menu: ${customId}`);

  try {
    // 1. DYNAMICZNE ID (sprawdzanie po prefixie)
    if (customId.startsWith("vc_kickselect_") || customId.startsWith("vc_banselect_")) {
      return await privateVC.handlePrivateSelect(interaction);
    }

    // 2. STATYCZNE ID (szybki Switch zamiast ściany IFów)
    switch (customId) {
      case "clan_ticket_select":
        return await ticketSystem.handle(interaction, interaction.client);

      case "role_menu":
      case "dm_menu":
        return await eventSystem.handleEventInteraction(interaction);

      case "shop_select_boost":
        return await handleShopBoost(interaction);

      default:
        // ==================== NIEOBSŁUŻONE MENU ====================
        console.warn(`[SELECT] ⚠️ Nieobsłużone menu: ${customId}`);
        if (!interaction.replied && !interaction.deferred) {
          return await interaction.reply({
            content: "❌ To menu nie jest jeszcze podłączone do systemu.",
            ephemeral: true
          });
        }
    }

  } catch (error) {
    console.error("🔥 [SELECT HANDLER ERROR]:", error);

    // 3. BEZPIECZNY FALLBACK BŁĘDÓW
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ Wystąpił błąd serwera podczas przetwarzania tego menu.",
          ephemeral: true
        });
      } catch (e) {
        console.error("[SELECT] ❌ Nie udało się wysłać wiadomości o błędzie (Discord API).");
      }
    }
  }
};

/**
 * ========================================================
 * MODUŁY WEWNĘTRZNE (Separacja logiki)
 * ========================================================
 */

// Obsługa zakupu boostów w sklepie
async function handleShopBoost(interaction) {
  const boostId = interaction.values?.[0];

  if (!boostId) {
    return interaction.reply({
      content: "❌ Nie wybrano żadnego boosta z listy.",
      ephemeral: true
    });
  }

  const boost = (SHOP_BOOSTS || []).find(b => b?.id === boostId);

  if (!boost) {
    return interaction.reply({
      content: "❌ Wybrany boost nie istnieje w bazie danych.",
      ephemeral: true
    });
  }

  const result = buyBoost?.(interaction.user.id, boostId);

  if (!result?.success) {
    return interaction.reply({
      content: `❌ **Odmowa:** ${result?.message || "Zakup nie powiódł się."}`,
      ephemeral: true
    });
  }

  return interaction.reply({
    content: `⚡ Pomyślnie zakupiono: **${boost.name}**! Zostanie aktywowany natychmiast.`,
    ephemeral: true
  });
}
