export function logError(error) {
    console.error(`[${date()}]: Error: ${error}`);
}

export function log(message) {
    console.log(`[${date()}]: ${message}`);
}

export function logLine() {
    console.log('----------------------------------------');
}

function date() {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'short',
        timeStyle: 'long'
      }).format(new Date())
}