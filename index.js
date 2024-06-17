const dsc = require('discord.js-selfbot-v13');
const axios = require('axios');
const fs = require('fs');
const { performance } = require('perf_hooks');

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const clnts = [];
let messageBuffer = [];
const bufferLimit = 1000;
const bufferFlushInterval = 5000;

function log_mem_usage() {
    const used = process.memoryUsage();
    for (let key in used) {
        console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
    }
}

setInterval(log_mem_usage, 30000);

cfg.tokens.forEach(ent => {
    const clnt = new dsc.Client({
        checkUpdate: false,
    });

    clnts.push(clnt);

    clnt.once('ready', () => {
        console.log(`Logged in as ${clnt.user.tag}!`);
    });

    async function log(msg) {
        if (msg.author.bot) return;

        if (cfg.blacklisted_guilds.includes(msg.guild.id)) {
            return;
        }

        const wh_name = msg.author.username;
        let av_url = msg.author.displayAvatarURL({ dynamic: true });

        console.log(`Username: ${wh_name}, Message: ${msg.content}`); // Print each username and message received

        if (!av_url) {
            try {
                const response = await axios.get('https://picsum.photos/200');
                av_url = response.request.res.responseUrl;
            } catch (error) {
                console.error('Error fetching random image:', error.message);
                return;
            }
        }

        if (!msg.content.includes("@here") && !msg.content.includes("@everyone")) {
            if (!wh_name || !msg.content) {
                console.log('One or more required fields are empty. Skipping this message.');
                return;
            }

            const apiData = {
                user_name: wh_name,
                user_pfp: av_url,
                message: {
                    message_time: msg.createdAt.toISOString(),
                    content: msg.content
                }
            };

            messageBuffer.push(apiData);

            if (messageBuffer.length >= bufferLimit) {
                flushMessageBuffer();
            }
        } else {
            console.log('Message contains @here or @everyone. Not sending via webhook.');
        }
    }

    async function flushMessageBuffer() {
        if (messageBuffer.length === 0) return;

        const bufferToSend = messageBuffer.filter(msg => msg.user_name && msg.message.content); // Filter out incomplete messages
        messageBuffer = [];

        if (bufferToSend.length === 0) {
            console.log('No valid messages to send in bulk.');
            return;
        }

        try {
            await axios.post('http://game2.3forlife.fr:30125/api/save_bulk', { messages: bufferToSend });
            console.log('Bulk message data successfully sent to the API.');
        } catch (err) {
            console.error(`Error sending bulk message data to the API: ${err.message}`);
            messageBuffer = bufferToSend.concat(messageBuffer);
        }
    }

    setInterval(flushMessageBuffer, bufferFlushInterval);

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