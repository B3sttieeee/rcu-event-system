// src/handlers/buttonHandler.js
const { MessageFlags } = require("discord.js");
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const giveawaySystem = require("../systems/giveaway");
const eventSystem = require("../systems/event");
const embedCommand = require("../commands/embed");

/**
 * VYRN HQ • BUTTON ROUTER (PRESTIGE EDITION)
 * Central management for all button interactions
 */
module.exports = async function buttonHandler(interaction) {
  const { customId, user, client } = interaction;
  
  // Zabezpieczenie przed interakcjami bez ID
  if (!customId) return;

  // HQ Professional Logging - Śledzenie aktywności personelu i użytkowników
  console.log(`[INTERACTION] 🔘 ${user.tag} clicked: ${customId}`);

  try {
    // ==================== 1. PREFIX BASED INTERACTIONS ====================
    // Systemy wykorzystujące dynamiczne identyfikatory zaczynające się od prefiksu

    // Zarządzanie prywatnymi kanałami głosowymi
    if (customId.startsWith("vc_")) {
      return await privateVC.handlePrivatePanel(interaction);
    }

    // Zarządzanie systemem Giveaway (Konkursy)
    if (customId.startsWith("gw_")) {
      if (typeof giveawaySystem.handleGiveaway === "function") {
        return await giveawaySystem.handleGiveaway(interaction);
      }
    }

    // Zarządzanie zaawansowanym generatorem Embedów
    if (customId.startsWith("embed_edit_") || customId.startsWith("embed_delete_")) {
      if (typeof embedCommand.handleButton === "function") {
        return await embedCommand.handleButton(interaction);
      }
    }

    // ==================== 2. STATIC ID SWITCH ====================
    // Stałe identyfikatory przycisków zdefiniowane bezpośrednio w systemach HQ
    switch (customId) {
      // --- SYSTEM PROFILU (PROFILE SYSTEM) ---
      case "profile_refresh":
        // Pobieramy komendę profilu z kolekcji poleceń bota
        const profileCmd = client.commands.get("profile");
        if (profileCmd && typeof profileCmd.handleButton === "function") {
          return await profileCmd.handleButton(interaction);
        } else {
          console.warn(`[PROFILE] ⚠️ Profile command or handleButton method not found.`);
          return;
        }

      // --- WYDARZENIA (EVENT SYSTEM) ---
      case "refresh_events":
      case "get_event_roles":
      case "get_event_dm":
        return await eventSystem.handleEventInteraction(interaction);

      // --- SYSTEM TICKETÓW (VYRN GOLD) ---
      // Pełna lista akcji personelu zdefiniowana w src/systems/tickets/index.js
      case "close_ticket":
      case "claim_ticket":
      case "rename_ticket":
      case "delete_ticket":
      case "lock_ticket":   // Blokowanie możliwości pisania przez użytkownika
      case "unlock_ticket": // Przywracanie możliwości pisania
        return await ticketSystem.handle(interaction, interaction.client);

      // --- SYSTEM WERYFIKACJI ---
      case "verify_start":
        return await interaction.reply({ 
          content: "⚙️ Please use the **`/verify`** command to begin the Roblox linking process.", 
          flags: [MessageFlags.Ephemeral]
        });

      default:
        // ==================== UNHANDLED INTERACTION ====================
        // Reaguje w przypadku wykrycia ID, które nie zostało przypisane do powyższych modułów
        console.warn(`[BUTTON] ⚠️ Unhandled button ID: ${customId}`);
        
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `❌ **System Alert:** Button ID \`${customId}\` is not registered in the HQ database.`,
            flags: [MessageFlags.Ephemeral]
          });
        }
    }

  } catch (error) {
    // Specyficzna obsługa błędu Discorda 10062 (Unknown Interaction)
    // Zapobiega crashowaniu bota, gdy użytkownik kliknie przycisk zbyt wiele razy lub sesja wygaśnie.
    if (error.code === 10062) {
      return console.warn(`⚠️ [BUTTON] Interaction ${customId} expired before response could be sent (10062).`);
    }

    console.error("🔥 [BUTTON HANDLER ERROR]:", error);

    // ==================== EMERGENCY FALLBACK ====================
    // Zapewnia informację zwrotną dla użytkownika nawet w przypadku krytycznej awarii logiki
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ **Critical Error:** An issue occurred while processing this request. Please contact HQ Administration.",
          flags: [MessageFlags.Ephemeral]
        });
      } catch (e) {
        console.error("[BUTTON] Failed to send error fallback response.");
      }
    }
  }
};
