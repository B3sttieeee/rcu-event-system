module.exports = {
  name: "messageUpdate",

  async execute(oldMsg, newMsg) {
    if (!oldMsg.guild || oldMsg.author?.bot) return;

    if (oldMsg.content === newMsg.content) return;

    const ch = oldMsg.guild.channels.cache.get("1475992778554216448");

    if (!ch) return;

    ch.send(
      `✏️ ${oldMsg.author.tag}\nOLD: ${oldMsg.content}\nNEW: ${newMsg.content}`
    );
  }
};
