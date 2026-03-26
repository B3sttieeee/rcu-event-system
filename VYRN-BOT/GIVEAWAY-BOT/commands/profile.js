if (cmd === "profile" || cmd === "p") {
  const db = loadDB();
  const profile = loadProfile();

  const data = db.xp[message.author.id] || { xp: 0, level: 0 };
  const user = profile.users[message.author.id] || {
    voice: 0,
    daily: { msgs: 0, vc: 0 }
  };

  const needed = neededXP(data.level);
  const progress = Math.floor((data.xp / needed) * 100);

  const bar = "🟩".repeat(progress / 10) + "⬛".repeat(10 - progress / 10);

  const vcMinutes = Math.floor(user.voice / 60);

  const embed = new EmbedBuilder()
    .setColor("#111111")
    .setAuthor({
      name: `${message.author.username} • Profile`,
      iconURL: message.author.displayAvatarURL()
    })
    .setThumbnail(message.author.displayAvatarURL())
    .setDescription(
      `🏆 **Level ${data.level}**\n` +
      `${bar} ${progress}%\n` +
      `XP: ${data.xp}/${needed}\n\n` +

      `🎤 **Voice Time:** ${vcMinutes} min\n\n` +

      `🎯 **Daily Progress**\n` +
      `💬 Messages: ${user.daily.msgs}/50\n` +
      `🎤 VC: ${Math.floor(user.daily.vc / 60)}/30 min`
    );

  return message.reply({ embeds: [embed] });
}
