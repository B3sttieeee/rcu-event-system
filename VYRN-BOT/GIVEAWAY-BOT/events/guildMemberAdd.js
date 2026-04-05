const { EmbedBuilder, Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    // Pomijamy boty (opcjonalnie – usuń jeśli chcesz witać też boty)
    if (member.user.bot) return;

    try {
      console.log(`👤 Nowy członek dołączył: ${member.user.tag} (${member.id})`);

      const WELCOME_CHANNEL_ID = "1475559296594084007";
      const AUTO_ROLE_ID = "1475572275095929022";

      // ====================== AUTO ROLE ======================
      const role = member.guild.roles.cache.get(AUTO_ROLE_ID);
      if (role) {
        // Większy delay + lepsza obsługa błędu
        await new Promise(resolve => setTimeout(resolve, 1200));

        await member.roles.add(role).catch(err => {
          console.error(`❌ Nie udało się dodać roli do ${member.user.tag}:`, err.message);
        });

        console.log(`✅ Auto-roła dodana: ${role.name} → ${member.user.tag}`);
      } else {
        console.warn(`⚠️ Auto-roła o ID ${AUTO_ROLE_ID} nie znaleziona!`);
      }

      // ====================== WELCOME MESSAGE ======================
      const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
      if (!channel?.isTextBased()) {
        console.warn(`⚠️ Kanał powitalny ${WELCOME_CHANNEL_ID} nie istnieje lub nie jest tekstowy!`);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor("#b8a672")
        .setAuthor({
          name: "VYRN CLAN",
          iconURL: member.guild.iconURL({ size: 256 }) || undefined,
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
        console.error(`❌ Nie udało się wysłać wiadomości powitalnej dla ${member.user.tag}:`, err.message);
      });

      console.log(`✅ Wiadomość powitalna wysłana dla ${member.user.tag}`);

    } catch (err) {
      console.error(`❌ Główny błąd w guildMemberAdd (${member.user.tag}):`, err);
    }
  }
};
