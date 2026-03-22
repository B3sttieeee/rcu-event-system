const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  REST,
  Routes
} = require("discord.js");

// ===== CONFIG =====
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CHANNEL_ID = "1484937784283369502";

// ROLE
const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

// IMAGES
const IMG = {
  egg: "https://imgur.com/pY2xNUL.png",
  honey: "https://imgur.com/SsvlJ5a.png",
  boss: "https://imgur.com/VU9KdMS.png",
  spin: "https://imgur.com/LeXDgiJ.png"
};

// ===== CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== USER DM SETTINGS =====
const userDM = new Map();

// ===== EVENT SYSTEM =====
function getEventType(h) {
  if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(h)) return "spin";
}

// ===== GET NEXT EVENTS (FIXED TIME) =====
function getNextEvents() {
  const now = new Date();
  const list = [];

  for (let i = 1; i <= 24; i++) {
    const d = new Date(now);
    d.setHours(now.getHours() + i);
    d.setMinutes(0, 0, 0);

    list.push({
      type: getEventType(d.getHours()),
      date: d
    });

    if (list.length === 2) break;
  }

  return list;
}

// ===== EMBEDS =====
function eggEmbed() {
  return new EmbedBuilder()
    .setColor("#f1c40f")
    .setTitle("🥚 **RNG EGG EVENT**")
    .setDescription(
`**Otwieraj jajka i zdobywaj punkty Tieru!**

• Lepsze pety = więcej punktów  
• Lepszy Tier = lepsze bonusy`
    )
    .setThumbnail(IMG.egg);
}

function honeyEmbed() {
  return new EmbedBuilder()
    .setColor("#f39c12")
    .setTitle("🍯 **HONEY MERCHANT**")
    .setDescription(
`**Eventowy merchant — sprawdź ofertę!**

• Za miód kupisz przedmioty  
• Szansa Supreme: **110%**

⏳ Znika po 15 minutach`
    )
    .setThumbnail(IMG.honey);
}

function bossEmbed() {
  return new EmbedBuilder()
    .setColor("#e74c3c")
    .setTitle("🔴 **BOSS MERCHANT**")
    .setDescription(
`**Eventowy merchant — Anniversary Event!**

• Za żetony kupisz przedmioty  
• Szansa Supreme: **125%**

⏳ Znika po 15 minutach`
    )
    .setThumbnail(IMG.boss);
}

function spinEmbed() {
  return new EmbedBuilder()
    .setColor("#9b59b6")
    .setTitle("🎡 **DEV SPIN EVENT**")
    .setDescription(
`**Kręć kołem i zdobywaj nagrody!**

• Szansa Supreme: **??%**`
    )
    .setThumbnail(IMG.spin);
}

// ===== SEND EVENT =====
async function sendEvent(type) {
  const channel = await client.channels.fetch(CHANNEL_ID);

  if (type === "egg") {
    await channel.send({
      content: `<@&${ROLE_EGG}>`,
      embeds: [eggEmbed()]
    });
  }

  if (type === "merchant") {
    await channel.send({ content: `<@&${ROLE_MERCHANT}>` });
    await channel.send({ embeds: [honeyEmbed()] });
    await channel.send({ embeds: [bossEmbed()] });
  }

  if (type === "spin") {
    await channel.send({
      content: `<@&${ROLE_SPIN}>`,
      embeds: [spinEmbed()]
    });
  }

  sendDM(type);
}

// ===== DM NOTIFICATIONS =====
async function sendDM(type) {
  for (const [userId, prefs] of userDM.entries()) {
    if (!prefs.includes(type)) continue;

    try {
      const user = await client.users.fetch(userId);

      if (type === "egg") await user.send({ embeds: [eggEmbed()] });
      if (type === "merchant") await user.send({ embeds: [honeyEmbed(), bossEmbed()] });
      if (type === "spin") await user.send({ embeds: [spinEmbed()] });

    } catch {}
  }
}

// ===== REMINDER 5 MIN =====
setInterval(async () => {
  const now = new Date();

  if (now.getMinutes() === 55) {
    const next = getEventType((now.getHours() + 1) % 24);
    const channel = await client.channels.fetch(CHANNEL_ID);

    await channel.send(`⏰ Za 5 minut event: **${next.toUpperCase()}**`);
  }
}, 60000);

// ===== MAIN EVENT LOOP =====
setInterval(() => {
  const now = new Date();

  if (now.getMinutes() === 0 && now.getSeconds() === 0) {
    const type = getEventType(now.getHours());
    sendEvent(type);
  }
}, 1000);

// ===== READY =====
client.once("ready", async () => {
  console.log("✅ BOT ONLINE");

  const commands = [
    { name: "event", description: "Aktualny event" },
    { name: "next-events", description: "Następne eventy" },
    { name: "test-ping", description: "Test eventu" },
    { name: "get-role", description: "Wybierz role" },
    { name: "set-dm", description: "Powiadomienia DM" }
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Komendy gotowe");
});

// ===== COMMANDS =====
client.on("interactionCreate", async (i) => {

  if (i.isChatInputCommand()) {

    const now = new Date();
    const type = getEventType(now.getHours());

    if (i.commandName === "event") {
      if (type === "egg") return i.reply({ embeds: [eggEmbed()] });
      if (type === "merchant") return i.reply({ embeds: [honeyEmbed(), bossEmbed()] });
      if (type === "spin") return i.reply({ embeds: [spinEmbed()] });
    }

    if (i.commandName === "next-events") {
      const ev = getNextEvents();

      return i.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle("📅 **NASTĘPNE EVENTY**")
            .setDescription(
              ev.map(e =>
`**${e.type.toUpperCase()}**
<t:${Math.floor(e.date.getTime()/1000)}:R>
<t:${Math.floor(e.date.getTime()/1000)}:F>`
              ).join("\n\n")
            )
        ]
      });
    }

    if (i.commandName === "test-ping") {
      await sendEvent(type);
      return i.reply({ content: "✅ Test wysłany", ephemeral: true });
    }

    if (i.commandName === "get-role") {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("roles")
        .setPlaceholder("Wybierz eventy")
        .setMinValues(1)
        .setMaxValues(3)
        .addOptions([
          { label: "RNG EGG", value: ROLE_EGG },
          { label: "MERCHANT", value: ROLE_MERCHANT },
          { label: "DEV SPIN", value: ROLE_SPIN }
        ]);

      return i.reply({
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true
      });
    }

    if (i.commandName === "set-dm") {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("dm")
        .setPlaceholder("Powiadomienia DM")
        .addOptions([
          { label: "RNG EGG", value: "egg" },
          { label: "MERCHANT", value: "merchant" },
          { label: "DEV SPIN", value: "spin" }
        ]);

      return i.reply({
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true
      });
    }

  }

  if (i.isStringSelectMenu()) {

    if (i.customId === "roles") {
      for (const role of [ROLE_EGG, ROLE_MERCHANT, ROLE_SPIN]) {
        await i.member.roles.remove(role).catch(() => {});
      }

      for (const role of i.values) {
        await i.member.roles.add(role).catch(() => {});
      }

      return i.reply({ content: "✅ Role ustawione", ephemeral: true });
    }

    if (i.customId === "dm") {
      userDM.set(i.user.id, i.values);
      return i.reply({ content: "✅ DM ustawione", ephemeral: true });
    }
  }

});

client.login(TOKEN);
