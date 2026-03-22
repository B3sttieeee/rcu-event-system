const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= CONFIG =================

const CHANNEL_ID = "1484937784283369502";

const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

const AUTHOR = "B3sttiee";
const START_DATE = "2026-03-22";

// ================= DM SYSTEM =================

const dmUsers = {
  egg: new Set(),
  merchant: new Set(),
  spin: new Set()
};

// ================= OPISY =================

const DESCRIPTIONS = {
  egg: `✨ **Otwieraj jajka i zdobywaj nagrody!**`,
  spin: `🎯 **Zakreć kołem i wygraj nagrody!**`,
  honey: `🛒 **Merchant eventowy**`,
  boss: `⚔️ **Boss merchant**`
};

// ================= TIME =================

function getNowCET() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
}

// ================= EVENT SYSTEM =================

function getEventByHour(hour) {
  if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(hour)) return "spin";
}

// ================= NEXT EVENTS (FIXED) =================

function getNextEvents() {
  const now = getNowCET();

  let events = [];

  for (let i = 1; i <= 3; i++) {
    let next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(now.getHours() + i);

    let type = getEventByHour(next.getHours());

    events.push({
      type,
      timestamp: Math.floor(next.getTime() / 1000)
    });
  }

  return events;
}

// ================= EMBED =================

function baseEmbed(embed) {
  return embed
    .setFooter({ text: `Start: ${START_DATE} • ${AUTHOR}` })
    .setTimestamp();
}

function getEmbed(type) {

  if (type === "egg") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#f1c40f")
        .setTitle("🥚 RNG EGG")
        .setDescription(DESCRIPTIONS.egg)
    );
  }

  if (type === "spin") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("🎡 DEV SPIN")
        .setDescription(DESCRIPTIONS.spin)
    );
  }

  if (type === "merchant") {
    return [
      baseEmbed(
        new EmbedBuilder()
          .setColor("#f39c12")
          .setTitle("🍯 HONEY MERCHANT")
          .setDescription(DESCRIPTIONS.honey)
      ),
      baseEmbed(
        new EmbedBuilder()
          .setColor("#e74c3c")
          .setTitle("💀 BOSS MERCHANT")
          .setDescription(DESCRIPTIONS.boss)
      )
    ];
  }
}

// ================= SEND EVENT =================

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now = getNowCET();
  const type = getEventByHour(now.getHours());

  const role =
    type === "egg" ? `<@&${ROLE_EGG}>` :
    type === "merchant" ? `<@&${ROLE_MERCHANT}>` :
    `<@&${ROLE_SPIN}>`;

  const embed = getEmbed(type);

  await channel.send({ content: role });

  if (Array.isArray(embed)) {
    for (const e of embed) {
      await channel.send({ embeds: [e] });
    }
  } else {
    await channel.send({ embeds: [embed] });
  }

  // DM USERS
  for (const userId of dmUsers[type]) {
    try {
      const user = await client.users.fetch(userId);
      await user.send(`🔔 Event **${type.toUpperCase()}** właśnie wystartował!`);
    } catch {}
  }
}

// ================= REMINDER (5 MIN BEFORE) =================

async function sendReminder() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now = getNowCET();

  const nextHour = (now.getHours() + 1) % 24;
  const type = getEventByHour(nextHour);

  const role =
    type === "egg" ? `<@&${ROLE_EGG}>` :
    type === "merchant" ? `<@&${ROLE_MERCHANT}>` :
    `<@&${ROLE_SPIN}>`;

  await channel.send(`⏳ ${role} Event **${type.toUpperCase()}** za 5 minut! Przygotuj się!`);
}

// ================= GIVEAWAY =================

async function sendGiveaway(channel, prize, minutes) {
  const end = Math.floor((Date.now() + minutes * 60000) / 1000);

  const embed = new EmbedBuilder()
    .setColor("#00ffcc")
    .setTitle("🎉 GIVEAWAY")
    .setDescription(`🎁 ${prize}\n⏳ <t:${end}:R>\nReaguj 🎉`)
    .setFooter({ text: AUTHOR });

  const msg = await channel.send({ embeds: [embed] });
  await msg.react("🎉");

  setTimeout(async () => {
    const fetched = await channel.messages.fetch(msg.id);
    const users = await fetched.reactions.cache.get("🎉").users.fetch();

    const valid = users.filter(u => !u.bot).map(u => u.id);

    if (!valid.length) return channel.send("❌ Brak uczestników");

    const winner = valid[Math.floor(Math.random() * valid.length)];
    channel.send(`🏆 Wygrywa <@${winner}> | ${prize}`);
  }, minutes * 60000);
}

// ================= LOOP =================

setInterval(() => {
  const now = getNowCET();

  if (now.getMinutes() === 0) sendEvent();
  if (now.getMinutes() === 55) sendReminder();

}, 60000);

// ================= COMMANDS =================

client.on("interactionCreate", async (i) => {

  if (i.isChatInputCommand()) {

    // NEXT EVENTS
    if (i.commandName === "next-events") {
      const events = getNextEvents();

      const embed = baseEmbed(
        new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle("📅 NASTĘPNE EVENTY")
      );

      events.forEach(e => {
        embed.addFields({
          name: e.type.toUpperCase(),
          value: `<t:${e.timestamp}:R>\n<t:${e.timestamp}:F>`
        });
      });

      return i.reply({ embeds: [embed] });
    }

    // SET DM ✅
    if (i.commandName === "set-dm") {
      const type = i.options.getString("event");

      dmUsers[type].add(i.user.id);

      return i.reply({
        content: `✅ Będziesz dostawać DM dla ${type}`,
        ephemeral: true
      });
    }

    // GIVEAWAY ✅
    if (i.commandName === "giveaway") {
      const prize = i.options.getString("nagroda");
      const time = i.options.getInteger("czas");

      const channel = await client.channels.fetch(CHANNEL_ID);

      await sendGiveaway(channel, prize, time);

      return i.reply({
        content: "✅ Giveaway wystartował",
        ephemeral: true
      });
    }

    // TEST EVENT
    if (i.commandName === "test-event") {
      await sendEvent();
      return i.reply({ content: "✅ OK", ephemeral: true });
    }
  }
});

// ================= READY =================

client.once("clientReady", () => {
  console.log("✅ BOT ONLINE");
});

client.login(process.env.TOKEN);
