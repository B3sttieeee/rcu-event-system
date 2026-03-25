const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const fs = require("fs");

const DB = "./giveaways.json";

// ===== LOAD DB =====
function load() {
  if (!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(DB));
}

function save(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// ===== PARSE TIME (FIXED 🔥) =====
function parseTime(time) {
  const match = time.match(/^(\d+)(s|m|h|d)$/);

  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  const map = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000
  };

  return value * map[unit];
}

// ===== FORMAT TIME =====
function formatTime(ms) {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`;
  return `${Math.floor(ms / 86400000)}d`;
}

// ===== CREATE =====
async function createGiveaway(interaction, data) {

  const duration = parseTime(data.time);

  if (!duration) throw new Error("Bad time");

  const end = Date.now() + duration;

  const embed = new EmbedBuilder()
    .setColor("#ff8800")
    .setTitle("🎉 Giveaway")
    .setDescription(
`🎁 **Prize:** ${data.prize}

👥 **Participants:** 0
🏆 **Winners:** ${data.winners}
⏳ **Ends in:** ${formatTime(duration)}

👉 Kliknij **Join** aby wziąć udział!`
    )
    .setFooter({ text: "VYRN Giveaway System" })
    .setTimestamp(end);

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

  const msg = await interaction.channel.send({
    embeds: [embed],
    components: [row]
  });

  const db = load();

  db[msg.id] = {
    prize: data.prize,
    winners: data.winners,
    end,
    users: [],
    channelId: interaction.channel.id,
    guildId: interaction.guild.id
  };

  save(db);

  // ===== END TIMER =====
  setTimeout(() => endGiveaway(msg.id, interaction.client), duration);
}

// ===== JOIN =====
async function join(interaction) {
  const db = load();
  const gw = db[interaction.message.id];
  if (!gw) return;

  if (!gw.users.includes(interaction.user.id)) {
    gw.users.push(interaction.user.id);
  }

  save(db);

  updateEmbed(interaction.message, gw);

  return interaction.reply({ content: "✅ Dołączyłeś!", ephemeral: true });
}

// ===== LEAVE =====
async function leave(interaction) {
  const db = load();
  const gw = db[interaction.message.id];
  if (!gw) return;

  gw.users = gw.users.filter(u => u !== interaction.user.id);

  save(db);

  updateEmbed(interaction.message, gw);

  return interaction.reply({ content: "❌ Opuściłeś giveaway", ephemeral: true });
}

// ===== UPDATE EMBED =====
async function updateEmbed(message, gw) {

  const embed = EmbedBuilder.from(message.embeds[0])
    .setDescription(
`🎁 **Prize:** ${gw.prize}

👥 **Participants:** ${gw.users.length}
🏆 **Winners:** ${gw.winners}

👉 Kliknij **Join** aby wziąć udział!`
    );

  await message.edit({ embeds: [embed] });
}

// ===== END =====
async function endGiveaway(id, client) {
  const db = load();
  const gw = db[id];
  if (!gw) return;

  const channel = await client.channels.fetch(gw.channelId);

  let winners = [];

  if (gw.users.length > 0) {
    winners = gw.users.sort(() => 0.5 - Math.random()).slice(0, gw.winners);
  }

  const winnerMentions = winners.map(id => `<@${id}>`).join(", ") || "Brak";

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("🎉 Giveaway Ended")
        .setDescription(
`🎁 **Prize:** ${gw.prize}

🏆 **Winners:**
${winnerMentions}`
        )
    ]
  });

  // ===== PRIVATE CHANNEL =====
  if (winners.length > 0) {
    for (const id of winners) {
      await channel.guild.channels.create({
        name: `win-${id}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: channel.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id,
            allow: [PermissionsBitField.Flags.ViewChannel]
          }
        ]
      });
    }
  }

  delete db[id];
  save(db);
}

// ===== HANDLE =====
async function handle(interaction) {
  if (!interaction.isButton()) return;

  if (interaction.customId === "gw_join") return join(interaction);
  if (interaction.customId === "gw_leave") return leave(interaction);
}

module.exports = {
  createGiveaway,
  handle
};
