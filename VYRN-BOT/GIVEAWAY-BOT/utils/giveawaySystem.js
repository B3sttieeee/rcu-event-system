const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const giveaways = new Map();

// ================= PARSE TIME =================
function parseTime(time) {
  const match = time.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60000;
    case "h": return value * 3600000;
    case "d": return value * 86400000;
    default: return null;
  }
}

// ================= FORMAT TIME =================
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);

  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ================= CREATE GIVEAWAY =================
async function createGiveaway(interaction) {
  const prize = interaction.options.getString("prize");
  const time = interaction.options.getString("time");
  const winnersCount = interaction.options.getInteger("winners") || 1;
  const image = interaction.options.getString("image");

  const duration = parseTime(time);

  if (!duration) {
    throw new Error("Bad time");
  }

  const endTime = Date.now() + duration;

  const embed = new EmbedBuilder()
    .setColor("#f97316")
    .setTitle("🎉 GIVEAWAY")
    .setDescription(
      `🎁 **Nagroda:** ${prize}\n\n` +
      `👥 **Uczestnicy:** 0\n` +
      `🏆 **Wygrani:** ${winnersCount}\n` +
      `⏳ **Czas:** ${time}\n\n` +
      `👉 Kliknij **Join** aby wziąć udział!`
    )
    .setFooter({ text: "VYRN GIVEAWAY SYSTEM" })
    .setTimestamp(endTime);

  if (image) embed.setImage(image);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gw_join")
      .setLabel("Join")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("gw_leave")
      .setLabel("Leave")
      .setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.reply({
    embeds: [embed],
    components: [row],
    fetchReply: true
  });

  giveaways.set(msg.id, {
    prize,
    endTime,
    users: [],
    winnersCount,
    messageId: msg.id,
    channelId: msg.channel.id
  });

  // ===== END TIMER =====
  setTimeout(async () => {
    const data = giveaways.get(msg.id);
    if (!data) return;

    const channel = await interaction.guild.channels.fetch(data.channelId);
    const message = await channel.messages.fetch(data.messageId);

    if (!data.users.length) {
      await message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor("#ef4444")
            .setTitle("❌ Giveaway zakończony")
            .setDescription("Brak uczestników")
        ],
        components: []
      });
      return;
    }

    const winners = data.users
      .sort(() => 0.5 - Math.random())
      .slice(0, data.winnersCount);

    const winMentions = winners.map(id => `<@${id}>`).join(", ");

    await message.edit({
      embeds: [
        new EmbedBuilder()
          .setColor("#22c55e")
          .setTitle("🎉 Giveaway zakończony")
          .setDescription(
            `🎁 **Nagroda:** ${data.prize}\n\n` +
            `🏆 **Wygrani:** ${winMentions}`
          )
      ],
      components: []
    });

    // ===== PRIVATE CHANNEL =====
    for (const id of winners) {
      await interaction.guild.channels.create({
        name: `wygrana-${id}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: id,
            allow: [PermissionsBitField.Flags.ViewChannel]
          }
        ]
      });
    }

    giveaways.delete(msg.id);

  }, duration);
}

// ================= HANDLE BUTTON =================
async function handleButton(interaction) {
  const data = giveaways.get(interaction.message.id);
  if (!data) return;

  const userId = interaction.user.id;

  if (interaction.customId === "gw_join") {
    if (!data.users.includes(userId)) {
      data.users.push(userId);
    }
  }

  if (interaction.customId === "gw_leave") {
    data.users = data.users.filter(id => id !== userId);
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setDescription(
      `🎁 **Nagroda:** ${data.prize}\n\n` +
      `👥 **Uczestnicy:** ${data.users.length}\n` +
      `🏆 **Wygrani:** ${data.winnersCount}\n` +
      `⏳ **Czas końca:** <t:${Math.floor(data.endTime / 1000)}:R>\n\n` +
      `👉 Kliknij **Join** aby wziąć udział!`
    );

  await interaction.update({
    embeds: [embed]
  });
}

module.exports = {
  createGiveaway,
  handleButton
};
