process.env.TZ = "Europe/Warsaw";

const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CHANNEL_ID = "1484937784283369502";

// ===== ROLE =====
const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

// ===== IMG =====
const IMG = {
  egg: "https://imgur.com/pY2xNUL.png",
  boss: "https://imgur.com/VU9KdMS.png",
  honey: "https://imgur.com/SsvlJ5a.png",
  spin: "https://imgur.com/LeXDgiJ.png"
};

// ===== GODZINY =====
const HOURS = {
  egg: [0,3,6,9,12,15,18,21],
  merchant: [1,4,7,10,13,16,19,22],
  spin: [2,5,8,11,14,17,20,23]
};

// ===== EVENTY =====
function getEventByHour(hour) {
  if (HOURS.egg.includes(hour)) return "egg";
  if (HOURS.merchant.includes(hour)) return "merchant";
  if (HOURS.spin.includes(hour)) return "spin";
}

function getCurrentEvent() {
  return getEventByHour(new Date().getHours());
}

// ===== NEXT =====
function getNextEvents() {
  const now = new Date();
  const currentHour = now.getHours();
  let list = [];

  for (let i = 1; i <= 24; i++) {
    let hour = (currentHour + i) % 24;
    let type = getEventByHour(hour);

    if (type) {
      let date = new Date();
      date.setHours(hour, 0, 0, 0);

      if (hour <= currentHour) {
        date.setDate(date.getDate() + 1);
      }

      list.push({ type, time: date });

      if (list.length === 2) break;
    }
  }

  return list;
}

// ===== EMBEDY =====
function buildEmbeds(type) {

  if (type === "egg") {
    return [
      new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle("🥚 RNG EGG")
        .setDescription(
`**Otwieraj jajka i zdobywaj punkty Tieru!**

• Lepsze pety = więcej punktów  
• Lepszy Tier = lepsze nagrody`
        )
        .setThumbnail(IMG.egg)
    ];
  }

  if (type === "merchant") {
    return [
      new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("🔴 BOSS MERCHANT")
        .setDescription(
`Eventowy merchant!

• Za tokeny z bossów kupisz przedmioty  
• Szansa Supreme: **125%**

📍 Anniversary Event  
⏱ 15 minut

👉 Sprawdź ofertę!`
        )
        .setThumbnail(IMG.boss),

      new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("🟡 HONEY MERCHANT")
        .setDescription(
`Eventowy merchant!

• Za miód kupisz przedmioty  
• Szansa Supreme: **110%**

⏱ 15 minut

👉 Sprawdź ofertę!`
        )
        .setThumbnail(IMG.honey)
    ];
  }

  if (type === "spin") {
    return [
      new EmbedBuilder()
        .setColor("#9B59B6")
        .setTitle("🎡 DEV SPIN")
        .setDescription(
`Kręć kołem i zdobywaj nagrody!

Szansa Supreme: ??%`
        )
        .setThumbnail(IMG.spin)
    ];
  }
}

// ===== COMMANDS =====
const commands = [
  { name: "event", description: "Aktualny event" },
  { name: "next-events", description: "Następne eventy" },
  { name: "test-ping", description: "Test eventu" }
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

// ===== READY =====
client.once("clientReady", async () => {
  console.log("✅ BOT ONLINE");

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Komendy załadowane");

  startScheduler();
});

// ===== INTERACTION =====
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "event") {
    const embeds = buildEmbeds(getCurrentEvent());
    return i.reply({ embeds });
  }

  if (i.commandName === "next-events") {
    const next = getNextEvents();

    const embed = new EmbedBuilder()
      .setColor("#00FFFF")
      .setTitle("📅 NASTĘPNE EVENTY")
      .setDescription(
        next.map(e =>
          `**${e.type.toUpperCase()}** → <t:${Math.floor(e.time/1000)}:R>`
        ).join("\n")
      );

    return i.reply({ embeds: [embed] });
  }

  if (i.commandName === "test-ping") {
    const type = getCurrentEvent();
    return i.reply(`<@&${ROLES[type]}> TEST (${type})`);
  }
});

// ===== SCHEDULER =====
function startScheduler() {
  setInterval(async () => {
    const now = new Date();
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    if (!channel) return;

    const h = now.getHours();
    const m = now.getMinutes();

    const type = getEventByHour(h);

    // START EVENT
    if (m === 0 && type) {
      const embeds = buildEmbeds(type);

      // 🔥 1 ping, potem embedy
      await channel.send(`<@&${ROLES[type]}>`);

      for (const e of embeds) {
        await channel.send({ embeds: [e] });
      }
    }

    // REMINDER
    if (m === 55) {
      const next = getNextEvents()[0];
      await channel.send(`⏰ Za 5 minut: **${next.type.toUpperCase()}**`);
    }

  }, 60000);
}

client.login(TOKEN);
