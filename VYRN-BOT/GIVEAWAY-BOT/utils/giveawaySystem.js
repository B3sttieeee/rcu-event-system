const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");

const DB_PATH = "./giveaways.json";

// ===== DB =====
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ giveaways: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== TIME =====
function parseTime(time) {
  const num = parseInt(time);
  if (time.endsWith("s")) return num * 1000;
  if (time.endsWith("m")) return num * 60000;
  if (time.endsWith("h")) return num * 3600000;
  if (time.endsWith("d")) return num * 86400000;
  return null;
}

function formatTime(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

// ===== CREATE =====
async function createGiveaway({
  client,
  channel,
  host,
  prize,
  duration,
  winners,
  requiredRoles = [],
  bonusRoles = {},
  image
}) {

  const ms = parseTime(duration);
  if (!ms) throw new Error("Bad time");

  const embed = new EmbedBuilder()
    .setColor("#facc15")
    .setAuthor({ name: "🎉 Giveaway", iconURL: client.user.displayAvatarURL() })
    .setTitle(`🎁 ${prize}`)
    .setDescription("Kliknij przycisk aby wziąć udział!\n━━━━━━━━━━━━━━━━━━")
    .addFields(
      { name: "👑 Host", value: `${host}`, inline: true },
      { name: "🏆 Winners", value: `${winners}`, inline: true },
      { name: "⏳ Time", value: `\`${duration}\``, inline: true },
      { name: "👥 Participants", value: "`0`", inline: true },
      {
        name: "🎭 Required Roles",
        value: requiredRoles.length
          ? requiredRoles.map(r => `<@&${r}>`).join(", ")
          : "`None`"
      },
      {
        name: "✨ Bonus",
        value: Object.keys(bonusRoles).length
          ? Object.entries(bonusRoles).map(([r, x]) => `<@&${r}> +${x}`).join("\n")
          : "`None`"
      }
    )
    .setImage(image || null)
    .setFooter({ text: "🎯 Join to participate" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("giveaway_join")
      .setLabel("🎉 Join")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("giveaway_leave")
      .setLabel("Leave")
      .setStyle(ButtonStyle.Secondary)
  );

  const msg = await channel.send({
    embeds: [embed],
    components: [row]
  });

  const db = loadDB();

  db.giveaways[msg.id] = {
    channelId: channel.id,
    prize,
    host: host.id,
    winners,
    participants: [],
    requiredRoles,
    bonusRoles,
    endAt: Date.now() + ms
  };

  saveDB(db);

  setTimeout(() => endGiveaway(client, msg.id), ms);
}

// ===== JOIN =====
async function handleJoin(interaction) {
  const db = loadDB();
  const data = db.giveaways[interaction.message.id];
  if (!data) return;

  if (data.participants.includes(interaction.user.id)) {
    return interaction.reply({ content: "❌ Already joined", ephemeral: true });
  }

  data.participants.push(interaction.user.id);
  saveDB(db);

  await updateEmbed(interaction.message, data);

  interaction.reply({ content: "✅ Joined!", ephemeral: true });
}

// ===== LEAVE =====
async function handleLeave(interaction) {
  const db = loadDB();
  const data = db.giveaways[interaction.message.id];
  if (!data) return;

  data.participants = data.participants.filter(x => x !== interaction.user.id);
  saveDB(db);

  await updateEmbed(interaction.message, data);

  interaction.reply({ content: "❌ Left", ephemeral: true });
}

// ===== UPDATE =====
async function updateEmbed(msg, data) {
  const embed = EmbedBuilder.from(msg.embeds[0]);

  embed.data.fields[3].value = `\`${data.participants.length}\``;

  await msg.edit({ embeds: [embed] });
}

// ===== END =====
async function endGiveaway(client, id) {
  const db = loadDB();
  const data = db.giveaways[id];
  if (!data) return;

  const channel = await client.channels.fetch(data.channelId);
  const msg = await channel.messages.fetch(id);

  const winners = data.participants
    .sort(() => 0.5 - Math.random())
    .slice(0, data.winners);

  const embed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("🎉 Giveaway Ended")
    .setDescription(
      `🎁 ${data.prize}\n\n🏆 Winners:\n${winners.map(w => `<@${w}>`).join("\n") || "None"}`
    );

  await msg.edit({ embeds: [embed], components: [] });

  // ===== PRIVATE CHANNEL =====
  for (const userId of winners) {
    const member = await channel.guild.members.fetch(userId);

    await channel.guild.channels.create({
      name: `win-${member.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: channel.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: member.id,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }
      ]
    });
  }

  delete db.giveaways[id];
  saveDB(db);
}

// ===== REROLL =====
async function reroll(client, messageId) {
  const db = loadDB();
  const data = db.giveaways[messageId];
  if (!data) return "❌ Not found";

  const winner = data.participants[Math.floor(Math.random() * data.participants.length)];

  return `<@${winner}>`;
}

// ===== HANDLER =====
async function handle(interaction) {
  if (!interaction.isButton()) return;

  if (interaction.customId === "giveaway_join") return handleJoin(interaction);
  if (interaction.customId === "giveaway_leave") return handleLeave(interaction);
}

module.exports = {
  createGiveaway,
  handle,
  reroll
};
