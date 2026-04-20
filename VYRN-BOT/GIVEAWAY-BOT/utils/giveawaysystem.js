const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ms = require("ms");

// Pamięć na giveawayy (w produkcyjnym projekcie użyj bazy danych)
const giveaways = new Map();

function createGiveaway(interaction, options) {
  return new Promise(async (resolve) => {
    try {
      const { prize, winners, time, description, image, requiredRole } = options;
      
      // Parsowanie czasu
      let duration;
      if (time.endsWith('s')) {
        duration = parseInt(time) * 1000;
      } else if (time.endsWith('m')) {
        duration = parseInt(time) * 60000;
      } else if (time.endsWith('h')) {
        duration = parseInt(time) * 3600000;
      } else if (time.endsWith('d')) {
        duration = parseInt(time) * 86400000;
      } else {
        duration = ms(time);
      }

      if (!duration) {
        return resolve({ success: false, message: "Nieprawidłowy format czasu." });
      }

      // Tworzenie embeda
      const giveawayEmbed = new EmbedBuilder()
        .setTitle("🎉 NOWY GIVEAWAY! 🎉")
        .setDescription(`**Nagroda:** ${prize}`)
        .setColor("#ff6b6b")
        .addFields(
          { name: "🏆 Zwycięzców", value: `\`${winners}\``, inline: true },
          { name: "⏳ Czas trwania", value: `\`${time}\``, inline: true },
          { name: "👤 Uczestnicy", value: "`0`", inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Giveaway ID: ${Date.now()}` });

      if (description) {
        giveawayEmbed.addFields({ name: "📝 Opis", value: description, inline: false });
      }

      if (image) {
        giveawayEmbed.setImage(image);
      }

      // Tworzenie przycisków
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`giveaway_join_${Date.now()}`)
            .setLabel("🎁 Dołącz do giveawayu")
            .setStyle(ButtonStyle.Success)
        );

      // Wysyłanie wiadomości
      const message = await interaction.channel.send({
        embeds: [giveawayEmbed],
        components: [row]
      });

      // Zapisywanie giveawayu
      const giveawayData = {
        messageId: message.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        prize,
        winners,
        time,
        description,
        image,
        requiredRole,
        endTime: Date.now() + duration,
        participants: new Set(),
        creatorId: interaction.user.id
      };

      giveaways.set(message.id, giveawayData);

      // Ustawienie timerów
      setTimeout(async () => {
        await endGiveaway(message.id);
      }, duration);

      resolve({
        success: true,
        message: {
          embeds: [giveawayEmbed],
          components: [row]
        }
      });
    } catch (error) {
      console.error("Błąd podczas tworzenia giveawayu:", error);
      resolve({ success: false, message: "Wystąpił błąd podczas tworzenia giveawayu." });
    }
  });
}

async function endGiveaway(messageId) {
  const giveaway = giveaways.get(messageId);
  if (!giveaway) return;

  try {
    const channel = await client.channels.fetch(giveaway.channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId);
    if (!message) return;

    // Zakończenie giveawayu
    const participants = Array.from(giveaway.participants);
    
    let winners = [];
    if (participants.length >= giveaway.winners) {
      // Losowanie zwycięzców
      winners = [...participants]
        .sort(() => 0.5 - Math.random())
        .slice(0, giveaway.winners);
    }

    // Aktualizacja embeda
    const embed = message.embeds[0].toJSON();
    embed.fields.push(
      { name: "🎉 Zwycięzcy", value: winners.length > 0 ? winners.map(id => `<@${id}>`).join(", ") : "Nikt nie uczestniczył", inline: false }
    );
    embed.setTitle("🔚 GIVEAWAY ZAKOŃCZONY");

    // Wyłączenie przycisków
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_join_${Date.now()}`)
          .setLabel("🎁 Dołącz do giveawayu")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true)
      );

    await message.edit({ embeds: [embed], components: [row] });

    // Wysyłanie wiadomości zwycięzcom
    if (winners.length > 0) {
      const winnerMessage = winners.map(id => `<@${id}>`).join(", ");
      await channel.send(`🎉 Gratulacje ${winnerMessage}! Wygraliście **${giveaway.prize}**! 🎉`);
    }

    giveaways.delete(messageId);
  } catch (error) {
    console.error("Błąd podczas kończenia giveawayu:", error);
  }
}

module.exports = {
  createGiveaway,
  endGiveaway
};
