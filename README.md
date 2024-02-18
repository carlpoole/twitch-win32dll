# twitch-win32dll
Twitch Bot Experiments

This is the framework for a simple bot that listens to chat messages and responds with what I want.

## Secrets file

Add a `secrets.js` file that exports the following two variables

```js
exports.clientId = '<YOUR CLIENT ID>';
exports.accessId = '<YOUR ACCESS TOKEN>';
```

Make sure to follow the [Twitch Documentation](https://dev.twitch.tv/docs/cli/token-command/) to create your User Access Token with the correct permission scopes. I am using scopes: `[channel:moderate chat:edit chat:read moderator:manage:chat_settings user:edit:broadcast]`