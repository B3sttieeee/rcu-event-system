const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");

// ===== CONFIG =====
const CHANNEL_ID = "1484937784283369502";
const MERCHANT_ROLE = "TU_DAJ_ID_ROLI";

// ===== IMAGES =====
const PANEL_IMAGE = "https://imgur.com/AybkuW5.png";
const START_IMAGE = "https://imgur.com/7GBAq8Z.png";

// ===== GODZINY (PO ZMIANIE CZASU) =====
const HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

// ===== TIME (PL) =====
function getNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

// ===== NEXT HOUR =====
function getNextMerchantHour() {
  const now = getNow();
  const currentHour = now.getHours();

  for (let h of HOURS) {
    if (h > currentHour) return h;
  }

  return HOURS[0];
}

// ===== COUNTDOWN =====
function getCountdown() {
  const now = getNow();

  let target = new Date(now);
  const nextHour = getNextMerchantHour();

  if (nextHour <= now.getHours()) {
    target.setDate(target.getDate() + 1);
  }

  target.setHours(nextHour, 0, 0, 0);

  const diff = target - now;

  const total = Math.floor(diff / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return `${h}h ${m}m ${s}s`;
}

// ===== PANEL EMBED =====
function panelEmbed() {
  const next = getNextMerchantHour();

  return new EmbedBuilder()
    .setColor("#f59e0b")
    .setTitle("🍯 MERCHANT TRACKER")
    .setDescription(
`🏆 **Next Merchant**
\`${next}:00\`

⏳ **Countdown**
\`${getCountdown()}\``
    )
    .setImage(PANEL_IMAGE);
}

// ===== BUTTONS =====
function getButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("refresh")
        .setLabel("🔄 Refresh")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("dm")
        .setLabel("📩 Notifications")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

// ===== PANEL =====
async function startPanel(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const msg = await channel.send({
    embeds: [panelEmbed()],
    components: getButtons()
  });

  setInterval(() => {
    msg.edit({
      embeds: [panelEmbed()],
      components: getButtons()
    }).catch(()=>{});
  }, 10000);
}

// ===== EVENT SYSTEM =====
async function startEventSystem(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);

  let lastPing = null;
  let lastStart = null;

  let prePingMsg = null;
  let startMsg = null;

  setInterval(async () => {
    const now = getNow();
    const hour = now.getHours();
    const min = now.getMinutes();

    // ===== 5 MIN BEFORE =====
    for (let h of HOURS) {
      if (hour === h - 1 && min === 55) {

        const key = `${h}-ping`;
        if (lastPing === key) return;
        lastPing = key;

        prePingMsg = await channel.send({
          content: `<@&${MERCHANT_ROLE}> ⏳ Merchant za 5 minut!`
        }).catch(()=>{});
      }
    }

    // ===== START =====
    for (let h of HOURS) {
      if (hour === h && min === 0) {

        const key = `${h}-start`;
        if (lastStart === key) return;
        lastStart = key;

        // usuń ping
        if (prePingMsg) {
          prePingMsg.delete().catch(()=>{});
          prePingMsg = null;
        }

        startMsg = await channel.send({
          content: `<@&${MERCHANT_ROLE}>`,
          embeds: [
            new EmbedBuilder()
              .setColor("#f59e0b")
              .setTitle("🍯 HONEY MERCHANT START!")
              .setDescription("💡 Przygotuj walutę!")
              .setImage(START_IMAGE)
          ]
        }).catch(()=>{});

        // usuń po 15 min
        setTimeout(() => {
          if (startMsg) {
            startMsg.delete().catch(()=>{});
            startMsg = null;
          }
        }, 15 * 60 * 1000);
      }
    }

  }, 10000);
}

// ===== INTERACTION =====
async function handleEventInteraction(interaction) {

  if (interaction.customId === "refresh") {
    return interaction.update({
      embeds: [panelEmbed()],
      components: getButtons()
    });
  }

  if (interaction.customId === "dm") {
    return interaction.reply({
      content: "📩 Powiadomienia w budowie 😉",
      ephemeral: true
    });
  }
}

module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction
};
