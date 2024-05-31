const Discord = require('discord.js-selfbot-v13');
const request = require('request');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

config.tokens.forEach(entry => {
    const client = new Discord.Client({
        checkUpdate: false,
    });

    client.once('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
    });

    function log(message) {
        if (message.author.bot) return;

        const webhookUrl = entry.channels[message.channel.id];
        if (!webhookUrl) {
            return;
        }

        const webhookName = message.author.username;
        const avatarURL = message.author.displayAvatarURL({
            dynamic: true
        });

        if (!message.content.includes("@here") && !message.content.includes("@everyone")) {
            const options = {
                uri: entry.flask_server,
                method: 'POST',
                json: {
                    username: webhookName,
                    content: message.content,
                    avatar_url: avatarURL,
                    webhook_url: webhookUrl
                }
            };

            request(options, (error, response, body) => {
                if (error) {
                    console.error(`Error sending message to Flask server: ${error.message}`);
                } else if (response.statusCode !== 200) {
                    console.error(`Error sending message to Flask server: Received status code ${response.statusCode}`);
                } else {
                    console.log(`Message sent successfully.`);
                }
            });
        } else {
            console.log('Message contains @here or @everyone. Not sending via webhook.');
        }
    }

    client.on('message', log);
    client.login(entry.token);
})
