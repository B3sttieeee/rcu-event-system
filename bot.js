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

// ✏️ OPISY (EDYTUJ SWOBODNIE)
const DESCRIPTIONS = {
  egg: `
✨ **Otwieraj jajka i zdobywaj nagrody!**

🎁 Szansa na unikalne dropy  
💰 Bonusowe nagrody  
🔥 Event ograniczony czasowo
`,

  spin: `
🎯 **Zakręć kołem i wygraj nagrody!**

🎁 Losowe nagrody  
💎 Rzadkie itemy  
⚡ Sprawdź swoje szczęście
`,

  honey: `
🛒 **Specjalny merchant eventowy**

💰 Limitowane oferty  
🔥 Rzadkie przedmioty  
⏳ Nie przegap!
`,

  boss: `
⚔️ **Boss merchant z top lootem**

💎 Epickie nagrody  
🔥 Najlepsze itemy  
👑 Tylko dla najlepszych
`
};

// ================= TIME =================

function getHourCET() {
  const now = new Date();
  return (now.getUTCHours() + 1) % 24;
}

// ================= EVENT SYSTEM =================

function getEventByHour(hour) {
  if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(hour)) return "spin";
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

// ================= LOOP =================

setInterval(() => {
  const now = new Date();

  if (now.getMinutes() === 0) {
    sendEvent();
  }

  if (now.getMinutes() === 55) {
    sendEvent();
  }

}, 60000);

// ================= COMMANDS =================

client.on("interactionCreate", async (i) => {

  // ===== SLASH =====
  if (i.isChatInputCommand()) {

    if (i.commandName === "event") {
      const embed = getEmbed(getEventByHour(getHourCET()));
      return i.reply({ embeds: Array.isArray(embed) ? embed : [embed] });
    }

    if (i.commandName === "roles-picker") {
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("roles_select")
          .setPlaceholder("🎯 Wybierz role")
          .setMinValues(1)
          .setMaxValues(3)
          .addOptions([
            {
              label: "RNG EGG",
              value: ROLE_EGG,
              emoji: "🥚"
            },
            {
              label: "MERCHANT",
              value: ROLE_MERCHANT,
              emoji: "🛒"
            },
            {
              label: "DEV SPIN",
              value: ROLE_SPIN,
              emoji: "🎡"
            }
          ])
      );

      return i.reply({
        content: "📢 Wybierz powiadomienia:",
        components: [row],
        ephemeral: true
      });
    }

    if (i.commandName === "test-ping") {
      await sendEvent();
      return i.reply({ content: "✅ Test wysłany", ephemeral: true });
    }
  }

  // ===== SELECT MENU =====
  if (i.isStringSelectMenu()) {

    if (i.customId === "roles_select") {
      const member = await i.guild.members.fetch(i.user.id);

      const allRoles = [ROLE_EGG, ROLE_MERCHANT, ROLE_SPIN];

      // usuń stare
      for (const role of allRoles) {
        if (member.roles.cache.has(role)) {
          await member.roles.remove(role);
        }
      }

      // dodaj nowe
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
