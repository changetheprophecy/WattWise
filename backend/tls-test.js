
const tls = require("tls");

const hosts = [
    "ac-aaifuyc-shard-00-00.is78p9q.mongodb.net",
    "ac-aaifuyc-shard-00-01.is78p9q.mongodb.net",
    "ac-aaifuyc-shard-00-02.is78p9q.mongodb.net"
];

async function testTLS(host, version) {
    return new Promise((resolve) => {
        const socket = tls.connect({
            host,
            port: 27017,
            servername: host,
            minVersion: version,
            maxVersion: version,
            rejectUnauthorized: true,
            timeout: 10000
        });

        socket.once("secureConnect", () => {
            console.log(`${host} | ${version} | SUCCESS`);
            socket.destroy();
            resolve();
        });

        socket.once("error", (err) => {
            console.log(`${host} | ${version} | FAILED: ${err.code}`);
            resolve();
        });

        socket.once("timeout", () => {
            console.log(`${host} | ${version} | TIMEOUT`);
            socket.destroy();
            resolve();
        });
    });
}

(async () => {
    for (const version of ["TLSv1.2", "TLSv1.3"]) {
        console.log(`\n========== ${version} ==========`);

        for (const host of hosts) {
            await testTLS(host, version);
        }
    }
})();
