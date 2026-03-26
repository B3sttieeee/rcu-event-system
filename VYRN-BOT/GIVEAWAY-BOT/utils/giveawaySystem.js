const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const giveaways = new Map();

// ===== BONUS ROLE =====
const BONUS_ROLES = {
  "1476000458987278397": 1,
  "1476000995501670534": 2,
  "1476000459595448442": 4,
  "1476000991206707221": 6,
  "1476000991823532032": 10,
  "1476000992351879229": 15
};

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
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ===== BONUS TEXT =====
function getBonusText() {
  return Object.entries(BONUS_ROLES)
    .map(([id, val]) => `<@&${id}> ➜ +${val} wejść`)
    .join("\n");
}

// ===== EMBED =====
function buildEmbed(data) {
  const now = Date.now();
  const left = data.end - now;

  return new EmbedBuilder()
    .setColor("#ff8800")
    .setTitle("🎉 Giveaway")
    .setDescription(
`🎁 **${data.prize}**

👉 Kliknij **Join**, aby wziąć udział!

👥 **Uczestnicy:** ${data.users.length}
🏆 **Zwycięzcy:** ${data.winners}
⏳ **Koniec za:** ${left > 0 ? formatTime(left) : "Zakończono"}

🎟 **Bonusowe wejścia**
${getBonusText()}`
    )
    .setFooter({ text: "VYRN Giveaway System" })
    .setTimestamp();
}

// ===== CREATE =====
async function createGiveaway(interaction, data) {

  const duration = parseTime(data.time);
  if (!duration) throw new Error("Bad time");

  const giveawayData = {
    prize: data.prize,
    winners: data.winners,
    end: Date.now() + duration,
    users: [],
    channelId: interaction.channel.id
  };

  const embed = buildEmbed(giveawayData);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gw_join")
      .setLabel("🎉 Join")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("gw_leave")
      .setLabel("❌ Leave")
      .setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.channel.send({
    embeds: [embed],
    components: [row]
  });

  giveawayData.messageId = msg.id;
  giveaways.set(msg.id, giveawayData);

  // ===== LIVE UPDATE =====
  const interval = setInterval(async () => {
    const data = giveaways.get(msg.id);
    if (!data) return clearInterval(interval);

    try {
      await msg.edit({ embeds: [buildEmbed(data)] });
    } catch {}

    if (Date.now() >= data.end) {
      clearInterval(interval);
      endGiveaway(msg, data);
    }

  }, 5000);
}

// ===== END =====
async function endGiveaway(message, data) {

  const winners = [];
  const pool = [];

  for (const id of data.users) {
    const member = await message.guild.members.fetch(id).catch(()=>null);
    if (!member) continue;

    let entries = 1;

    for (const roleId in BONUS_ROLES) {
      if (member.roles.cache.has(roleId)) {
        entries += BONUS_ROLES[roleId];
      }
    }

    for (let i = 0; i < entries; i++) {
      pool.push(id);
    }
  }

  for (let i = 0; i < data.winners; i++) {
    if (pool.length === 0) break;

    const winner = pool[Math.floor(Math.random() * pool.length)];
    winners.push(winner);

    // remove duplicates
    for (let j = pool.length - 1; j >= 0; j--) {
      if (pool[j] === winner) pool.splice(j, 1);
    }
  }

  const embed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("🎉 Giveaway Zakończony")
    .setDescription(
`🎁 **${data.prize}**

🏆 **Wygrani:**
${winners.length ? winners.map(w => `<@${w}>`).join("\n") : "Brak"}

👥 Uczestnicy: ${data.users.length}`
    );

  await message.edit({ embeds: [embed], components: [] });

  // PRIVATE CHANNEL
  if (winners.length) {
    const channel = await message.guild.channels.create({
      name: `giveaway-win`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: message.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        ...winners.map(id => ({
          id,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }))
      ]
    });

    channel.send(`🎉 Gratulacje ${winners.map(w => `<@${w}>`).join(", ")}`);
  }

  giveaways.delete(message.id);
}

// ===== HANDLE BUTTONS =====
async function handleGiveaway(interaction) {

  const data = giveaways.get(interaction.message.id);
  if (!data) return;

  const userId = interaction.user.id;

  // ===== JOIN =====
  if (interaction.customId === "gw_join") {

    if (!data.users.includes(userId)) {
      data.users.push(userId);
    }

    await interaction.reply({
      content: "✅ Dołączyłeś!",
      ephemeral: true
    });

    // update embed instantly
    interaction.message.edit({
      embeds: [buildEmbed(data)]
    }).catch(()=>{});
  }

  // ===== LEAVE =====
  if (interaction.customId === "gw_leave") {

    data.users = data.users.filter(id => id !== userId);

    await interaction.reply({
      content: "❌ Opuściłeś giveaway",
      ephemeral: true
    });

    interaction.message.edit({
      embeds: [buildEmbed(data)]
    }).catch(()=>{});
  }
}

module.exports = {
  createGiveaway,
  handleGiveaway
};
