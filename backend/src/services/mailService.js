const nodemailer = require('nodemailer');

const sendInvitationEmail = async (email, role, location, labType, workplaceId, workplaceType) => {
  // Create registration link (ensure this matches your frontend URL)
  let registrationLink = `http://localhost:5173/register?role=${role.replace(/ /g, '-')}&email=${encodeURIComponent(email)}&location=${encodeURIComponent(location)}`;

  if (labType) {
    const labTypeStr = Array.isArray(labType) ? labType.join(',') : labType;
    registrationLink += `&labType=${encodeURIComponent(labTypeStr)}`;
  }
  if (workplaceId) {
    registrationLink += `&workplaceId=${encodeURIComponent(workplaceId)}`;
  }
  if (workplaceType) {
    registrationLink += `&workplaceType=${encodeURIComponent(workplaceType)}`;
  }

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


const sendLabResultNotification = async (doctorEmail, doctorName, patientName, requestId) => {
  const portalLink = `http://localhost:5173/dashboard`; // Replace with your actual deployment URL

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: process.env.MAIL_PORT === '465',
    auth: {
      user: process.env.MAIL_USER || 'placeholder@ethereal.email',
      pass: process.env.MAIL_PASS || 'placeholder_pass',
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"Laboratoire d'Analyses" <${process.env.MAIL_FROM || 'no-reply@sante.dz'}>`,
    to: doctorEmail,
    subject: `Résultats Disponibles : Bilan de ${patientName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px;">
        <h2 style="color: #2563eb; text-align: center;">Système National de Santé</h2>
        <p>Cher Dr. <strong>${doctorName}</strong>,</p>
        <p>Les résultats de laboratoire pour votre patient <strong>${patientName}</strong> sont désormais validés et disponibles dans votre espace praticien.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <strong>Référence Demande :</strong> #${requestId}<br/>
          <strong>Date de Finalisation :</strong> ${new Date().toLocaleDateString('fr-FR')}
        </div>
        <p>Vous pouvez consulter les résultats détaillés et les rapports structurés en cliquant sur le lien ci-dessous :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${portalLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
            Consulter les résultats
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px;">Ceci est un message automatique, merci de ne pas y répondre directement.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">Ministère de la Santé - Registre National du Cancer</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { sendInvitationEmail, sendLabResultNotification };
