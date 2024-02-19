# twitch-win32dll
Twitch Bot Experiments

This is the framework for a simple bot that listens to chat messages and responds with what I want.

## Required Secrets File

Add a `secrets.json` file in the project root that contains the following fields:

```json
{
  "clientId": "<YOUR CLIENT ID>",
  "clientSecret": "<YOUR CLIENT SECRET>",
  "accessId": "<YOUR ACCESS TOKEN>",
  "refreshToken": "<YOUR REFRESH TOKEN>"
}
```

Make sure to follow the [Twitch Documentation](https://dev.twitch.tv/docs/cli/token-command/) to create your User Access Token with the correct permission scopes. I am using scopes: `[channel:moderate chat:edit chat:read moderator:manage:chat_settings user:edit:broadcast]`

E.G. using the twitch cli:

`twitch token -u -s 'channel:moderate chat:edit chat:read moderator:manage:chat_settings user:edit:broadcast'`

then enter the required results in `./secrets.json`

## Required Config File

Modify the config file with the desired options

| Field        | Example                          | Description                                                                                                                                             |
|--------------|----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| channel      | `#realgametheory`                | the username of the channel you want the bot to connect to, preceded by a hashtag                                                                       |
| channelId    | `221896751`                      | the numeric ID of the channel you want the bot to connect to. Use the Twitch API to get the ID or a tool like <https://streamscharts.com/tools/convert-username> |
| botUsername  | `win32dll`                       | the username of the bot user                                                                                                                            |
| botUserId    | `477920281`                      | the numeric ID of the bot user. Use the Twitch API to get the ID or a tool like <https://streamscharts.com/tools/convert-username>                      |
| admins       | `["realgametheory", "win32dll"]` | an array of twitch usernames who should have permissions to use mod commands                                                                            |

## Run

`node bot.js`