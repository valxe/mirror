const Dsc = require('discord.js-selfbot-v13');
const req = require('request-promise-native');
const fs = require('fs');
const {
    performance
} = require('perf_hooks');

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const clnts = [];

function logMemUsage() {
    const used = process.memoryUsage();
    for (let key in used) {
        console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
    }
}

setInterval(logMemUsage, 60000);

cfg.tokens.forEach(ent => {
    const clnt = new Dsc.Client({
        checkUpdate: false,
    });

    clnts.push(clnt);

    clnt.once('ready', () => {
        console.log(`Logged in as ${clnt.user.tag}!`);
    });

    function log(msg) {
        if (msg.author.bot) return;

        const whUrl = ent.channels[msg.channel.id];
        if (!whUrl) {
            return;
        }

        const whName = msg.author.username;
        const avUrl = msg.author.displayAvatarURL({
            dynamic: true
        });

        if (!msg.content.includes("@here") && !msg.content.includes("@everyone")) {
            const opts = {
                uri: ent.flask_server,
                method: 'POST',
                json: {
                    username: whName,
                    content: msg.content,
                    avatar_url: avUrl,
                    webhook_url: whUrl
                }
            };

            req(opts)
                .then(res => {})
                .catch(err => {
                    console.error(`Error sending message to Flask server: ${err.message}`);
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
