const http = require('http');

const registerData = JSON.stringify({
  name: "Admin",
  email: "admin@example.com",
  password: "admin123",
  role: "Administrateur National",
  location: "Alger"
});

const loginData = JSON.stringify({
  email: "admin@example.com",
  password: "admin123"
});

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: path,
      method: method,
      headers: {}
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (e) => reject(e));
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

(async () => {
  try {
    console.log('⏳ Attempting to register admin user...');
    const regRes = await makeRequest('POST', '/api/auth/register', registerData);
    console.log(`Register status: ${regRes.statusCode}`);
    console.log(`Register response: ${regRes.body}`);

    let userId = null;
    if (regRes.statusCode === 201) {
      const resObj = JSON.parse(regRes.body);
      userId = resObj.user.id;
    } else {
      // If user already exists, let's fetch the list of users to find their ID
      console.log('⏳ Fetching users list to find admin ID...');
      const usersRes = await makeRequest('GET', '/api/users');
      const users = JSON.parse(usersRes.body);
      const adminUser = users.find(u => u.email === 'admin@example.com');
      if (adminUser) {
        userId = adminUser.id;
      }
    }

    if (userId) {
      console.log(`⏳ Approving user with ID ${userId}...`);
      const approveRes = await makeRequest('PATCH', `/api/users/${userId}/approve`);
      console.log(`Approve status: ${approveRes.statusCode}`);
      console.log(`Approve response: ${approveRes.body}`);
    } else {
      console.error('❌ Could not find or create admin user.');
    }

    console.log('\n⏳ Attempting to login admin user...');
    const loginRes = await makeRequest('POST', '/api/auth/login', loginData);
    console.log(`Login status: ${loginRes.statusCode}`);
    console.log(`Login response: ${loginRes.body}`);
  } catch (err) {
    console.error('❌ Request failed:', err);
  }
})();
