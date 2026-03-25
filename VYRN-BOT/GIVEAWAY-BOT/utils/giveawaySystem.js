const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");

// ===== DB =====
const DB_PATH = "./giveaways.json";

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ giveaways: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== TIME PARSER =====
function parseTime(time) {
  const num = parseInt(time);

  if (time.endsWith("s")) return num * 1000;
  if (time.endsWith("m")) return num * 60000;
  if (time.endsWith("h")) return num * 3600000;
  if (time.endsWith("d")) return num * 86400000;

  return null;
}

// ===== FORMAT TIME =====
function formatTime(ms) {
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / 60000) % 60;
  const hr = Math.floor(ms / 3600000);

  return `${hr}h ${min}m ${sec}s`;
}

// ===== CREATE GIVEAWAY =====
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
  if (!ms) throw new Error("Bad time format");

  const endAt = Date.now() + ms;

  const embed = new EmbedBuilder()
    .setColor("#facc15")
    .setTitle("🎉 GIVEAWAY")
    .setDescription(
`🎁 **Prize:** ${prize}

👑 **Host:** ${host}

🏆 **Winners:** ${winners}
⏳ **Ends in:** ${formatTime(ms)}

🎭 **Required Roles:**
${requiredRoles.length ? requiredRoles.map(r => `<@&${r}>`).join("\n") : "None"}

✨ **Bonus Roles:**
${Object.keys(bonusRoles).length
  ? Object.entries(bonusRoles).map(([r, x]) => `<@&${r}> → +${x} entries`).join("\n")
  : "None"}

👥 **Participants:** 0`
    )
    .setImage(image || null)
    .setFooter({ text: "Click button to join!" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("giveaway_join")
      .setLabel("🎉 Join")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("giveaway_leave")
      .setLabel("❌ Leave")
      .setStyle(ButtonStyle.Danger)
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
    endAt,
    winners,
    participants: [],
    requiredRoles,
    bonusRoles
  };

  saveDB(db);

  // ===== END TIMER =====
  setTimeout(async () => {
    await endGiveaway(client, msg.id);
  }, ms);
}

// ===== JOIN =====
async function handleJoin(interaction) {
  const db = loadDB();
  const data = db.giveaways[interaction.message.id];

  if (!data) return;

  const member = interaction.member;

  // required roles check
  if (data.requiredRoles.length) {
    const hasRole = data.requiredRoles.some(r => member.roles.cache.has(r));
    if (!hasRole) {
      return interaction.reply({
        content: "❌ You don't have required role",
        ephemeral: true
      });
    }
  }

  if (data.participants.includes(member.id)) {
    return interaction.reply({
      content: "❌ Already joined",
      ephemeral: true
    });
  }

  data.participants.push(member.id);
  saveDB(db);

  await updateEmbed(interaction.message, data);

  interaction.reply({ content: "✅ Joined!", ephemeral: true });
}

// ===== LEAVE =====
async function handleLeave(interaction) {
  const db = loadDB();
  const data = db.giveaways[interaction.message.id];

  if (!data) return;

  data.participants = data.participants.filter(id => id !== interaction.user.id);
  saveDB(db);

  await updateEmbed(interaction.message, data);

  interaction.reply({ content: "❌ Left giveaway", ephemeral: true });
}

// ===== UPDATE EMBED =====
async function updateEmbed(message, data) {
  const embed = EmbedBuilder.from(message.embeds[0]);

  embed.setDescription(
embed.data.description.replace(
/👥 \*\*Participants:\*\* \d+/,
`👥 **Participants:** ${data.participants.length}`
)
  );

  await message.edit({ embeds: [embed] });
}

// ===== END GIVEAWAY =====
async function endGiveaway(client, messageId) {
  const db = loadDB();
  const data = db.giveaways[messageId];
  if (!data) return;

  const channel = await client.channels.fetch(data.channelId);
  const msg = await channel.messages.fetch(messageId);

  let pool = [];

  for (const userId of data.participants) {
    const member = await channel.guild.members.fetch(userId).catch(()=>null);
    if (!member) continue;

    let entries = 1;

    for (const roleId in data.bonusRoles) {
      if (member.roles.cache.has(roleId)) {
        entries += data.bonusRoles[roleId];
      }
    }

    for (let i = 0; i < entries; i++) {
      pool.push(userId);
    }
  }

  const winners = [];

  for (let i = 0; i < data.winners; i++) {
    if (!pool.length) break;
    const win = pool[Math.floor(Math.random() * pool.length)];
    winners.push(win);
    pool = pool.filter(x => x !== win);
  }

  const resultEmbed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("🎉 GIVEAWAY ENDED")
    .setDescription(
`🎁 **Prize:** ${data.prize}

🏆 **Winners:**
${winners.length ? winners.map(w => `<@${w}>`).join("\n") : "No winners"}` 
    );

  await msg.edit({
    embeds: [resultEmbed],
    components: []
  });

  delete db.giveaways[messageId];
  saveDB(db);
}

// ===== INTERACTION HANDLER =====
async function handle(interaction) {
  if (!interaction.isButton()) return;

  if (interaction.customId === "giveaway_join") {
    return handleJoin(interaction);
  }

  if (interaction.customId === "giveaway_leave") {
    return handleLeave(interaction);
  }
}

module.exports = {
  createGiveaway,
  handle
};
