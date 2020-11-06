/*
  This is the main JS file for the bot. Where all the events are captured
  and the instantiation of the Discord Client Class takes place.
*/
const Discord = require("discord.js");
const util = require("./util");
const axios = require("axios");
const { arrayToSentence } = require("./util");

require("dotenv").config();

// Create a new instance of the Discord Client Class.
const bot = new Discord.Client();
bot.user.setActivity('!def | !wotd', { type: 'LISTENING' });

// Get the token and prefix from the .ENV file.
const token = process.env.DISCORD_TOKEN;
const prefix = process.env.COMMAND_PREFIX || "!";

console.log(token, prefix);

// Check that we have a token in the .env file.
if (!token) {
  console.error("A token is required to connect to Discord.");
  process.exit(1);
}

// Check that we have a token set in the .env file.
if (!prefix) {
  console.error("A prefix is required to call commands.");
  process.exit(1);
}

// Ready is emitted whenever a message is created.
bot.on("ready", () => {
  const { discord } = util;
  // A little message to show that the bot has connected.
  console.log(
    `Bot is up and running, with ${discord.getOnlineUsers(
      bot.users
    )} online users, in ${discord.getTextChannels(
      bot.channels
    )} text channels and ${discord.getVoiceChannels(
      bot.channels
    )} voice channels.`
  );
});

// Message is emitted whenever the bot notices a new message.
bot.on("message", (message) => {
  // Destructure the message parameter so we don't repeat ourselves.
  const { author, channel, content, createdTimestamp } = message;

  // If the message doesn't contain the command prefix, we might as well leave it alone.
  if (content.indexOf(prefix) !== 0) return;

  // No point dealing with the message if it was sent by a bot!
  if (author.bot) return;

  // Get the the command and any arguments that were sent
  const args = content.slice(prefix.length).trim().split(" ");
  const command = args.shift().toLowerCase();

  // If the command that was sent matches any of the commands that we have configured...
  if (command === "wotd") {
    return channel.send("https://www.merriam-webster.com/word-of-the-day");
  } else if (command === "def") {
    if (!args.length) {
      return channel.send(
        `Uh oh, you didn't provide a word to define, <@${author.id}>!`
      );
    }

    axios
      .get(
        `https://dictionaryapi.com/api/v3/references/collegiate/json/${args[0]}`,
        {
          params: {
            key: process.env.DICTIONARY_KEY,
          },
        }
      )
      .then(function (response) {
        let data = response.data[0];

        // If the result is a list of strings, it's not a valid word.
        if (typeof data !== "object") {
          const result = new Discord.MessageEmbed()
            .setTitle(
              `Invalid word: The word youve entered isnt in the dictionary.`
            )
            .setColor(0xff0000);
          if (!response.data || response.data.length === 0)
            result.setDescription("");
          else
            result.setDescription(
              "Maybe try one of these suggestions: \n" +
                arrayToSentence(response.data)
            );
          return channel.send(result);
        }

        let definitions = data.shortdef,
          type = data.fl,
          description = "";
        for (let i = 0; i < definitions.length; i++) {
          description += `[${i + 1}] ${definitions[i]}`;
          description += i == definitions.length - 1 ? "" : "\n";
        }

        let audio = data.hwi.prs[0].sound.audio;
        let subdirectory = "";

        // @see https://dictionaryapi.com/products/json#sec-2.prs for documenation regarding audio URL's
        if (audio.startsWith("bix")) subdirectory = "bix";
        else if (audio.startsWith("gg")) subdirectory = "gg";
        else if (!!audio.match(/^[.,:!?]/) || !!audio.match(/^[0-9]/))
          subdirectory = "number";
        else subdirectory = audio[0];

        const attachment = new Discord.MessageAttachment(
          `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdirectory}/${audio}.mp3`
        );

        channel.send(
          new Discord.MessageEmbed()
            .setTitle(`Definition: ${args[0]} (${type})`)
            .setColor(0x1af200)
            .setDescription(description)
            .setFooter("Dictionary Bot v0.1")
        );

        channel.send(
          `${args[0]} is pronounced as [${data.hwi.prs[0].mw}]:`,
          attachment
        );
      })
      .catch(function (error) {
        console.log(error);
        return channel.send(
          `Sorry, I can't define that at the moment <@${author.id}>!`
        );
      });
  } else if (command == "dhelp") {
    let embed = new Discord.MessageEmbed()
      .setColor("#CD5455")
      .setAuthor(
        "Dictionary Bot",
        "https://store-images.s-microsoft.com/image/apps.58165.13510798887401125.12b4a997-5167-4329-a40a-077b2f42e171.8151e6d6-8fee-4b09-9851-4df7bf4e7c72?mode=scale&q=90&h=300&w=300",
        "https://www.github.com/abdultolba/dictionary-bot"
      )
      .setTitle("Commands")
      .addFields(
        {
          name: "!def <word>",
          value: "Retrieve the definition(s) for a given word",
        },
        {
          name: "!wotd",
          value: "Retrieve's Merriam Websters *Word of the Day*.",
        },
        {
          name: "!dhelp",
          value: "Retrieve a list of commands for the dictionary bot.",
        }
      )
      .setTimestamp()
      .setFooter("Dictionary Bot v1.0.0");

    return channel.send(embed);
  }
});

// This establishes a websocket connection to Discord.
bot.login(token);
