function logError(error) {
    console.error(`[${date()}]: Error: ${error}`);
}

function log(message) {
    console.log(`[${date()}]: ${message}`);
}

function logLine() {
    console.log('----------------------------------------');
}

function date() {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'short',
        timeStyle: 'long'
      }).format(new Date())
}

module.exports = {
    logError,
    log,
    logLine,
};