const https = require('https');

/**
 * Send an email via the Brevo (Sendinblue) Transactional Email HTTP API.
 * Uses HTTPS port 443 — never blocked by Render free tier.
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 */
const sendViaBrevo = (options) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      return reject(new Error('BREVO_API_KEY environment variable is not set.'));
    }

    const payload = JSON.stringify({
      sender: { name: options.senderName, email: options.senderEmail },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
    });

    const reqOptions = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Brevo API error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Brevo response parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('Brevo API request timed out after 15s'));
    });

    req.write(payload);
    req.end();
  });
};

// ─────────────────────────────────────────────────────────────────────────────

const sendInvitationEmail = async (email, role, location, labType, workplaceId, workplaceType) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://bahabaha2405-5d861.web.app';
  let registrationLink = `${FRONTEND_URL}/register?role=${role.replace(/ /g, '-')}&email=${encodeURIComponent(email)}&location=${encodeURIComponent(location)}`;

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

  const senderEmail = process.env.MAIL_FROM || process.env.MAIL_USER || 'no-reply@example.com';

  try {
    const result = await sendViaBrevo({
      senderName: 'Registre Cancer National',
      senderEmail,
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
    });

    console.log(`[Email] Invitation sent to ${email}. Brevo messageId: ${result.messageId}`);
    return { success: true, sent: true, messageId: result.messageId, registrationLink };
  } catch (error) {
    console.error('[Email] Invitation send failed, returning fallback link. Error:', error.message);
    return { success: true, sent: false, error: error.message, registrationLink };
  }
};

// ─────────────────────────────────────────────────────────────────────────────

const sendLabResultNotification = async (doctorEmail, doctorName, patientName, requestId) => {
  const portalLink = process.env.FRONTEND_URL || 'https://bahabaha2405-5d861.web.app';
  const senderEmail = process.env.MAIL_FROM || process.env.MAIL_USER || 'no-reply@example.com';

  try {
    const result = await sendViaBrevo({
      senderName: "Laboratoire d'Analyses",
      senderEmail,
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
          <p>Vous pouvez consulter les résultats détaillés en cliquant sur le lien ci-dessous :</p>
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
    });

    console.log(`[Email] Lab notification sent to ${doctorEmail}. Brevo messageId: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Email] Lab notification send failed. Error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendInvitationEmail, sendLabResultNotification };
