const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CHANNEL_ID = "1484937784283369502";

// ROLE ID
const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

// DM ustawienia
const userDM = new Map();


// ================= EVENT LOGIC =================

function getEventByHour(hour) {
  if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(hour)) return "spin";
}

function getCurrentEvent() {
  const h = new Date().getUTCHours();
  return getEventByHour(h);
}

function getNextEvents() {
  const now = new Date();
  const currentHour = now.getUTCHours();

  let events = [];

  for (let i = 1; i <= 3; i++) {
    let hour = (currentHour + i) % 24;

    let nextDate = new Date(now);
    nextDate.setUTCHours(hour, 0, 0, 0);

    if (hour <= currentHour) {
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    }

    events.push({
      type: getEventByHour(hour),
      time: Math.floor(nextDate.getTime() / 1000)
    });
  }

  return events;
}


// ================= EMBEDY =================

function embedEgg() {
  return new EmbedBuilder()
    .setColor("Yellow")
    .setTitle("🥚 **RNG EGG EVENT**")
    .setDescription("**Otwieraj jajka i zdobywaj punkty Tieru!**\n\n• Lepsze pety = więcej punktów\n• Wyższy Tier = lepsze nagrody")
    .setThumbnail("https://i.imgur.com/yourEgg.png");
}

function embedSpin() {
  return new EmbedBuilder()
    .setColor("Purple")
    .setTitle("🎡 **DEV SPIN EVENT**")
    .setDescription("**Kręć kołem i zdobywaj nagrody!**")
    .setThumbnail("https://i.imgur.com/yourSpin.png");
}

function embedMerchant1() {
  return new EmbedBuilder()
    .setColor("Gold")
    .setTitle("💰 **HONEY MERCHANT**")
    .setDescription("Za miód kupisz przedmioty\n\n**Szansa Supreme: 110%**")
    .setThumbnail("https://i.imgur.com/honey.png");
}

function embedMerchant2() {
  return new EmbedBuilder()
    .setColor("Red")
    .setTitle("🔥 **BOSS MERCHANT**")
    .setDescription("Na mapie Anniversary Event\n\n**Szansa Supreme: 125%**")
    .setThumbnail("https://i.imgur.com/boss.png")
    .setFooter({ text: "⏳ Znika po 15 minutach" });
}


// ================= EVENT SEND =================

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const event = getCurrentEvent();

  if (event === "egg") {
    await channel.send({
      content: `<@&${ROLES.egg}>`,
      embeds: [embedEgg()]
    });
  }

  if (event === "spin") {
    await channel.send({
      content: `<@&${ROLES.spin}>`,
      embeds: [embedSpin()]
    });
  }

  if (event === "merchant") {
    await channel.send({
      content: `<@&${ROLES.merchant}>`,
      embeds: [embedMerchant1(), embedMerchant2()]
    });
  }
}


// ================= TIMER =================

setInterval(() => {
  const now = new Date();

  if (now.getUTCMinutes() === 0 && now.getUTCSeconds() === 0) {
    sendEvent();
  }

  if (now.getUTCMinutes() === 55 && now.getUTCSeconds() === 0) {
    const channel = client.channels.cache.get(CHANNEL_ID);
    channel.send("⏰ **Event za 5 minut!**");
  }

}, 1000);


// ================= COMMANDY =================

const commands = [
  new SlashCommandBuilder()
    .setName("event")
    .setDescription("Aktualny event"),

  new SlashCommandBuilder()
    .setName("next-events")
    .setDescription("Następne eventy"),

  new SlashCommandBuilder()
    .setName("test-ping")
    .setDescription("Test aktualnego eventu"),

  new SlashCommandBuilder()
    .setName("get-role")
    .setDescription("Panel wyboru ról"),

  new SlashCommandBuilder()
    .setName("set-dm")
    .setDescription("Ustaw powiadomienia DM")
].map(c => c.toJSON());


// ================= REGISTER =================

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();


// ================= INTERACTION =================

client.on("interactionCreate", async (i) => {

  if (i.isChatInputCommand()) {

    if (i.commandName === "event") {
      const e = getCurrentEvent();

      if (e === "egg") return i.reply({ embeds: [embedEgg()] });
      if (e === "spin") return i.reply({ embeds: [embedSpin()] });
      if (e === "merchant") return i.reply({ embeds: [embedMerchant1(), embedMerchant2()] });
    }

    if (i.commandName === "next-events") {
      const next = getNextEvents();

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("📅 **NASTĘPNE EVENTY**")
        .setDescription(
          `**${next[0].type.toUpperCase()}**\n<t:${next[0].time}:R>\n<t:${next[0].time}:F>\n\n` +
          `**${next[1].type.toUpperCase()}**\n<t:${next[1].time}:R>\n<t:${next[1].time}:F>`
        );

      i.reply({ embeds: [embed] });
    }

    if (i.commandName === "test-ping") {
      sendEvent();
      i.reply({ content: "✅ Wysłano test eventu", ephemeral: true });
    }

    if (i.commandName === "get-role") {
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("roles")
          .setPlaceholder("Wybierz role")
          .addOptions([
            { label: "RNG EGG", value: "egg" },
            { label: "MERCHANT", value: "merchant" },
            { label: "SPIN", value: "spin" }
          ])
      );

      i.reply({ content: "🎭 Wybierz role:", components: [row], ephemeral: true });
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

      i.reply({ content: "📩 Wybierz DM:", components: [row], ephemeral: true });
    }
  }


  if (i.isStringSelectMenu()) {

    if (i.customId === "roles") {
      const role = ROLES[i.values[0]];
      const member = await i.guild.members.fetch(i.user.id);

      if (member.roles.cache.has(role)) {
        await member.roles.remove(role);
        return i.reply({ content: "❌ Usunięto rolę", ephemeral: true });
      } else {
        await member.roles.add(role);
        return i.reply({ content: "✅ Dodano rolę", ephemeral: true });
      }
    }

    if (i.customId === "dm") {
      userDM.set(i.user.id, i.values[0]);
      return i.reply({ content: "✅ Ustawiono DM", ephemeral: true });
    }
  }

});


// ================= READY =================

client.once("clientReady", () => {
  console.log("✅ BOT ONLINE");
});

client.login(TOKEN);
