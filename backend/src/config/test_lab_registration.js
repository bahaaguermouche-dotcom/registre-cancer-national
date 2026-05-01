const axios = require('axios');

async function testLabRegistration() {
    console.log("--- Testing Lab Registration ---");
    try {
        const payload = {
            name: "Lab Test Manager",
            email: `test_lab_${Date.now()}@sante.dz`,
            phone: "0123456789",
            password: "Password123",
            role: "Laboratoire",
            location: "13 Tlemcen",
            hospitalName: "Labo Anapath Central",
            lab_type: "A",
            lab_activities: ["Biopsie", "IHC (Immunohistochimie)", "FISH"]
        };

        const response = await axios.post('http://localhost:5000/api/auth/register', payload);
        console.log("✅ Registration status:", response.status);

        // Verify via users api
        const usersResponse = await axios.get('http://localhost:5000/api/users');
        const newUser = usersResponse.data.find(u => u.email === payload.email);

        if (newUser && newUser.lab_type === 'A' && newUser.lab_activities.length === 3) {
            console.log("✅ Lab Metadata Verification: SUCCESS");
            console.log("   Type:", newUser.lab_type);
            console.log("   Activities:", newUser.lab_activities.join(", "));
        } else {
            console.error("❌ Lab Metadata Verification: FAILED");
            console.log("   Received:", newUser);
        }

    } catch (error) {
        console.error("❌ Test Error:", error.response?.data || error.message);
    }
}

testLabRegistration();
