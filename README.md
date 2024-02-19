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