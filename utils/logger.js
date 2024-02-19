function logError(error) {
    console.error(`[${new Date().toISOString()}]: Error: ${error}`);
}

function log(message) {
    console.log(`[${new Date().toISOString()}]: ${message}`);
}

function logLine() {
    console.log('----------------------------------------');
}

module.exports = {
    logError,
    log,
    logLine,
};