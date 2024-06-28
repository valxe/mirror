const dsc = require('discord.js-selfbot-v13');
const axios = require('axios');
const fs = require('fs');

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const clnts = [];
let messageBuffer = [];
const bufferLimit = 500;

async function flushMessageBuffer() {
    if (messageBuffer.length === 0) return;

    const bufferToSend = messageBuffer.filter(msg => msg.user_name && msg.message.content);
    messageBuffer = [];

    if (bufferToSend.length === 0) {
        console.log('No valid messages to send in bulk.');
        return;
    }

    try {
        await axios.post(
            cfg.api_url, 
            { messages: bufferToSend },
            { headers: { 'API-Key': cfg.api_key } }
        );
        console.log('Bulk message data successfully sent to the API.');
    } catch (err) {
        console.error(`Error sending bulk message data to the API: ${err.message}`);
        messageBuffer = bufferToSend.concat(messageBuffer);
    }
}

cfg.tokens.forEach(ent => {
    const clnt = new dsc.Client({
        checkUpdate: false,
    });

    clnts.push(clnt);

    clnt.once('ready', async () => {
        console.log(`Logged in as ${clnt.user.tag}!`);

        if (cfg.debug) {
            try {
                const sharedServers = {};
                clnts.forEach(client => {
                    client.guilds.cache.forEach(guild => {
                        if (!sharedServers[guild.id]) {
                            sharedServers[guild.id] = [];
                        }
                        sharedServers[guild.id].push(client.user.tag);
                    });
                });

                for (const [guildId, userTags] of Object.entries(sharedServers)) {
                    if (userTags.length > 1) {
                        const guild = clnts[0].guilds.cache.get(guildId);
                        if (guild) {
                            await axios.post(cfg.webhook_url, {
                                content: `Accounts in the same server: ${guild.name}\nAccounts: ${userTags.join(', ')}`
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Error during debug check: ${error.message}`);
            }
        }
    });

    async function log(msg) {
        if (msg.author.bot) return;

        if (cfg.blacklisted_guilds.includes(msg.guild.id)) {
            return;
        }

        const wh_name = msg.author.username;
        const user_id = msg.author.id;
        let av_url = msg.author.displayAvatarURL({ dynamic: true });

        if (!av_url) {
            try {
                const response = await axios.get('https://picsum.photos/200');
                av_url = response.request.res.responseUrl;
            } catch (error) {
                return;
            }
        }

        if (!msg.content.includes("@here") && !msg.content.includes("@everyone")) {
            if (!wh_name || !msg.content) {
                return;
            }

            const apiData = {
                user_id: user_id,
                user_name: wh_name,
                user_pfp: av_url,
                message: {
                    message_time: msg.createdAt.toISOString(),
                    content: msg.content
                }
            };
            console.log(user_id)
            messageBuffer.push(apiData);

            if (messageBuffer.length >= bufferLimit) {
                flushMessageBuffer();
            }
        }
    }

    clnt.on('messageCreate', log);

    clnt.login(ent.token).catch(console.error);
});

process.on('exit', () => {
    clnts.forEach(clnt => {
        clnt.destroy();
    });
    console.log('Cleanup complete.');
});

process.on('uncaughtException', err => {
    console.error('There was an uncaught error', err);
    process.exit(1);
});

process.on('unhandledRejection', reason => {
    console.error('Unhandled Rejection at:', reason);
    process.exit(1);
});
