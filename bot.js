const { logError, log, logLine } = require('./utils/logger');
const { parseMessage } = require('./utils/parseMessage');
const WebSocket = require('websocket');
const WebSocketClient = require('websocket').client;

const secretStore = require('data-store')({ path: `${process.cwd()}/secrets.json` });
const clientId = secretStore.get('clientId');
const clientSecret = secretStore.get('clientSecret');
var accessId = secretStore.get('accessId');
var refreshToken = secretStore.get('refreshToken');

const requiredSecretFields = [clientId, clientSecret, accessId, refreshToken];
if(requiredSecretFields.some(field => field === undefined)) {
    logError('Missing clientId, clientSecret, accessId, or refreshToken in secrets.json');
    logError('See the README for more information on how to set up the secrets.json file.');
    process.exit(1);
}

const configStore = require('data-store')({ path: `${process.cwd()}/config.json` });
const admins = configStore.get('admins');
const channel = configStore.get('channel');
const broadcasterId = configStore.get('channelId');
const username = configStore.get('botUsername');
const moderatorId = configStore.get('botUserId');

const requiredConfigFields = [admins, channel, broadcasterId, username, moderatorId];
if (requiredConfigFields.some(field => field === undefined)) {
    logError('Missing admins, channel, channelId, botUsername, or botUserId in config.json');
    logError('See the README for more information on how to set up the config.json file.');
    process.exit(1);
}

const client = new WebSocketClient();

client.on('connectFailed', function(error) {
    logError(`Connect Error - ${error.toString()}`);
});

client.on('connect', function connect(connection) {
    log('Connecting to Twitch IRC...');

    connection.sendUTF(`CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership`);
    connection.sendUTF(`PASS oauth:${accessId}`);
    connection.sendUTF(`NICK ${username}`);

    connection.sendUTF(`JOIN ${channel}`);

    connection.on('error', function(error) {
        log(`Connection Error - ${error.toString()}`);
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
                            if ('kill' === parsedMessage.command.botCommand) {
                                if (admins.includes(parsedMessage.source.nick)) {
                                    connection.sendUTF(`PRIVMSG ${channel} :My people need me, I must go now.`);
                                    connection.close();
                                    process.exit(1);
                                }
                            }

                            if ('subonly' === parsedMessage.command.botCommand) {
                                if (admins.includes(parsedMessage.source.nick)) {
                                    subOnlyMode(true, connection);
                                }
                            }

                            if ('freetheplebs' === parsedMessage.command.botCommand) {
                                if (admins.includes(parsedMessage.source.nick)) {
                                    subOnlyMode(false, connection);
                                }
                            }

                            if ('id' === parsedMessage.command.botCommand) {
                                if (parsedMessage.command.botCommandParams) {
                                    const targetUser = parsedMessage.command.botCommandParams.split(' ')[0];
                                    getUserId(targetUser, connection);
                                } else {
                                    connection.sendUTF(`PRIVMSG ${channel} :${parsedMessage.source.nick} your user id is ${parsedMessage.tags['user-id']}`);
                                }
                            }

                            break;
                        case 'PING':
                            connection.sendUTF(`PONG ${parsedMessage.parameters}`);
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

async function updateRefreshToken(connection) {
    try {
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
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

        if (response.status !== 200) {
            logError(`Problem refreshing tokens - Status code: ${response.status} - ${response.statusText}`);
            logError('Make sure the secrets.json file contains a valid accessId and refreshToken. See the README for more information.');
            log('Shutting down...');

            if(connection) {
                connection.close();
            }

            process.exit(1);
        }

        // Uncomment to troubleshoot
        //log(data);
        const data = await response.json();

        accessId = secretStore.set('accessId', data.access_token).get('accessId');
        refreshToken = secretStore.set('refreshToken', data.refresh_token).get('refreshToken');
        log(`Refreshed and saved tokens`);

        // If websocket issue caused the refresh, reconnect to Twitch IRC
        if(connection) {
            connection.close();
            client.connect('wss://irc-ws.chat.twitch.tv:443');
        } else {
            return true;
        }
    } catch (error) {
        logError(error)
        return false;
    }
}

async function subOnlyMode(enabled, connection) {
    try {
        const response = await fetch(`https://api.twitch.tv/helix/chat/settings?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`, {
            method: 'PATCH',
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessId}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ "subscriber_mode": enabled })
        })

        if (response.status === 401) {
            logError(`Problem changing sub mode - Status code: ${response.status} - ${response.statusText}`);
            log('Attempting token update...');

            const result = await updateRefreshToken(connection);
            if(result) {
                subOnlyMode(enabled, connection);
                return false;
            } else {
                logError('Token update failed. Exiting...');
                if (connection.readyState === WebSocket.OPEN) {
                    connection.sendUTF(`PRIVMSG ${channel} :Sorry something bad happened. My people need me, I must go now.`);
                }
                connection.close();
                process.exit(1);
            }
        }

        const data = await response.json();
        if (data) {
            log(`Sub only mode ${enabled ? 'enabled' : 'disabled'}`)
        }
    } catch (error) {
        if (connection.readyState === WebSocket.OPEN) {
            connection.sendUTF(`PRIVMSG ${channel} :Couldn't set Sub Only mode to ${enabled}.`)
        }

        logError(error);
    }
}

async function getUserId(username, connection) {
    try {
        const response = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
            method: 'GET',
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessId}`
            }
        })

        if (response.status === 401) {
            logError(`Problem getting user ID - Status code: ${response.status} - ${response.statusText}`);
            log('Attempting token update...');

            updateRefreshToken().then(result => {
                if(result) {
                    getUserId(username, connection);
                    return false;
                } else {
                    logError('Token update failed. Exiting...');
                    if (connection.readyState === WebSocket.OPEN) {
                        connection.sendUTF(`PRIVMSG ${channel} :Sorry something bad happened. My people need me, I must go now.`);
                    }
                    connection.close();
                    process.exit(1);
                }
            });
        }

        const data = await response.json();
        if (data) {
            connection.sendUTF(`PRIVMSG ${channel} :${username}'s user id is ${data.data[0].id}`);
        }
    } catch (error) {
        if (connection.readyState === WebSocket.OPEN) {
            connection.sendUTF(`PRIVMSG ${channel} :Couldn't get the user ID for ${username}.`)
        }

        logError(error);
    }
}