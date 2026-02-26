const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testMail() {
    console.log('--- Testing SMTP Connection ---');
    console.log('Host:', process.env.MAIL_HOST);
    console.log('Port:', process.env.MAIL_PORT);
    console.log('User:', process.env.MAIL_USER);

    const port = parseInt(process.env.MAIL_PORT || '587');
    const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: port,
        secure: port === 465,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Verifying transporter...');
        await transporter.verify();
        console.log('✅ Connection successful!');

        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: `"Registry Test" <${process.env.MAIL_USER}>`,
            to: process.env.MAIL_USER,
            subject: "Test Diagnostic",
            text: "Ceci est un test de connexion SMTP."
        });
        console.log('✅ Email sent successfully! Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ SMTP Error encountered:');
        console.error(error.message);
        if (error.code === 'EAUTH') {
            console.log('\n💡 SUGGESTION: This is an Authentication error.');
            console.log('If you are using Gmail, your regular password will NOT work.');
            console.log('You MUST use a 16-character "App Password".');
        }
    }
}

testMail();
