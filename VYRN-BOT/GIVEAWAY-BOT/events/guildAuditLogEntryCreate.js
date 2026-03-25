module.exports = {
  name: "guildAuditLogEntryCreate",

  async execute(entry, guild) {
    const ch = guild.channels.cache.get("1475993709240778904");
    if (!ch) return;

    ch.send(`⚙️ Action: ${entry.action} by <@${entry.executorId}>`);
  }
};
