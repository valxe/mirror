const dsc = require('discord.js-selfbot-v13');
const axios = require('axios');
const fs = require('fs');
const { performance } = require('perf_hooks');

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const clnts = [];

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

        const wh_url = ent.channels[msg.channel.id];
        if (!wh_url) {
            return;
        }

        const wh_name = msg.author.username;
        let av_url = msg.author.displayAvatarURL({ dynamic: true });

        if (!av_url) {
            // Fetch a random image URL from picsum.photos
            try {
                const response = await axios.get('https://picsum.photos/200');
                av_url = response.request.res.responseUrl;
            } catch (error) {
                console.error('Error fetching random image:', error.message);
                return;
            }
        }

        if (!msg.content.includes("@here") && !msg.content.includes("@everyone")) {
            if (!wh_name || !msg.content || !wh_url) {
                console.log('One or more required fields are empty. Not sending the request.');
                return;
            }

            const data = {
                username: wh_name,
                avatar_url: av_url,
                content: msg.content
            };

            const opts = ent.use_flask
                ? {
                    url: ent.flask_server,
                    method: 'POST',
                    data: {
                        ...data,
                        webhook_url: wh_url
                    }
                }
                : {
                    url: wh_url,
                    method: 'POST',
                    data
                };

            axios(opts)
                .then(() => {})
                .catch(err => {
                    console.error(`Error sending message [${opts.url}]: ${err.message}`);
                });
        } else {
            console.log('Message contains @here or @everyone. Not sending via webhook.');
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
