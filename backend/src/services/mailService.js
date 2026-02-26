const nodemailer = require('nodemailer');

const sendInvitationEmail = async (email, role, location) => {
  // Create registration link (ensure this matches your frontend URL)
  const registrationLink = `http://localhost:5173/register?role=${role.replace(/ /g, '-')}&email=${encodeURIComponent(email)}&location=${encodeURIComponent(location)}`;

  // Configuration for the mail transporter
  // Automatically detect if we should use SSL (port 465) or STARTTLS (other ports)
  const port = parseInt(process.env.MAIL_PORT || '587');
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.ethereal.email',
    port: port,
    secure: port === 465, // true for 465 (SSL), false for other ports (STARTTLS)
    auth: {
      user: process.env.MAIL_USER || 'placeholder@ethereal.email',
      pass: process.env.MAIL_PASS || 'placeholder_pass',
    },
    tls: {
      // Do not fail on invalid certs (common for internal SMTP)
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"Registre Cancer National" <${process.env.MAIL_FROM || 'no-reply@sante.dz'}>`,
    to: email,
    subject: `Invitation : Inscription au Registre National du Cancer (${role})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #00AAFF; text-align: center;">National Cancer Registry</h2>
        <p>Bonjour,</p>
        <p>Vous avez été invité à rejoindre le <strong>Système National de Registre du Cancer</strong> en tant que : <strong>${role}</strong>.</p>
        <p>Localisation : <strong>${location}</strong></p>
        <p>Veuillez cliquer sur le bouton ci-dessous pour compléter votre inscription :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${registrationLink}" style="background-color: #00AAFF; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Compléter mon inscription
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">Ce lien est strictement personnel et expire dans 48 heures.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">Ministère de la Santé - Algérie</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { sendInvitationEmail };
