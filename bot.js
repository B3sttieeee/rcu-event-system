const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  SlashCommandBuilder, 
  REST, 
  Routes 
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ===== ROLE ID =====
const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

// ===== OBRAZKI =====
const IMAGES = {
  egg: "https://imgur.com/pY2xNUL.png",
  boss: "https://imgur.com/VU9KdMS.png",
  honey: "https://imgur.com/SsvlJ5a.png",
  spin: "https://imgur.com/LeXDgiJ.png"
};

// ===== GODZINY (POPRAWNE) =====
const HOURS = {
  egg: [0,3,6,9,12,15,18,21],
  merchant: [1,4,7,10,13,16,19,22],
  spin: [2,5,8,11,14,17,20,23]
};

// ===== FUNKCJE CZASU =====
function getCurrentEvent() {
  const h = new Date().getHours();

  if (HOURS.egg.includes(h)) return "egg";
  if (HOURS.merchant.includes(h)) return "merchant";
  if (HOURS.spin.includes(h)) return "spin";
}

function getNextEvents(count = 2) {
  const now = new Date();
  let events = [];

  for (let i = 0; i < 48; i++) {
    let d = new Date(now.getTime() + i * 3600000);
    let h = d.getHours();

    let type = null;
    if (HOURS.egg.includes(h)) type = "egg";
    if (HOURS.merchant.includes(h)) type = "merchant";
    if (HOURS.spin.includes(h)) type = "spin";

    if (type) {
      d.setMinutes(0,0,0); // dokładnie godzina!
      events.push({ type, time: d });
    }

    if (events.length >= count) break;
  }

  return events;
}

// ===== EMBEDY =====
function buildEventEmbed(type) {
  if (type === "egg") {
    return new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("🥚 RNG EGG")
      .setDescription(
`**Otwieraj jajka i zdobywaj pety!**

• Im lepsze pety → więcej punktów  
• Im wyższy tier → lepsze bonusy  
• Event trwa ograniczony czas

👉 Przejdź sprawdzić event!`
      )
      .setImage(IMAGES.egg);
  }

  if (type === "merchant") {
    return [
      new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("🔥 BOSS MERCHANT")
        .setDescription(
`**Eventowy merchant!**

• Za tokeny z bossów kupisz przedmioty  
• Szansa na Supreme (125%)

📍 Anniversary Event  
⏱ 15 minut

👉 Sprawdź ofertę!`
        )
        .setImage(IMAGES.boss),

      new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("🍯 HONEY MERCHANT")
        .setDescription(
`**Eventowy merchant!**

• Za miód kupisz przedmioty  
• Szansa na Supreme (110%) + Deska

⏱ 15 minut

👉 Sprawdź ofertę!`
        )
        .setImage(IMAGES.honey)
    ];
  }

  if (type === "spin") {
    return new EmbedBuilder()
      .setColor("#9B59B6")
      .setTitle("🎡 DEV SPIN")
      .setDescription(
`**Kręć kołem i zdobywaj nagrody!**

• Różne nagrody  
• Szansa na Supreme (??%)

👉 Spróbuj szczęścia!`
      )
      .setImage(IMAGES.spin);
  }
}

// ===== KOMENDY =====
const commands = [
  new SlashCommandBuilder().setName("event").setDescription("Aktualny event"),
  new SlashCommandBuilder().setName("next-events").setDescription("Następne eventy"),
  new SlashCommandBuilder().setName("test-ping").setDescription("Test pinga eventu")
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

// ===== INTERAKCJE =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "event") {
    const type = getCurrentEvent();
    const embed = buildEventEmbed(type);

    if (Array.isArray(embed)) {
      return interaction.reply({ embeds: embed });
    }

    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "next-events") {
    const events = getNextEvents(2);

    const embed = new EmbedBuilder()
      .setColor("#00FFFF")
      .setTitle("📅 NASTĘPNE EVENTY")
      .setDescription(
        events.map(e => {
          return `**${e.type.toUpperCase()}** → <t:${Math.floor(e.time/1000)}:R>`;
        }).join("\n")
      );

    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "test-ping") {
    const type = getCurrentEvent();
    const role = ROLES[type];

    return interaction.reply({
      content: `<@&${role}> TEST PING (${type.toUpperCase()})`
    });
  }
});

// ===== SCHEDULER =====
function startScheduler() {
  setInterval(() => {
    const now = new Date();

    // dokładnie start eventu
    if (now.getMinutes() === 0 && now.getSeconds() === 0) {
      const type = getCurrentEvent();
      const channel = client.channels.cache.first();

      if (!channel) return;

      const role = ROLES[type];
      const embed = buildEventEmbed(type);

      if (type === "merchant") {
        channel.send({ content: `<@&${role}>` });
        embed.forEach(e => channel.send({ embeds: [e] }));
      } else {
        channel.send({
          content: `<@&${role}>`,
          embeds: [embed]
        });
      }
    }

    // przypomnienie 5 min wcześniej
    if (now.getMinutes() === 55) {
      const next = getNextEvents(1)[0];
      const channel = client.channels.cache.first();

      if (!channel) return;

      channel.send(`⏰ Za 5 minut: **${next.type.toUpperCase()}**`);
    }

  }, 1000);
}

client.login(TOKEN);
