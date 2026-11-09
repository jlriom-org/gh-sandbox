const http = require("node:http");

/**
 * INTENTIONALLY VULNERABLE.
 * GHAS / CodeQL security testing only.
 */
function fetchRemoteResource(targetUrl) {
    return new Promise((resolve, reject) => {

        // BAD: targetUrl is entirely user controlled.
        http.get(targetUrl, (response) => {
            let body = "";

            response.on("data", chunk => {
                body += chunk;
            });

            response.on("end", () => {
                resolve(body);
            });
        }).on("error", reject);
    });
}
