const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const CHANNEL_ID = "1484937784283369502";

const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

const DB_PATH = "./data.json";

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getNowPL() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

const EVENTS = {
  egg: [0,3,6,9,12,15,18,21],
  merchant: [1,4,7,10,13,16,19,22],
  spin: [2,5,8,11,14,17,20,23]
};

function getEventByHour(hour) {
  if (EVENTS.egg.includes(hour)) return "egg";
  if (EVENTS.merchant.includes(hour)) return "merchant";
  return "spin";
}

function getCurrentEvent() {
  return getEventByHour(getNowPL().getHours());
}

function getNextEvent() {
  const now = getNowPL();
  let nextHour = (now.getHours() + 1) % 24;

  const nextDate = new Date(now);
  nextDate.setHours(nextHour, 0, 0, 0);

  if (nextHour <= now.getHours()) nextDate.setDate(nextDate.getDate() + 1);

  return {
    type: getEventByHour(nextHour),
    timestamp: Math.floor(nextDate.getTime() / 1000)
  };
}

function getCountdown(ts) {
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;

  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;

  return `⏳ ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

// ================= EMBED =================
function panelEmbed() {
  const current = getCurrentEvent();
  const next = getNextEvent();

  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("✨ EVENT PANEL")
    .setDescription("Automated event system")
    .addFields(
      { name: "🟢 Current", value: `\`${current.toUpperCase()}\``, inline: true },
      { name: "⏭️ Next", value: `\`${next.type.toUpperCase()}\`\n${getCountdown(next.timestamp)}`, inline: true }
    )
    .setFooter({ text: "By B3sttiee" })
    .setTimestamp();
}

// ================= PANEL =================
function getPanel() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("refresh").setLabel("🔄 Refresh").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("pick_roles").setLabel("🎭 Pick Roles").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("pick_dm").setLabel("📩 Pick DM Notifications").setStyle(ButtonStyle.Secondary)
    )
  ];
}

// ================= MENUS =================
function rolesMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("roles_menu")
      .setPlaceholder("Select event roles")
      .addOptions([
        { label: "Egg Event", value: "egg" },
        { label: "Merchant Event", value: "merchant" },
        { label: "Spin Event", value: "spin" }
      ])
  );
}

function dmMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dm_menu")
      .setPlaceholder("Select DM notifications")
      .addOptions([
        { label: "Egg", value: "egg" },
        { label: "Merchant", value: "merchant" },
        { label: "Spin", value: "spin" }
      ])
  );
}

// ================= PANEL SYSTEM =================
let panelMessage;

async function startPanel() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const messages = await channel.messages.fetch({ limit: 10 });
  panelMessage = messages.find(m => m.author.id === client.user.id);

  if (!panelMessage) {
    panelMessage = await channel.send({
      embeds: [panelEmbed()],
      components: getPanel()
    });
  }

  setInterval(async () => {
    try {
      await panelMessage.edit({
        embeds: [panelEmbed()],
        components: getPanel()
      });
    } catch {}
  }, 10000);
}

// ================= PING SYSTEM =================
let lastNotify = "";
let lastPingMessage = null;

async function sendPing(channel, content) {
  if (lastPingMessage) {
    try { await lastPingMessage.delete(); } catch {}
  }

  lastPingMessage = await channel.send(content);
  return lastPingMessage;
}

setInterval(async () => {
  const now = getNowPL();
  const min = now.getMinutes();
  const hour = now.getHours();

  const channel = await client.channels.fetch(CHANNEL_ID);

  const current = getCurrentEvent();
  const next = getNextEvent();

  // 5 MIN BEFORE
  if (min === 55 && lastNotify !== `${hour}-5`) {
    lastNotify = `${hour}-5`;

    lastPingMessage = await sendPing(
      channel,
      `⏳ <@&${ROLES[next.type]}> Event **${next.toUpperCase()}** za 5 minut!`
    );
  }

  // START
  if (min === 0 && lastNotify !== `${hour}-start`) {
    lastNotify = `${hour}-start`;

    if (lastPingMessage) {
      try { await lastPingMessage.delete(); } catch {}
    }

    lastPingMessage = await sendPing(
      channel,
      `🚀 <@&${ROLES[current]}> Event **${current.toUpperCase()}** START!`
    );

    setTimeout(async () => {
      if (lastPingMessage) {
        try {
          await lastPingMessage.delete();
          lastPingMessage = null;
        } catch {}
      }
    }, 15 * 60 * 1000);
  }

}, 10000);

// ================= INTERACTIONS =================
client.on("interactionCreate", async (i) => {

  const db = loadDB();

  if (i.isButton()) {

    if (i.customId === "refresh") {
      return i.update({ embeds: [panelEmbed()], components: getPanel() });
    }

    if (i.customId === "pick_roles") {
      return i.reply({
        content: "🎭 Choose your roles:",
        components: [rolesMenu()],
        ephemeral: true
      });
    }

    if (i.customId === "pick_dm") {
      return i.reply({
        content: "📩 Choose DM notifications:",
        components: [dmMenu()],
        ephemeral: true
      });
    }
  }

  if (i.isStringSelectMenu()) {

    if (i.customId === "roles_menu") {
      const member = await i.guild.members.fetch(i.user.id);

      for (const val of i.values) {
        const role = ROLES[val];

        if (member.roles.cache.has(role)) await member.roles.remove(role);
        else await member.roles.add(role);
      }

      return i.reply({ content: "✅ Roles updated", ephemeral: true });
    }

    if (i.customId === "dm_menu") {
      db.dm[i.user.id] = i.values;
      saveDB(db);

      return i.reply({ content: "✅ DM settings saved", ephemeral: true });
    }
  }
});

// ================= READY =================
client.once("clientReady", async () => {
  console.log("🔥 BOT FINAL READY");
  await startPanel();
});

client.login(TOKEN);
