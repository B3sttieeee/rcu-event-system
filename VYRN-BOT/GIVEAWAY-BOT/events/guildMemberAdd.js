const { EmbedBuilder, Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberAdd,   // lepsza praktyka w v14

  async execute(member) {
    try {
      console.log(`👤 New member joined: ${member.user.tag} (${member.id})`);

      const WELCOME_CHANNEL = "1475559296594084007";
      const AUTO_ROLE = "1475572275095929022";

      // =========================
      // 🎭 AUTO ROLE
      // =========================
      const role = member.guild.roles.cache.get(AUTO_ROLE);

      if (role) {
        // Mały delay pomaga uniknąć rate limitów przy dodawaniu roli + wysyłaniu wiadomości
        await new Promise(resolve => setTimeout(resolve, 400));

        await member.roles.add(role).catch(err => {
          console.error(`❌ Nie udało się dodać roli ${role.name}:`, err.message);
        });

        console.log(`✅ Auto role "${role.name}" dodana do ${member.user.tag}`);
      } else {
        console.warn(`❌ Auto role o ID ${AUTO_ROLE} nie została znaleziona!`);
      }

      // =========================
      // 🎉 WELCOME MESSAGE
      // =========================
      const channel = member.guild.channels.cache.get(WELCOME_CHANNEL);

      if (!channel) {
        console.warn(`❌ Kanał powitalny o ID ${WELCOME_CHANNEL} nie został znaleziony!`);
        return;
      }

      // Sprawdzenie czy kanał jest tekstowy (bezpieczeństwo)
      if (!channel.isTextBased()) {
        console.warn(`❌ Kanał powitalny nie jest kanałem tekstowym!`);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor("#b8a672")
        .setAuthor({
          name: "VYRN CLAN",
          iconURL: member.guild.iconURL({ size: 256 }) || null,
        })
        .setDescription(
`🎉 **Welcome ${member}**

📌 Sprawdź regulamin  
<#1475526080361140344>

🔗 Zweryfikuj konto przez BLOXLINK  
<#1475970436650237962>

🎟 Chcesz dołączyć do clanu? Otwórz ticket  
<#1475558248487583805>

🔥 Powodzenia i dobrej zabawy!`
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256, dynamic: true }))
        .setImage("https://media.discordapp.net/attachments/1475993709240778904/1486898592491896882/ezgif.com-video-to-gif-converter.gif")
        .setFooter({ text: "Administrations | VYRN" })
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(err => {
        console.error("❌ Nie udało się wysłać wiadomości powitalnej:", err.message);
      });

      console.log(`✅ Wiadomość powitalna wysłana dla ${member.user.tag}`);

    } catch (err) {
      console.error("❌ Główny błąd w guildMemberAdd:", err);
    }
  }
};
