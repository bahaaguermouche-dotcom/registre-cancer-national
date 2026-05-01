const db = require('./db'); // The configured pool

async function main() {
    try {
        const res = await db.query("SELECT * FROM bilan_packages LIMIT 1");
        console.log("Table exists:", res.rows);
    } catch (e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}
main();
