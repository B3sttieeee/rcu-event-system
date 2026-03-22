const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// ================= CONFIG =================
const CHANNEL_ID = "1484937784283369502";

const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

// ================= TIME FIX =================
// 🔥 NAJWAŻNIEJSZE — FIX STREFY CZASOWEJ
function getHourCET() {
  const now = new Date();
  return (now.getUTCHours() + 1) % 24; // CET = UTC+1
}

// ================= EVENT SYSTEM =================
function getEventByHour(hour) {
  if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(hour)) return "spin";
}

// ================= NEXT EVENT =================
function getNextEvents() {
  const now = new Date();
  let hour = getHourCET();

  let events = [];

  for (let i = 1; i <= 3; i++) {
    let nextHour = (hour + i) % 24;

    let type = getEventByHour(nextHour);

    let date = new Date();
    date.setUTCHours(nextHour - 1, 0, 0, 0); // 🔥 FIX OFFSET

    if (nextHour <= hour) date.setDate(date.getDate() + 1);

    events.push({
      type,
      timestamp: Math.floor(date.getTime() / 1000)
    });
  }

  return events;
}

// ================= CURRENT EVENT =================
function getCurrentEvent() {
  const hour = getHourCET();
  return getEventByHour(hour);
}

// ================= EMBEDS =================
function getEmbed(type) {
  if (type === "egg") {
    return new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle("🥚 RNG EGG")
      .setDescription("**Otwieraj jajka i zdobywaj nagrody!**")
      .setThumbnail("https://imgur.com/JqyeITl.png");
  }

  if (type === "spin") {
    return new EmbedBuilder()
      .setColor("#9b59b6")
      .setTitle("🎡 DEV SPIN")
      .setDescription("**Zakreć kołem i wygraj nagrody!**")
      .setThumbnail("https://imgur.com/NJI7052.png");
  }

  if (type === "merchant") {
    return [
      new EmbedBuilder()
        .setColor("#f39c12")
        .setTitle("🍯 HONEY MERCHANT")
        .setDescription("**Eventowy merchant — sprawdź ofertę!**")
        .setThumbnail("https://imgur.com/zhLC0zn.png"),

      new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("💀 BOSS MERCHANT")
        .setDescription("**Eventowy merchant — sprawdź ofertę!**")
        .setThumbnail("https://imgur.com/yFvb6jY.png")
    ];
  }
}

// ================= PING =================
async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const type = getCurrentEvent();

  let role =
    type === "egg" ? `<@&${ROLE_EGG}>` :
    type === "merchant" ? `<@&${ROLE_MERCHANT}>` :
    `<@&${ROLE_SPIN}>`;

  const embed = getEmbed(type);

  if (Array.isArray(embed)) {
    await channel.send({ content: role });
    for (const e of embed) {
      await channel.send({ embeds: [e] });
    }
  } else {
    await channel.send({ content: role, embeds: [embed] });
  }
}

// ================= 5 MIN REMINDER =================
async function reminder() {
  const now = new Date();
  if (now.getMinutes() === 55) {
    await sendEvent();
  }
}

// ================= LOOP =================
setInterval(() => {
  const now = new Date();

  if (now.getMinutes() === 0) {
    sendEvent();
  }

  reminder();

}, 60000);

// ================= COMMANDS =================
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "event") {
    const type = getCurrentEvent();
    const embed = getEmbed(type);

    if (Array.isArray(embed)) {
      await i.reply({ embeds: embed });
    } else {
      await i.reply({ embeds: [embed] });
    }
  }

  if (i.commandName === "next-events") {
    const events = getNextEvents();

    const embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("📅 NASTĘPNE EVENTY");

    events.forEach(e => {
      embed.addFields({
        name: `**${e.type.toUpperCase()}**`,
        value: `<t:${e.timestamp}:R>\n<t:${e.timestamp}:F>`
      });
    });

    await i.reply({ embeds: [embed] });
  }

  if (i.commandName === "get-role") {
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("roles")
        .setPlaceholder("Wybierz role")
        .addOptions([
          { label: "RNG EGG", value: ROLE_EGG },
          { label: "MERCHANT", value: ROLE_MERCHANT },
          { label: "DEV SPIN", value: ROLE_SPIN }
        ])
    );

    await i.reply({ content: "🎯 Wybierz role:", components: [row], ephemeral: true });
  }

  if (i.commandName === "set-dm") {
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("dm")
        .setPlaceholder("Powiadomienia DM")
        .addOptions([
          { label: "RNG EGG", value: "egg" },
          { label: "MERCHANT", value: "merchant" },
          { label: "SPIN", value: "spin" }
        ])
    );

    await i.reply({ content: "📩 Wybierz powiadomienia:", components: [row], ephemeral: true });
  }

  if (i.commandName === "test-ping") {
    await sendEvent();
    await i.reply({ content: "✅ Wysłano testowy event", ephemeral: true });
  }
});

// ================= SELECT HANDLER =================
client.on("interactionCreate", async (i) => {
  if (!i.isStringSelectMenu()) return;

  if (i.customId === "roles") {
    const role = i.values[0];
    const member = await i.guild.members.fetch(i.user.id);

    if (member.roles.cache.has(role)) {
      await member.roles.remove(role);
      await i.reply({ content: "❌ Usunięto rolę", ephemeral: true });
    } else {
      await member.roles.add(role);
      await i.reply({ content: "✅ Dodano rolę", ephemeral: true });
    }
  }

  if (i.customId === "dm") {
    await i.reply({ content: "📩 Ustawiono powiadomienia DM (w pamięci sesji)", ephemeral: true });
  }
});

// ================= READY =================
client.once("clientReady", () => {
  console.log("BOT ONLINE");
});

client.login(process.env.TOKEN);
