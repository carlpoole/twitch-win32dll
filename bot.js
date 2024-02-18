const { clientId, accessId } = require('./secrets');
const { parseMessage } = require('./parseMessage');
const WebSocketClient = require('websocket').client;

const client = new WebSocketClient();

const admins = ['realgametheory', 'win32dll'];

const channel = '#realgametheory';
const broadcasterId = '221896751';
const username = 'win32dll';
const moderatorId = '477920281';
const password = `oauth:${accessId}`;

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function connect(connection) {
    console.log('Connecting to Twitch IRC...');

    connection.sendUTF(`CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership`);
    connection.sendUTF(`PASS ${password}`);
    connection.sendUTF(`NICK ${username}`);
  
    connection.sendUTF(`JOIN ${channel}`);

    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });

    connection.on('close', function() {
        console.log('Connection Closed');
        console.log(`close description: ${connection.closeDescription}`);
        console.log(`close reason code: ${connection.closeReasonCode}`);

        clearInterval(intervalObj);
    });

    // Process Messages

    connection.on('message', function(ircMessage) {
        if (ircMessage.type === 'utf8') {
            let rawIrcMessage = ircMessage.utf8Data.trimEnd();
            console.log(`Message received (${new Date().toISOString()}): '${rawIrcMessage}'\n`);

            let messages = rawIrcMessage.split('\r\n');  // The IRC message may contain one or more messages.
            messages.forEach(message => {
                let parsedMessage = parseMessage(message);
            
                if (parsedMessage) {
                    // console.log(`Message command: ${parsedMessage.command.command}`);
                    // console.log(`\n${JSON.stringify(parsedMessage, null, 3)}`)

                    switch (parsedMessage.command.command) {
                        case 'PRIVMSG':
                            // Ignore all messages except the '!move' bot
                            // command. A user can post a !move command to change the 
                            // interval for when the bot posts its move message.

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
                            connection.sendUTF(`JOIN ${channel}`); 
                            break; 
                        case 'JOIN':
                            // Send the initial move message. All other move messages are
                            // sent by the timer.
                            //connection.sendUTF(`PRIVMSG ${channel} :${moveMessage}`);
                            break;
                        case 'PART':
                            console.log('The channel must have banned (/ban) the bot.');
                            connection.close();
                            break;
                        case 'NOTICE': 
                            // If the authentication failed, leave the channel.
                            // The server will close the connection.
                            if ('Login authentication failed' === parsedMessage.parameters) {
                                console.log(`Authentication failed; left ${channel}`);
                                connection.sendUTF(`PART ${channel}`);
                            }
                            else if ('You don’t have permission to perform that action' === parsedMessage.parameters) {
                                console.log(`No permission. Check if the access token is still valid. Left ${channel}`);
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
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error))
}