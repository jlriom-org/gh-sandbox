const { exec } = require("node:child_process");

/**
 * INTENTIONALLY VULNERABLE.
 * Use only in an isolated security-testing repository.
 */
function checkHost(hostname) {
    return new Promise((resolve, reject) => {
        // User-controlled input is concatenated into a shell command.
        exec(`ping -c 1 ${hostname}`, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
                return;
            }

            resolve(stdout);
        });
    });
}