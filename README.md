# twitch-win32dll
Twitch Bot Experiments

This is the framework for a simple bot that listens to chat messages and responds with what I want.

## Required Secrets File

Add a `secrets.json` file that exports the following two variables

```json
{
  "clientId": "<YOUR CLIENT ID>",
  "clientSecret": "<YOUR CLIENT SECRET>",
  "accessId": "<YOUR ACCESS TOKEN>",
  "refreshToken": "<YOUR REFRESH TOKEN>"
}
```

Make sure to follow the [Twitch Documentation](https://dev.twitch.tv/docs/cli/token-command/) to create your User Access Token with the correct permission scopes. I am using scopes: `[channel:moderate chat:edit chat:read moderator:manage:chat_settings user:edit:broadcast]`