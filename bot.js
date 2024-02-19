const { parseMessage } = require('./parseMessage');
const WebSocketClient = require('websocket').client;

const secretStore = require('data-store')({ path: process.cwd() + '/secrets.json' });
const clientId = secretStore.get('clientId');
const clientSecret = secretStore.get('clientSecret');
var accessId = secretStore.get('accessId');
var refreshToken = secretStore.get('refreshToken');

if (undefined === clientId || undefined === clientSecret ||  undefined === accessId || undefined === refreshToken) {
    logError('Missing clientId, clientSecret, accessId, or refreshToken in secrets.json');
    logError('See the README for more information on how to set up the secrets.json file.');
    process.exit(1);S
}

const configStore = require('data-store')({ path: process.cwd() + '/config.json' });
const admins = configStore.get('admins');
const channel = configStore.get('channel');
const broadcasterId = configStore.get('channelId');
const username = configStore.get('botUsername');
const moderatorId = configStore.get('botUserId');

if (undefined === admins || undefined === channel || undefined === broadcasterId || undefined === username || undefined === moderatorId) {
    logError('Missing admins, channel, channelId, botUsername, or botUserId in config.json');
    logError('See the README for more information on how to set up the config.json file.');
    process.exit(1);
}

const client = new WebSocketClient();

client.on('connectFailed', function(error) {
    logError('Connect Error - ' + error.toString());
});

client.on('connect', function connect(connection) {
    log('Connecting to Twitch IRC...');

    connection.sendUTF(`CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership`);
    connection.sendUTF(`PASS oauth:${accessId}`);
    connection.sendUTF(`NICK ${username}`);
  
    connection.sendUTF(`JOIN ${channel}`);

    connection.on('error', function(error) {
        log("Connection Error: " + error.toString());
    });

    connection.on('close', function() {
        log('Connection Closed');
        log(`close description: ${connection.closeDescription}`);
        log(`close reason code: ${connection.closeReasonCode}`);
        logLine();
    });

    // Process Messages
    connection.on('message', function(ircMessage) {
        if (ircMessage.type === 'utf8') {
            let rawIrcMessage = ircMessage.utf8Data.trimEnd();
            // Uncomment to troubleshoot
            //log(`Message received (${new Date().toISOString()}): '${rawIrcMessage}'\n`);

            let messages = rawIrcMessage.split('\r\n');
            messages.forEach(message => {
                let parsedMessage = parseMessage(message);
            
                if (parsedMessage) {
                    // Log all chat messages
                    if (parsedMessage.source && parsedMessage.source.nick && parsedMessage.parameters) {
                        log(`Chat from ${parsedMessage.source.nick}: ${parsedMessage.parameters}`)
                    }

                    switch (parsedMessage.command.command) {
                        case 'PRIVMSG':
                            if ('subonly' === parsedMessage.command.botCommand) {
                                if (admins.includes(parsedMessage.source.nick)) {
                                    subOnlyMode(true);
                                }
                            }

                            if ('freetheplebs' === parsedMessage.command.botCommand) {
                                if (admins.includes(parsedMessage.source.nick)) {
                                    subOnlyMode(false);
                                }
                            }

                            break;
                        case 'PING':
                            connection.sendUTF('PONG ' + parsedMessage.parameters);
                            break;
                        case '001':
                            // Successfully logged in, so join the channel.
                            log(`Login success ${username}`)
                            connection.sendUTF(`JOIN ${channel}`); 
                            break; 
                        case 'JOIN':
                            // Joined
                            break;
                        case 'PART':
                            log(`The channel must have banned (/ban) the bot.`);
                            connection.close();
                            break;
                        case 'NOTICE': 
                            // If the authentication failed, leave the channel.
                            // The server will close the connection.
                            if ('Login authentication failed' === parsedMessage.parameters) {
                                log(`Authentication failed - left ${channel}`);
                                connection.sendUTF(`PART ${channel}`);

                                // Try refreshing the token
                                updateRefreshToken(connection);
                            }
                            else if ('You don’t have permission to perform that action' === parsedMessage.parameters) {
                                log(`No permission. Check if the access token is still valid. Left ${channel}`);
                                connection.sendUTF(`PART ${channel}`);
                            }
                            break;
                        default:
                            ; // Ignore all other IRC messages.
                    }
                }
            });
        }
    });
});

// Connect to Twitch IRC    
client.connect('wss://irc-ws.chat.twitch.tv:443');

function updateRefreshToken(connection) {
    fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'client_id': clientId,
            'client_secret': clientSecret,
            'grant_type': 'refresh_token',
            'refresh_token': refreshToken
        })
    })
    .then(response => {
        if (response.status !== 200) {
            logError(`Problem refreshing tokens - Status code: ${response.status} - ${response.statusText}`);
            logError('Make sure the secrets.json file contains a valid accessId and refreshToken. See the README for more information.');
            log('\nShutting down...');
            connection.close();
            process.exit(1);
        } else {
            return response.json();
        }
    })
    .then(data => {
        // Uncomment to troubleshoot
        //log(data);

        accessId = secretStore.set('accessId', data.access_token).get('accessId');
        refreshToken = secretStore.set('refreshToken', data.refresh_token).get('refreshToken');
        log(`Refreshed and saved tokens`);

        // If websocket issue caused the refresh, reconnect to Twitch IRC
        if(connection) {
            connection.close();
            client.connect('wss://irc-ws.chat.twitch.tv:443');
        }
    })
    .catch(error => logError(error))
}

function subOnlyMode(enabled) {
    fetch('https://api.twitch.tv/helix/chat/settings?broadcaster_id=' + broadcasterId + '&moderator_id=' + moderatorId, {
        method: 'PATCH',
        headers: {
            'Client-ID': clientId,
            'Authorization': 'Bearer ' + accessId,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "subscriber_mode": enabled })
    })
    .then(response => response.json())
    .then(data => log(`Sub only mode ${enabled ? 'enabled' : 'disabled'}`))
    .catch(error => logError(error))
}

function logError(error) {
    console.error(`[${new Date().toISOString()}]: Error: ${error}`);
}

function log(message) {
    console.log(`[${new Date().toISOString()}]: ${message}`);
}

function logLine() {
    console.log('----------------------------------------');
}