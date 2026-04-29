// src/events/messageUpdate.js
const { Events, EmbedBuilder } = require("discord.js");
const { 
  LOGS, 
  sendLog, 
  clampText 
} = require("../systems/log");

module.exports = {
  name: Events.MessageUpdate,
  
  async execute(oldMsg, newMsg) {
    // Podstawowe sprawdzenia
    if (!oldMsg.guild || !oldMsg.author) return;
    if (oldMsg.author.bot) return;

    // Pobieranie treści, jeśli nie było jej w cache
    if (oldMsg.partial) try { await oldMsg.fetch(); } catch { return; }
    if (newMsg.partial) try { await newMsg.fetch(); } catch { return; }

    // Ignorujemy edycje, które nie zmieniają treści (np. załadowanie się miniatury linku)
    const before = oldMsg.content || "";
    const after = newMsg.content || "";
    if (before === after) return;

    // Budowanie prestiżowego Embedu w barwach VYRN (Niebieski dla edycji)
    const embed = new EmbedBuilder()
      .setColor("#3b82f6") // THEME.BLUE
      .setAuthor({ 
        name: "✏️ VYRN LOG • MESSAGE EDITED", 
        iconURL: oldMsg.guild.iconURL({ dynamic: true }) 
      })
      .setThumbnail(oldMsg.author.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `**Author:** ${oldMsg.author} (\`${oldMsg.author.tag}\`)\n` +
        `**Channel:** ${oldMsg.channel}\n` +
        `**Link:** [Jump to Message](${newMsg.url})`
      )
      .addFields(
        { 
          name: "📜 Previous Content", 
          value: `>>> ${clampText(before, 1000, "*Empty or Link Only*")}`, 
          inline: false 
        },
        { 
          name: "📝 Updated Content", 
          value: `>>> ${clampText(after, 1000, "*Empty or Link Only*")}`, 
          inline: false 
        }
      )
      .setFooter({ text: `User ID: ${oldMsg.author.id} • Official VYRN System` })
      .setTimestamp();

    // Wysłanie loga na kanał z moderacją czatu
    await sendLog(oldMsg.guild, LOGS.CHAT, embed);
  }
};
