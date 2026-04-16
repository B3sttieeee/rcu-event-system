const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const DEFAULT_COLOR = "#2b2d31";
const draftStore = new Map();

function createEmptyDraft() {
  return {
    content: "",
    title: "",
    description: "",
    color: DEFAULT_COLOR,
    url: "",
    authorName: "",
    authorIcon: "",
    footerText: "",
    footerIcon: "",
    thumbnail: "",
    image: "",
    timestamp: true
  };
}

function getDraftKey(userId, channelId) {
  return `${userId}:${channelId}`;
}

function ensureDraft(userId, channelId) {
  const key = getDraftKey(userId, channelId);

  if (!draftStore.has(key)) {
    draftStore.set(key, createEmptyDraft());
  }

  return draftStore.get(key);
}

function getDraft(userId, channelId) {
  return draftStore.get(getDraftKey(userId, channelId)) || null;
}

function saveDraft(userId, channelId, patch) {
  const draft = ensureDraft(userId, channelId);
  Object.assign(draft, patch);
  return draft;
}

function clearDraft(userId, channelId) {
  draftStore.delete(getDraftKey(userId, channelId));
}

function normalizeText(value, maxLength = 1024) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeDescription(value) {
  const clean = String(value || "").trim();
  if (!clean || clean === ".") return "";
  return clean.slice(0, 4096);
}

function normalizeHexColor(value) {
  const clean = normalizeText(value, 16);

  if (!/^#?[0-9A-Fa-f]{6}$/.test(clean)) {
    return DEFAULT_COLOR;
  }

  return clean.startsWith("#") ? clean : `#${clean}`;
}

function isValidUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(value) {
  const clean = normalizeText(value, 2048);
  return isValidUrl(clean) ? clean : "";
}

function normalizeBoolean(value, fallback = true) {
  const clean = normalizeText(value, 10).toLowerCase();

  if (!clean) return fallback;
  if (["tak", "yes", "true", "1", "on"].includes(clean)) return true;
  if (["nie", "no", "false", "0", "off"].includes(clean)) return false;

  return fallback;
}

function parseAuthorInput(value) {
  const clean = normalizeText(value, 512);
  if (!clean) {
    return {
      authorName: "",
      authorIcon: ""
    };
  }

  const [name, iconURL] = clean.split("|");

  return {
    authorName: normalizeText(name, 256),
    authorIcon: normalizeUrl(iconURL)
  };
}

function shorten(value, maxLength = 160) {
  const clean = normalizeText(value, maxLength + 3);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3)}...`;
}

function colorFromExistingEmbed(embed) {
  if (embed?.hexColor && /^#[0-9A-Fa-f]{6}$/.test(embed.hexColor)) {
    return embed.hexColor;
  }

  if (typeof embed?.color === "number") {
    return `#${embed.color.toString(16).padStart(6, "0")}`;
  }

  if (typeof embed?.data?.color === "number") {
    return `#${embed.data.color.toString(16).padStart(6, "0")}`;
  }

  return DEFAULT_COLOR;
}

function draftFromEmbed(embed) {
  const base = createEmptyDraft();

  if (!embed) return base;

  return {
    ...base,
    title: normalizeText(embed.title, 256),
    description: normalizeDescription(embed.description),
    color: colorFromExistingEmbed(embed),
    url: normalizeUrl(embed.url),
    authorName: normalizeText(
      embed.author?.name || embed.data?.author?.name,
      256
    ),
    authorIcon: normalizeUrl(
      embed.author?.iconURL ||
        embed.author?.icon_url ||
        embed.data?.author?.icon_url
    ),
    footerText: normalizeText(
      embed.footer?.text || embed.data?.footer?.text,
      2048
    ),
    footerIcon: normalizeUrl(
      embed.footer?.iconURL ||
        embed.footer?.icon_url ||
        embed.data?.footer?.icon_url
    ),
    thumbnail: normalizeUrl(embed.thumbnail?.url || embed.data?.thumbnail?.url),
    image: normalizeUrl(embed.image?.url || embed.data?.image?.url),
    timestamp: Boolean(embed.timestamp || embed.data?.timestamp)
  };
}

function applyInputValue(input, value) {
  if (value) {
    input.setValue(value);
  }

  return input;
}

function createInput({
  id,
  label,
  style,
  value = "",
  placeholder = "",
  required = false,
  maxLength
}) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required);

  if (placeholder) input.setPlaceholder(placeholder);
  if (maxLength) input.setMaxLength(maxLength);

  return applyInputValue(input, value);
}

function buildEmbed(draft) {
  const embed = new EmbedBuilder().setColor(normalizeHexColor(draft.color));

  if (draft.title) embed.setTitle(draft.title);
  if (draft.description) embed.setDescription(draft.description);
  if (!draft.title && !draft.description) embed.setDescription("\u200b");
  if (draft.url) embed.setURL(draft.url);

  if (draft.authorName) {
    embed.setAuthor(
      draft.authorIcon
        ? {
            name: draft.authorName,
            iconURL: draft.authorIcon
          }
        : {
            name: draft.authorName
          }
    );
  }

  if (draft.footerText) {
    embed.setFooter(
      draft.footerIcon
        ? {
            text: draft.footerText,
            iconURL: draft.footerIcon
          }
        : {
            text: draft.footerText
          }
    );
  }

  if (draft.thumbnail) embed.setThumbnail(draft.thumbnail);
  if (draft.image) embed.setImage(draft.image);
  if (draft.timestamp) embed.setTimestamp();

  return embed;
}

function buildPreview(channelId, draft) {
  const notes = [
    `Podglad embeda dla <#${channelId}>.`,
    draft.content
      ? `Dodatkowa tresc: ${shorten(draft.content)}`
      : "Dodatkowa tresc: brak."
  ];

  return {
    content: notes.join("\n"),
    embeds: [buildEmbed(draft)],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sendEmbed_${channelId}`)
          .setLabel("Wyslij")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`editMain_${channelId}`)
          .setLabel("Tresc")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`editBranding_${channelId}`)
          .setLabel("Branding")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`editMedia_${channelId}`)
          .setLabel("Media")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`clearEmbed_${channelId}`)
          .setLabel("Reset")
          .setStyle(ButtonStyle.Danger)
      )
    ],
    ephemeral: true
  };
}

function buildStartModal(channelId, draft = createEmptyDraft()) {
  const authorValue = draft.authorName
    ? draft.authorIcon
      ? `${draft.authorName} | ${draft.authorIcon}`
      : draft.authorName
    : "";

  const modal = new ModalBuilder()
    .setCustomId(`embedModal_${channelId}`)
    .setTitle("Embed Builder");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      createInput({
        id: "title",
        label: "Tytul",
        style: TextInputStyle.Short,
        value: draft.title,
        placeholder: "Tytul embeda",
        maxLength: 256
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "description",
        label: "Opis",
        style: TextInputStyle.Paragraph,
        value: draft.description || ".",
        placeholder: "Opis embeda",
        maxLength: 4000
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "color",
        label: "Kolor HEX",
        style: TextInputStyle.Short,
        value: draft.color || DEFAULT_COLOR,
        placeholder: "#2b2d31",
        maxLength: 16
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "author",
        label: "Autor (nazwa | url)",
        style: TextInputStyle.Short,
        value: authorValue,
        placeholder: "Admin | https://...",
        maxLength: 512
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "image",
        label: "Obraz URL",
        style: TextInputStyle.Short,
        value: draft.image,
        placeholder: "https://...",
        maxLength: 2048
      })
    )
  );

  return modal;
}

function buildMainModal(channelId, draft) {
  const modal = new ModalBuilder()
    .setCustomId(`embedMainModal_${channelId}`)
    .setTitle("Edycja tresci");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      createInput({
        id: "content",
        label: "Zwykla wiadomosc",
        style: TextInputStyle.Paragraph,
        value: draft.content,
        placeholder: "Tekst nad embedem",
        maxLength: 2000
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "title",
        label: "Tytul",
        style: TextInputStyle.Short,
        value: draft.title,
        placeholder: "Tytul embeda",
        maxLength: 256
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "description",
        label: "Opis",
        style: TextInputStyle.Paragraph,
        value: draft.description || ".",
        placeholder: "Opis embeda",
        maxLength: 4000
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "color",
        label: "Kolor HEX",
        style: TextInputStyle.Short,
        value: draft.color || DEFAULT_COLOR,
        placeholder: "#2b2d31",
        maxLength: 16
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "url",
        label: "Klikalny URL tytulu",
        style: TextInputStyle.Short,
        value: draft.url,
        placeholder: "https://...",
        maxLength: 2048
      })
    )
  );

  return modal;
}

function buildBrandingModal(channelId, draft) {
  const modal = new ModalBuilder()
    .setCustomId(`embedBrandingModal_${channelId}`)
    .setTitle("Edycja brandingu");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      createInput({
        id: "authorName",
        label: "Nazwa autora",
        style: TextInputStyle.Short,
        value: draft.authorName,
        placeholder: "Administracja",
        maxLength: 256
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "authorIcon",
        label: "Ikona autora URL",
        style: TextInputStyle.Short,
        value: draft.authorIcon,
        placeholder: "https://...",
        maxLength: 2048
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "footerText",
        label: "Stopka",
        style: TextInputStyle.Short,
        value: draft.footerText,
        placeholder: "Twoja stopka",
        maxLength: 2048
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "footerIcon",
        label: "Ikona stopki URL",
        style: TextInputStyle.Short,
        value: draft.footerIcon,
        placeholder: "https://...",
        maxLength: 2048
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "timestamp",
        label: "Timestamp (tak/nie)",
        style: TextInputStyle.Short,
        value: draft.timestamp ? "tak" : "nie",
        placeholder: "tak",
        maxLength: 10
      })
    )
  );

  return modal;
}

function buildMediaModal(channelId, draft) {
  const modal = new ModalBuilder()
    .setCustomId(`embedMediaModal_${channelId}`)
    .setTitle("Edycja mediow");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      createInput({
        id: "thumbnail",
        label: "Miniatura URL",
        style: TextInputStyle.Short,
        value: draft.thumbnail,
        placeholder: "https://...",
        maxLength: 2048
      })
    ),
    new ActionRowBuilder().addComponents(
      createInput({
        id: "image",
        label: "Glowny obraz URL",
        style: TextInputStyle.Short,
        value: draft.image,
        placeholder: "https://...",
        maxLength: 2048
      })
    )
  );

  return modal;
}

async function resolveChannel(interaction, channelId) {
  return (
    interaction.guild.channels.cache.get(channelId) ||
    (await interaction.guild.channels.fetch(channelId).catch(() => null))
  );
}

function isSendableChannel(channel) {
  return Boolean(channel && typeof channel.send === "function");
}

function ensureDraftFromMessage(interaction, channelId) {
  const existing = getDraft(interaction.user.id, channelId);
  if (existing) return existing;

  const messageEmbed = interaction.message?.embeds?.[0];
  if (!messageEmbed) return null;

  const restored = draftFromEmbed(messageEmbed);
  return saveDraft(interaction.user.id, channelId, restored);
}

function getChannelId(customId) {
  return customId.split("_").pop();
}

module.exports = {
  name: "interactionCreate",

  async execute(interaction) {
    try {
      if (!interaction.guild) return;

      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith("embedModal_")) {
          const channelId = getChannelId(interaction.customId);
          const channel = await resolveChannel(interaction, channelId);

          if (!isSendableChannel(channel)) {
            return interaction.reply({
              content: "Kanal nie istnieje albo nie obsluguje wysylania wiadomosci.",
              ephemeral: true
            });
          }

          const author = parseAuthorInput(
            interaction.fields.getTextInputValue("author")
          );

          const draft = saveDraft(interaction.user.id, channelId, {
            title: normalizeText(interaction.fields.getTextInputValue("title"), 256),
            description: normalizeDescription(
              interaction.fields.getTextInputValue("description")
            ),
            color: normalizeHexColor(
              interaction.fields.getTextInputValue("color")
            ),
            authorName: author.authorName,
            authorIcon: author.authorIcon,
            image: normalizeUrl(interaction.fields.getTextInputValue("image"))
          });

          return interaction.reply(buildPreview(channelId, draft));
        }

        if (interaction.customId.startsWith("embedMainModal_")) {
          const channelId = getChannelId(interaction.customId);
          const draft = saveDraft(interaction.user.id, channelId, {
            content: normalizeText(
              interaction.fields.getTextInputValue("content"),
              2000
            ),
            title: normalizeText(interaction.fields.getTextInputValue("title"), 256),
            description: normalizeDescription(
              interaction.fields.getTextInputValue("description")
            ),
            color: normalizeHexColor(
              interaction.fields.getTextInputValue("color")
            ),
            url: normalizeUrl(interaction.fields.getTextInputValue("url"))
          });

          return interaction.reply(buildPreview(channelId, draft));
        }

        if (interaction.customId.startsWith("embedBrandingModal_")) {
          const channelId = getChannelId(interaction.customId);
          const current = ensureDraft(interaction.user.id, channelId);
          const draft = saveDraft(interaction.user.id, channelId, {
            authorName: normalizeText(
              interaction.fields.getTextInputValue("authorName"),
              256
            ),
            authorIcon: normalizeUrl(
              interaction.fields.getTextInputValue("authorIcon")
            ),
            footerText: normalizeText(
              interaction.fields.getTextInputValue("footerText"),
              2048
            ),
            footerIcon: normalizeUrl(
              interaction.fields.getTextInputValue("footerIcon")
            ),
            timestamp: normalizeBoolean(
              interaction.fields.getTextInputValue("timestamp"),
              current.timestamp
            )
          });

          return interaction.reply(buildPreview(channelId, draft));
        }

        if (interaction.customId.startsWith("embedMediaModal_")) {
          const channelId = getChannelId(interaction.customId);
          const draft = saveDraft(interaction.user.id, channelId, {
            thumbnail: normalizeUrl(
              interaction.fields.getTextInputValue("thumbnail")
            ),
            image: normalizeUrl(interaction.fields.getTextInputValue("image"))
          });

          return interaction.reply(buildPreview(channelId, draft));
        }
      }

      if (interaction.isButton()) {
        if (interaction.customId.startsWith("sendEmbed_")) {
          const channelId = getChannelId(interaction.customId);
          const channel = await resolveChannel(interaction, channelId);
          const fallbackEmbed = interaction.message?.embeds?.[0];
          const draft =
            getDraft(interaction.user.id, channelId) ||
            (fallbackEmbed ? draftFromEmbed(fallbackEmbed) : null);

          if (!isSendableChannel(channel)) {
            return interaction.reply({
              content: "Kanal nie istnieje albo nie obsluguje wysylania wiadomosci.",
              ephemeral: true
            });
          }

          if (!draft) {
            return interaction.reply({
              content: "Nie znaleziono szkicu embeda. Otworz /embed jeszcze raz.",
              ephemeral: true
            });
          }

          await channel.send({
            content: draft.content || undefined,
            embeds: [buildEmbed(draft)]
          });

          clearDraft(interaction.user.id, channelId);

          return interaction.update({
            content: `Embed zostal wyslany na <#${channelId}>.`,
            embeds: [],
            components: []
          });
        }

        if (interaction.customId.startsWith("clearEmbed_")) {
          const channelId = getChannelId(interaction.customId);
          clearDraft(interaction.user.id, channelId);

          return interaction.update({
            content: "Szkic embeda zostal wyczyszczony.",
            embeds: [],
            components: []
          });
        }

        if (interaction.customId.startsWith("editEmbed_")) {
          const channelId = getChannelId(interaction.customId);
          const draft = ensureDraftFromMessage(interaction, channelId);

          if (!draft) {
            return interaction.reply({
              content: "Brak embeda do edycji.",
              ephemeral: true
            });
          }

          return interaction.showModal(buildStartModal(channelId, draft));
        }

        if (interaction.customId.startsWith("editMain_")) {
          const channelId = getChannelId(interaction.customId);
          const draft = ensureDraftFromMessage(interaction, channelId);

          if (!draft) {
            return interaction.reply({
              content: "Nie znaleziono szkicu embeda.",
              ephemeral: true
            });
          }

          return interaction.showModal(buildMainModal(channelId, draft));
        }

        if (interaction.customId.startsWith("editBranding_")) {
          const channelId = getChannelId(interaction.customId);
          const draft = ensureDraftFromMessage(interaction, channelId);

          if (!draft) {
            return interaction.reply({
              content: "Nie znaleziono szkicu embeda.",
              ephemeral: true
            });
          }

          return interaction.showModal(buildBrandingModal(channelId, draft));
        }

        if (interaction.customId.startsWith("editMedia_")) {
          const channelId = getChannelId(interaction.customId);
          const draft = ensureDraftFromMessage(interaction, channelId);

          if (!draft) {
            return interaction.reply({
              content: "Nie znaleziono szkicu embeda.",
              ephemeral: true
            });
          }

          return interaction.showModal(buildMediaModal(channelId, draft));
        }
      }
    } catch (err) {
      console.log("[MODALSUBMIT ERROR]", err);

      const payload = {
        content: `Wystapil blad:\n\`\`\`${normalizeText(err?.message || "Unknown error", 1500)}\`\`\``,
        ephemeral: true
      };

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch {}
    }
  }
};
