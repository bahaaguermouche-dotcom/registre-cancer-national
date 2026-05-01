const axios = require('axios');

async function testMatch() {
    console.log("--- Testing Lab Matching Logic ---");
    try {
        const tests = ["NFS", "Scanner"];
        console.log("Matching labs for:", tests);

        const res = await axios.post('http://localhost:5000/api/laboratories/match', { tests });
        console.log("Matched Labs:", res.data.map(l => l.name));

        if (res.data.length > 0) {
            console.log("✅ Success: Labs found.");
        } else {
            console.log("⚠️ No labs found (Expected if no labs have both NFS and Scanner in DB).");
        }
    } catch (e) {
        console.error("❌ Test failed:", e.message);
    }
}

testMatch();
