module.exports = {
  name: "messageDelete",

  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    const ch = message.guild.channels.cache.get("1475992778554216448");

    if (!ch) return;

    ch.send(`🗑 ${message.author.tag}: ${message.content || "embed/file"}`);
  }
};
