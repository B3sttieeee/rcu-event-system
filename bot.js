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

// 📢 Kanał
const CHANNEL_ID = "1484937784283369502";

// 🎭 Role
const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

// 👑 Autor + start
const AUTHOR = "B3sttiee";
const START_DATE = "2026-03-22";

// ✏️ OPISY
const DESCRIPTIONS = {
  egg: `✨ **Otwieraj jajka i zdobywaj nagrody!**
🎁 Unikalne dropy
💰 Bonusy
🔥 Event limitowany`,

  spin: `🎯 **Zakreć kołem!**
🎁 Nagrody
💎 Rzadkie itemy
⚡ Spróbuj szczęścia`,

  honey: `🛒 **Merchant eventowy**
💰 Limitowane oferty
🔥 Rzadkie itemy`,

  boss: `⚔️ **Boss merchant**
💎 Epickie nagrody
👑 Najlepsze itemy`
};

// ================= TIME =================

// 🔥 POPRAWNY CET (bez bugów)
function getNowCET() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
}

function getHourCET() {
  return getNowCET().getHours();
}

// ================= EVENT SYSTEM =================

function getEventByHour(hour) {
  if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(hour)) return "spin";
}

// ================= NEXT EVENTS =================

function getNextEvents() {
  const now = getNowCET();
  const currentHour = now.getHours();

  let events = [];

  for (let i = 1; i <= 3; i++) {
    let next = new Date(now);
    next.setHours(currentHour + i, 0, 0, 0);

    let hour = next.getHours();
    let type = getEventByHour(hour);

    events.push({
      type,
      timestamp: Math.floor(next.getTime() / 1000)
    });
  }

  return events;
}

// ================= EMBED BASE =================

function baseEmbed(embed) {
  return embed
    .setFooter({
      text: `Start: ${START_DATE} • Twórca: ${AUTHOR}`
    })
    .setTimestamp();
}

// ================= EMBEDS =================

function getEmbed(type) {

  if (type === "egg") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#f1c40f")
        .setTitle("🥚 RNG EGG EVENT")
        .setDescription(DESCRIPTIONS.egg)
        .setThumbnail("https://imgur.com/JqyeITl.png")
    );
  }

  if (type === "spin") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("🎡 DEV SPIN EVENT")
        .setDescription(DESCRIPTIONS.spin)
        .setThumbnail("https://imgur.com/NJI7052.png")
    );
  }

  if (type === "merchant") {
    return [
      baseEmbed(
        new EmbedBuilder()
          .setColor("#f39c12")
          .setTitle("🍯 HONEY MERCHANT")
          .setDescription(DESCRIPTIONS.honey)
          .setThumbnail("https://imgur.com/zhLC0zn.png")
      ),
      baseEmbed(
        new EmbedBuilder()
          .setColor("#e74c3c")
          .setTitle("💀 BOSS MERCHANT")
          .setDescription(DESCRIPTIONS.boss)
          .setThumbnail("https://imgur.com/yFvb6jY.png")
      )
    ];
  }
}

// ================= SEND EVENT =================

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const type = getEventByHour(getHourCET());

  let role =
    type === "egg" ? `<@&${ROLE_EGG}>` :
    type === "merchant" ? `<@&${ROLE_MERCHANT}>` :
    `<@&${ROLE_SPIN}>`;

  const embed = getEmbed(type);

  if (Array.isArray(embed)) {
    await channel.send({ content: `${role}\n━━━━━━━━━━━━━━━` });
    for (const e of embed) {
      await channel.send({ embeds: [e] });
    }
  } else {
    await channel.send({
      content: `${role}\n━━━━━━━━━━━━━━━`,
      embeds: [embed]
    });
  }
}

// ================= GIVEAWAY (PROSTY) =================

async function sendGiveaway(channel, prize, durationMinutes) {
  const end = Math.floor((Date.now() + durationMinutes * 60000) / 1000);

  const embed = new EmbedBuilder()
    .setColor("#00ffcc")
    .setTitle("🎉 GIVEAWAY")
    .setDescription(`🎁 **Nagroda:** ${prize}\n⏳ Koniec: <t:${end}:R>\n\nKliknij 🎉 aby wziąć udział!`)
    .setFooter({ text: `Twórca: ${AUTHOR}` })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  await msg.react("🎉");

  setTimeout(async () => {
    const fetched = await channel.messages.fetch(msg.id);
    const users = await fetched.reactions.cache.get("🎉").users.fetch();

    const valid = users.filter(u => !u.bot).map(u => u.id);

    if (!valid.length) {
      channel.send("❌ Brak uczestników");
      return;
    }

    const winner = valid[Math.floor(Math.random() * valid.length)];
    channel.send(`🏆 Wygrywa: <@${winner}> | Nagroda: **${prize}**`);
  }, durationMinutes * 60000);
}

// ================= LOOP =================

setInterval(() => {
  const now = getNowCET();

  if (now.getMinutes() === 0) sendEvent();
  if (now.getMinutes() === 55) sendEvent();

}, 60000);

// ================= COMMANDS =================

client.on("interactionCreate", async (i) => {

  if (i.isChatInputCommand()) {

    // EVENT
    if (i.commandName === "event") {
      const embed = getEmbed(getEventByHour(getHourCET()));
      return i.reply({ embeds: Array.isArray(embed) ? embed : [embed] });
    }

    // NEXT EVENTS ✅ FIXED
    if (i.commandName === "next-events") {
      const events = getNextEvents();

      const embed = baseEmbed(
        new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle("📅 NASTĘPNE EVENTY")
      );

      events.forEach(e => {
        embed.addFields({
          name: `🔹 ${e.type.toUpperCase()}`,
          value: `<t:${e.timestamp}:R>\n<t:${e.timestamp}:F>`
        });
      });

      return i.reply({ embeds: [embed] });
    }

    // ROLES PICKER
    if (i.commandName === "roles-picker") {
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("roles_select")
          .setPlaceholder("🎯 Wybierz role")
          .setMinValues(1)
          .setMaxValues(3)
          .addOptions([
            { label: "RNG EGG", value: ROLE_EGG, emoji: "🥚" },
            { label: "MERCHANT", value: ROLE_MERCHANT, emoji: "🛒" },
            { label: "DEV SPIN", value: ROLE_SPIN, emoji: "🎡" }
          ])
      );

      return i.reply({
        content: "📢 Wybierz role:",
        components: [row],
        ephemeral: true
      });
    }

    // TEST EVENT ✅ FIXED
    if (i.commandName === "test-event") {
      await sendEvent();
      return i.reply({ content: "✅ Event wysłany!", ephemeral: true });
    }

    // GIVEAWAY ✅ DZIAŁA
    if (i.commandName === "giveaway") {
      const prize = i.options.getString("nagroda");
      const time = i.options.getInteger("czas");

      const channel = await client.channels.fetch(CHANNEL_ID);

      await sendGiveaway(channel, prize, time);

      return i.reply({
        content: `🎉 Giveaway wystartował: **${prize}**`,
        ephemeral: true
      });
    }
  }

  // SELECT MENU
  if (i.isStringSelectMenu()) {
    if (i.customId === "roles_select") {
      const member = await i.guild.members.fetch(i.user.id);

      const allRoles = [ROLE_EGG, ROLE_MERCHANT, ROLE_SPIN];

      for (const role of allRoles) {
        if (member.roles.cache.has(role)) {
          await member.roles.remove(role);
        }
      }

      for (const role of i.values) {
        await member.roles.add(role);
      }

      return i.reply({
        content: "✅ Role zaktualizowane!",
        ephemeral: true
      });
    }
  }
});

// ================= READY =================

client.once("clientReady", () => {
  console.log("✅ BOT ONLINE");
});

// ================= LOGIN =================

client.login(process.env.TOKEN);
