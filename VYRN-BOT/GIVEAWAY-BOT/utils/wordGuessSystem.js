const { EmbedBuilder } = require("discord.js");

let currentGame = null;

// ====================== POLSKIE SŁOWA ======================
const WORDS = [
  "zamek", "smok", "rycerz", "miecz", "tarcza", "ogień", "las", "góra", "rzeka",
  "wioska", "król", "królowa", "książę", "wojownik", "bitwa", "zwycięstwo",
  "legenda", "przygoda", "skarbiec", "złoto", "magia", "czarodziej", "potwór",
  "loch", "klucz", "brama", "most", "wieża", "forteca", "armia", "koń", "łuk",
  "strzała", "burza", "wiatr", "deszcz", "słońce", "księżyc", "odwaga", "honor",
  "siła", "mądrość", "wolność", "epika", "heros", "smocze", "rycerski", "błysk"
];

// ====================== LOSOWA NAGRODA ======================
function getRandomReward() {
  if (Math.random() < 0.37) { // 37% na mnożnik
    const multipliers = [
      { val: 1.5, chance: 38 },
      { val: 2.0, chance: 27 },
      { val: 2.5, chance: 17 },
      { val: 3.0, chance: 10 },
      { val: 4.0, chance: 6 },
      { val: 5.0, chance: 2 }   // tylko 2% na x5
    ];

    let total = multipliers.reduce((sum, m) => sum + m.chance, 0);
    let roll = Math.random() * total;

    for (const m of multipliers) {
      roll -= m.chance;
      if (roll <= 0) {
        const duration = m.val >= 4.0 ? 8 : m.val >= 3.0 ? 12 : 18;
        return { type: "multiplier", value: m.val, durationMin: duration };
      }
    }
  }

  const xp = Math.floor(200 + Math.random() * 150); // 200-349 XP
  return { type: "xp", value: xp };
}

// ====================== START GRY ======================
async function tryStartRandomGame(channel, forced = false) {
  if (currentGame) return { success: false, reason: "already_running" };

  if (!forced && Math.random() > 0.07) return { success: false, reason: "chance" };

  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const revealed = "⬛".repeat(word.length);

  currentGame = {
    channelId: channel.id,
    word: word.toLowerCase(),
    revealed: revealed,
    timeout: null,
    message: null
  };

  const embed = new EmbedBuilder()
    .setColor("#ffaa00")
    .setTitle("🎲 **ZGADYWANIE SŁOWA**")
    .setDescription(
`**Słowo:**\n` +
`\`${revealed}\`\n\n` +
`Wpisz poprawne słowo w czat!\n` +
`⏳ Czas: **30 sekund**`
    )
    .setFooter({ text: "Nagroda: XP lub losowy mnożnik!" });

  const msg = await channel.send({ embeds: [embed] }).catch(() => null);
  if (msg) currentGame.message = msg;

  let timeLeft = 30;

  currentGame.timeout = setInterval(async () => {
    timeLeft -= 5;
    if (timeLeft <= 0) {
      endGame(channel, false);
      return;
    }

    // Aktualizacja embedu z czasem
    const updatedEmbed = EmbedBuilder.from(embed)
      .setDescription(
`**Słowo:**\n` +
`\`${revealed}\`\n\n` +
`Wpisz poprawne słowo w czat!\n` +
`⏳ Czas: **${timeLeft} sekund**`
      );

    if (currentGame.message) {
      currentGame.message.edit({ embeds: [updatedEmbed] }).catch(() => {});
    }
  }, 5000);

  return { success: true };
}

// ====================== SPRAWDZANIE ODPOWIEDZI ======================
async function checkAnswer(message) {
  if (!currentGame || message.channel.id !== currentGame.channelId) return false;

  const guess = message.content.toLowerCase().trim();

  if (guess === currentGame.word) {
    clearInterval(currentGame.timeout);

    const reward = getRandomReward();

    let embed;
    if (reward.type === "multiplier") {
      const endTime = Date.now() + (reward.durationMin * 60 * 1000);

      try {
        const boostSystem = require("./boostSystem");
        boostSystem.activeBoosts.set(message.author.id, {
          multiplier: reward.value,
          endTime: endTime,
          name: `${reward.value}x XP`
        });
        boostSystem.saveBoosts();
      } catch (e) {}

      embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("🎉 WYGRAŁEŚ MNOŻNIK!")
        .setDescription(
`${message.author} zgadł słowo **${currentGame.word}**!\n\n` +
`Otrzymujesz **${reward.value}x XP** na **${reward.durationMin} minut**! 🔥`
        );
    } else {
      try {
        const { addXP } = require("./levelSystem");
        await addXP(message.member, reward.value);
      } catch (e) {}

      embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("✅ Poprawna odpowiedź!")
        .setDescription(
`${message.author} zgadł słowo **${currentGame.word}**!\n` +
`Otrzymujesz **${reward.value} XP**!`
        );
    }

    await message.channel.send({ embeds: [embed] }).catch(() => {});
    currentGame = null;
    return true;
  }
  return false;
}

function endGame(channel, won = false) {
  if (!currentGame) return;

  clearInterval(currentGame.timeout);

  if (!won) {
    const embed = new EmbedBuilder()
      .setColor("#ff5555")
      .setTitle("⏰ Czas minął!")
      .setDescription(`Słowo to było: **${currentGame.word}**`);

    channel.send({ embeds: [embed] }).catch(() => {});
  }

  currentGame = null;
}

module.exports = {
  tryStartRandomGame,
  checkAnswer
};
