module.exports = {
  name: "guildMemberRemove",

  async execute(member) {
    const channel = member.guild.channels.cache.get("1475992846912721018");

    if (channel) {
      channel.send(`➖ ${member.user.tag} left`);
    }
  }
};
