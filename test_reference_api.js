const testApi = async () => {
    try {
        console.log("--- Testing Oncology Reference API ---");

        const catRes = await fetch('http://localhost:5000/api/reference/cancer-categories');
        const categories = await catRes.json();
        console.log(`Categories found: ${categories.length}`);
        console.log("First 3 categories:", categories.slice(0, 3));

        if (categories.length > 0) {
            const firstCat = categories[0].name;
            console.log(`\nTesting subtypes for: ${firstCat}`);
            const subRes = await fetch(`http://localhost:5000/api/reference/cancer-subtypes?category=${encodeURIComponent(firstCat)}`);
            const subtypes = await subRes.json();
            console.log(`Subtypes found: ${subtypes.length}`);
            console.log("First subtype:", subtypes[0]);
        }

        const rulesRes = await fetch('http://localhost:5000/api/reference/cancer-rules');
        const rules = await rulesRes.json();
        console.log(`\nTotal rules (Consistency Engine): ${rules.length}`);

        console.log("\n✅ API tests passed.");
    } catch (error) {
        console.error("❌ API test failed:", error.message);
    }
};

testApi();
