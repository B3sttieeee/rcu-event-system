const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");
const config = JSON.parse(fs.readFileSync("./data.json", "utf8"));

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= CONFIG =================

const CHANNEL_ID = "1484937784283369502";

const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

// ================= TIME =================

function getNow() {
  return new Date();
}

// ================= EVENT SYSTEM (FIXED 100%) =================

function getEventByHour(hour) {
  const mod = hour % 3;

  if (mod === 0) return "egg";
  if (mod === 1) return "merchant";
  if (mod === 2) return "spin";
}

// ================= NEXT EVENTS =================

function getNextEvents() {
  const now = getNow();
  let events = [];

  for (let i = 1; i <= 3; i++) {
    let next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(now.getHours() + i);

    events.push({
      type: getEventByHour(next.getHours()),
      timestamp: Math.floor(next.getTime() / 1000)
    });
  }

  return events;
}

// ================= EMBED BASE =================

function baseEmbed(embed) {
  return embed
    .setFooter({
      text: `Start: ${config.startDate} • Twórca: ${config.author}`
    })
    .setTimestamp();
}

// ================= EMBEDS =================

function getEmbed(type) {

  if (type === "egg") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#ffd93d")
        .setTitle("🥚 RNG EGG EVENT")
        .setDescription(
`**➤ Otwieraj jajka i zdobywaj punkty!**

➤ Im lepsze pety zdobędziesz → więcej punktów  
➤ Więcej punktów → wyższy tier  
➤ Wyższy tier → lepsze nagrody  

✨ **Graj aktywnie i zgarnij bonusy!**`
        )
        .setThumbnail("https://imgur.com/JqyeITl.png")
    );
  }

  if (type === "spin") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("🎡 DEV SPIN EVENT")
        .setDescription(
`**➤ Zakręć kołem i zdobądź nagrody!**

➤ Losowe nagrody 🎁  
➤ Szansa na rzadkie itemy 💎  
➤ 🎯 Supreme (??%)  

⚡ **Spróbuj szczęścia!**`
        )
        .setThumbnail("https://imgur.com/NJI7052.png")
    );
  }

  if (type === "merchant") {
    return [
      baseEmbed(
        new EmbedBuilder()
          .setColor("#f39c12")
          .setTitle("🍯 HONEY MERCHANT")
          .setDescription(
`**➤ Zdobywaj miód na Bee World!**

➤ Zbieraj miód 🐝  
➤ Kupuj przedmioty  
➤ 🎯 Supreme (110%)  

🔥 **Farm = lepsze nagrody!**`
          )
          .setThumbnail("https://imgur.com/zhLC0zn.png")
      ),

      baseEmbed(
        new EmbedBuilder()
          .setColor("#e74c3c")
          .setTitle("💀 BOSS MERCHANT")
          .setDescription(
`**➤ Pokonuj bossy!**

➤ Zdobywaj tokeny ⚔️  
➤ Kupuj itemy  
➤ 🎯 Supreme (125%)  

👑 **Top loot dla najlepszych!**`
          )
          .setThumbnail("https://imgur.com/yFvb6jY.png")
      )
    ];
  }
}

// ================= SEND EVENT =================

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now = getNow();
  const type = getEventByHour(now.getHours());

  const role =
    type === "egg" ? `<@&${ROLE_EGG}>` :
    type === "merchant" ? `<@&${ROLE_MERCHANT}>` :
    `<@&${ROLE_SPIN}>`;

  await channel.send(`${role}\n━━━━━━━━━━━━━━━━━━━\n🚀 **EVENT WYSTARTOWAŁ!**`);

  const embed = getEmbed(type);

  if (Array.isArray(embed)) {
    for (const e of embed) await channel.send({ embeds: [e] });
  } else {
    await channel.send({ embeds: [embed] });
  }
}

// ================= REMINDER =================

async function sendReminder() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now = getNow();

  const nextHour = now.getHours() + 1;
  const type = getEventByHour(nextHour);

  const role =
    type === "egg" ? `<@&${ROLE_EGG}>` :
    type === "merchant" ? `<@&${ROLE_MERCHANT}>` :
    `<@&${ROLE_SPIN}>`;

  await channel.send(
    `⏳ ${role}\n━━━━━━━━━━━━━━━━━━━\n**Event ${type.toUpperCase()} za 5 minut!**`
  );
}

// ================= LOOP =================

setInterval(() => {
  const now = getNow();

  if (now.getMinutes() === 0) sendEvent();
  if (now.getMinutes() === 55) sendReminder();

}, 60000);

// ================= COMMANDS =================

client.on("interactionCreate", async (i) => {

  if (i.isChatInputCommand()) {

    if (i.commandName === "event") {
      const embed = getEmbed(getEventByHour(getNow().getHours()));
      return i.reply({ embeds: Array.isArray(embed) ? embed : [embed] });
    }

    if (i.commandName === "next-events") {
      const events = getNextEvents();

      const embed = baseEmbed(
        new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle("📅 NASTĘPNE EVENTY")
      );

      events.forEach(e => {
        embed.addFields({
          name: `➤ ${e.type.toUpperCase()}`,
          value: `<t:${e.timestamp}:R>\n<t:${e.timestamp}:F>`
        });
      });

      return i.reply({ embeds: [embed] });
    }

    if (i.commandName === "roles-picker") {
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("roles")
          .setMinValues(1)
          .setMaxValues(3)
          .addOptions([
            { label: "EGG", value: ROLE_EGG, emoji: "🥚" },
            { label: "MERCHANT", value: ROLE_MERCHANT, emoji: "🛒" },
            { label: "SPIN", value: ROLE_SPIN, emoji: "🎡" }
          ])
      );

      return i.reply({
        content: "Wybierz role:",
        components: [row],
        ephemeral: true
      });
    }
  }

  if (i.isStringSelectMenu()) {
    if (i.customId === "roles") {
      const member = await i.guild.members.fetch(i.user.id);

      const roles = [ROLE_EGG, ROLE_MERCHANT, ROLE_SPIN];

      for (const r of roles) {
        if (member.roles.cache.has(r)) await member.roles.remove(r);
      }

      for (const r of i.values) {
        await member.roles.add(r);
      }

      return i.reply({ content: "✅ Role ustawione!", ephemeral: true });
    }
  }
});

// ================= READY =================

client.once("clientReady", () => {
  console.log("✅ BOT ONLINE");
});

client.login(process.env.TOKEN);
