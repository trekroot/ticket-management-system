/**
 * Email templates for match notifications
 * Fancy HTML templates with consistent branding
 */

const defaultUrl = 'https://www.dirigounion.com/ticket-exchange';
const logoUrl = 'https://www.ticketexchange.me/assets/du-tms-logo-CEbGGye5.png';

// Shared header component
const emailHeader = `
  <tr>
    <td style="background: linear-gradient(135deg, #1a5f2a 0%, #1e3a5f 100%); padding: 32px 40px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <img src="${logoUrl}" alt="DU Ticket Exchange Logo" width="50" />
      </div>
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
        Dirigo Union Ticket Exchange
      </h1>
    </td>
  </tr>
`;

// Shared footer component
const emailFooter = (includeUnsubscribe = true) => `
  <tr>
    <td style="background-color: #1e3a5f; padding: 24px 40px; text-align: center;">
      <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: 600;">
        Dirigo Union Ticket Exchange
      </p>
      <p style="margin: 0 0 16px 0; color: #a0aec0; font-size: 12px;">
        Keeping tickets in the community, at face value.
      </p>
      <p style="margin: 0; color: #718096; font-size: 11px;">
        ${includeUnsubscribe ? `<a href="${defaultUrl}" style="color: #718096; text-decoration: underline;">Manage notifications</a> &nbsp;·&nbsp;` : ''}
        <a href="mailto:support@ticketexchange.me" style="color: #718096; text-decoration: underline;">Contact support</a>
      </p>
    </td>
  </tr>
`;

// Shared wrapper
const wrapEmail = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Match Initiated - "New Match Found"
 */
export const matchInitiatedTemplate = ({ recipientFirstName, initiatorName, ticketType, gameInfo, section, quantity, price, matchScore, reason }) => {
  const html = wrapEmail(`
    ${emailHeader}

    <!-- Exciting Banner -->
    <tr>
      <td style="background-color: #e8f5e9; padding: 20px 40px; border-bottom: 3px solid #1a5f2a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="40" valign="top">
              <div style="width: 32px; height: 32px; background-color: #1a5f2a; border-radius: 50%; text-align: center; line-height: 32px;">
                <span style="color: #ffffff; font-size: 18px;">&#127919;</span>
              </div>
            </td>
            <td style="padding-left: 16px;">
              <h2 style="margin: 0 0 4px 0; color: #1a5f2a; font-size: 20px; font-weight: 600;">
                New Exchange Request!
              </h2>
              <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                <strong>${initiatorName}</strong> wants to exchange with your ticket.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Content -->
    <tr>
      <td style="padding: 32px 40px;">
        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
          Hello ${recipientFirstName || 'there'},
        </p>

        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
          Good news! Someone is interested in your <strong>${ticketType}</strong> listing.
        </p>

        <!-- Match Details Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #1a5f2a; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <h3 style="margin: 0 0 16px 0; color: #1a5f2a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                Match Details
              </h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Game</span><br>
                    <span style="color: #1e3a5f; font-size: 16px; font-weight: 600;">${gameInfo}</span>
                  </td>
                </tr>
                ${section ? `
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Section</span><br>
                    <span style="color: #333333; font-size: 16px;">${section}</span>
                  </td>
                </tr>
                ` : ''}
                ${quantity ? `
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Quantity</span><br>
                    <span style="color: #333333; font-size: 16px;">${quantity} ticket(s)</span>
                  </td>
                </tr>
                ` : ''}
                ${price ? `
                <tr>
                  <td>
                    <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Price</span><br>
                    <span style="color: #1a5f2a; font-size: 18px; font-weight: 600;">$${price}</span>
                    <span style="color: #6c757d; font-size: 12px;"> per ticket</span>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
        </table>

        ${reason ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border-radius: 8px; border: 1px solid #ffc107; margin-bottom: 24px;">
          <tr>
            <td style="padding: 16px 20px;">
              <span style="color: #856404; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Note from ${initiatorName}</span><br>
              <span style="color: #333333; font-size: 14px; font-style: italic;">"${reason}"</span>
            </td>
          </tr>
        </table>
        ` : ''}

        ${matchScore ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td align="center">
              <span style="display: inline-block; background-color: #fff3cd; color: #856404; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                &#11088; Match Score: ${matchScore}%
              </span>
            </td>
          </tr>
        </table>
        ` : ''}

        <!-- CTA Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 8px 0;">
              <a href="${defaultUrl}" style="display: inline-block; background: linear-gradient(135deg, #1a5f2a 0%, #166b2a 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(26, 95, 42, 0.3);">
                View Exchange Request
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${emailFooter()}
  `);

  const text = `Hello ${recipientFirstName || 'there'},

New Exchange Request!

${initiatorName} wants to exchange with your ${ticketType} listing.

Game: ${gameInfo}
${section ? `Section: ${section}` : ''}
${quantity ? `Quantity: ${quantity} ticket(s)` : ''}
${price ? `Price: $${price} per ticket` : ''}
${reason ? `\nNote from ${initiatorName}: "${reason}"` : ''}
${matchScore ? `Match Score: ${matchScore}%` : ''}

Log in to review and accept or decline: ${defaultUrl}

--
Dirigo Union Ticket Exchange
Keeping tickets in the community, at reasonable prices.`;

  return {
    subject: `New Exchange Request - ${gameInfo}`,
    html,
    text
  };
};

/**
 * Match Accepted
 */
export const matchAcceptedTemplate = ({ recipientFirstName, counterpartyName, counterpartyEmail, counterpartyDiscord, ticketType, gameInfo }) => {
  const html = wrapEmail(`
    ${emailHeader}

    <!-- Info Banner -->
    <tr>
      <td style="background-color: #cce5ff; padding: 20px 40px; border-bottom: 3px solid #1e3a5f;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="40" valign="top">
              <div style="width: 32px; height: 32px; background-color: #1e3a5f; border-radius: 50%; text-align: center; line-height: 32px;">
                <span style="color: #ffffff; font-size: 18px;">&#129309;</span>
              </div>
            </td>
            <td style="padding-left: 16px;">
              <h2 style="margin: 0 0 4px 0; color: #004085; font-size: 20px; font-weight: 600;">
                Your Match Has Been Accepted!
              </h2>
              <p style="margin: 0; color: #004085; font-size: 14px;">
                Time to coordinate with your exchange partner.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Content -->
    <tr>
      <td style="padding: 32px 40px;">
        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
          Hello ${recipientFirstName || 'there'},
        </p>

        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
          Great news! Your ticket exchange has been accepted. Please reach out to coordinate the exchange.
        </p>

        <!-- Exchange Details Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #1e3a5f; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Game</span><br>
                    <span style="color: #1e3a5f; font-size: 16px; font-weight: 600;">${gameInfo}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Type</span><br>
                    <span style="color: #333333; font-size: 16px;">${ticketType}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Counterparty Contact Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border-radius: 8px; border: 1px solid #ffc107; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <h3 style="margin: 0 0 16px 0; color: #856404; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                &#128199; Counterparty Contact Info
              </h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 8px;">
                    <span style="color: #6c757d; font-size: 12px;">Name</span><br>
                    <span style="color: #333333; font-size: 16px; font-weight: 600;">${counterpartyName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 8px;">
                    <span style="color: #6c757d; font-size: 12px;">Email</span><br>
                    <a href="mailto:${counterpartyEmail}" style="color: #1e3a5f; font-size: 16px; text-decoration: none;">${counterpartyEmail}</a>
                  </td>
                </tr>
                ${counterpartyDiscord ? `
                <tr>
                  <td>
                    <span style="color: #6c757d; font-size: 12px;">Discord</span><br>
                    <span style="color: #333333; font-size: 16px;">${counterpartyDiscord}</span>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6; text-align: center; font-style: italic;">
          Please reach out to coordinate the exchange.
        </p>

        <!-- CTA Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 8px 0 24px 0;">
              <a href="${defaultUrl}" style="display: inline-block; background: linear-gradient(135deg, #1a5f2a 0%, #166b2a 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(26, 95, 42, 0.3);">
                View on DU Ticket Exchange
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.6; text-align: center;">
          <span style="color: #c41e3a;">&#9829;</span> Lead with your heart.
        </p>
      </td>
    </tr>

    ${emailFooter(false)}
  `);

  const text = `Hello ${recipientFirstName || 'there'},

Your Match Has Been Accepted!

Great news! Your ticket exchange has been accepted.

Game: ${gameInfo}
Type: ${ticketType}

COUNTERPARTY CONTACT INFO:
Name: ${counterpartyName}
Email: ${counterpartyEmail}
${counterpartyDiscord ? `Discord: ${counterpartyDiscord}` : ''}

Please reach out to coordinate the exchange.

View on DU Ticket Exchange: ${defaultUrl}

Lead with your heart.

--
Dirigo Union Ticket Exchange
Keeping tickets in the community, at reasonable prices.`;

  return {
    subject: `Exchange Accepted - ${gameInfo}`,
    html,
    text
  };
};

/**
 * Match Cancelled
 */
export const matchCancelledTemplate = ({ recipientFirstName, otherPartyName, reason, gameInfo, ticketType }) => {
  const html = wrapEmail(`
    ${emailHeader}

    <!-- Warning Banner -->
    <tr>
      <td style="background-color: #f8d7da; padding: 20px 40px; border-bottom: 3px solid #c41e3a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="40" valign="top">
              <div style="width: 32px; height: 32px; background-color: #c41e3a; border-radius: 50%; text-align: center; line-height: 32px;">
                <span style="color: #ffffff; font-size: 18px;">&#10005;</span>
              </div>
            </td>
            <td style="padding-left: 16px;">
              <h2 style="margin: 0 0 4px 0; color: #721c24; font-size: 20px; font-weight: 600;">
                Exchange Cancelled
              </h2>
              <p style="margin: 0; color: #721c24; font-size: 14px;">
                Your exchange has been cancelled by ${otherPartyName}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Content -->
    <tr>
      <td style="padding: 32px 40px;">
        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
          Hello ${recipientFirstName || 'there'},
        </p>

        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
          Unfortunately, your ticket exchange for <strong>${gameInfo}</strong> has been cancelled by <strong>${otherPartyName}</strong>.
        </p>

        <!-- Exchange Details Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #6c757d; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Game</span><br>
                    <span style="color: #1e3a5f; font-size: 16px; font-weight: 600;">${gameInfo}</span>
                  </td>
                </tr>
                ${ticketType ? `
                <tr>
                  <td>
                    <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Type</span><br>
                    <span style="color: #333333; font-size: 16px;">${ticketType}</span>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
        </table>

        ${reason ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border-radius: 8px; border: 1px solid #ffc107; margin-bottom: 24px;">
          <tr>
            <td style="padding: 16px 20px;">
              <span style="color: #856404; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Reason provided</span><br>
              <span style="color: #333333; font-size: 14px; font-style: italic;">"${reason}"</span>
            </td>
          </tr>
        </table>
        ` : ''}

        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
          Don't worry — your ticket is now available for new matches. Head back to the exchange to find another match!
        </p>

        <!-- CTA Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 8px 0 24px 0;">
              <a href="${defaultUrl}" style="display: inline-block; background: linear-gradient(135deg, #1a5f2a 0%, #166b2a 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(26, 95, 42, 0.3);">
                Find New Matches
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.6; text-align: center;">
          <span style="color: #c41e3a;">&#9829;</span> Lead with your heart.
        </p>
      </td>
    </tr>

    ${emailFooter()}
  `);

  const text = `Hello ${recipientFirstName || 'there'},

Exchange Cancelled

Unfortunately, your ticket exchange for ${gameInfo} has been cancelled by ${otherPartyName}.

${ticketType ? `Type: ${ticketType}` : ''}
${reason ? `Reason: "${reason}"` : ''}

Don't worry — your ticket is now available for new matches.

Find new matches: ${defaultUrl}

Lead with your heart.

--
Dirigo Union Ticket Exchange
Keeping tickets in the community, at reasonable prices.`;

  return {
    subject: `Exchange Cancelled - ${gameInfo}`,
    html,
    text
  };
};

/**
 * Exchange Completed
 */
export const exchangeCompletedTemplate = ({ recipientFirstName, otherPartyName, ticketType, gameInfo }) => {
  const html = wrapEmail(`
    ${emailHeader}

    <!-- Success Banner -->
    <tr>
      <td style="background-color: #d4edda; padding: 20px 40px; border-bottom: 3px solid #1a5f2a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="40" valign="top">
              <div style="width: 32px; height: 32px; background-color: #1a5f2a; border-radius: 50%; text-align: center; line-height: 32px;">
                <span style="color: #ffffff; font-size: 18px;">&#10003;</span>
              </div>
            </td>
            <td style="padding-left: 16px;">
              <h2 style="margin: 0 0 4px 0; color: #155724; font-size: 20px; font-weight: 600;">
                Exchange Completed!
              </h2>
              <p style="margin: 0; color: #155724; font-size: 14px;">
                Your ticket exchange has been successfully completed.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Content -->
    <tr>
      <td style="padding: 32px 40px;">
        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
          Hello ${recipientFirstName || 'there'},
        </p>

        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
          Great news! Your ticket exchange for <strong>${gameInfo}</strong> with <strong>${otherPartyName}</strong> has been marked as complete.
        </p>

        <!-- Exchange Details Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #1e3a5f; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Game</span><br>
                    <span style="color: #1e3a5f; font-size: 16px; font-weight: 600;">${gameInfo}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Exchange Type</span><br>
                    <span style="color: #333333; font-size: 16px;">${ticketType}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Exchanged With</span><br>
                    <span style="color: #333333; font-size: 16px;">${otherPartyName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 8px 0 24px 0;">
              <a href="${defaultUrl}" style="display: inline-block; background: linear-gradient(135deg, #1a5f2a 0%, #166b2a 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(26, 95, 42, 0.3);">
                View Exchange Details
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.6; text-align: center;">
          Thank you for using the DU Ticket Exchange!<br>
          <span style="color: #c41e3a;">&#9829;</span> Lead with your heart.
        </p>
      </td>
    </tr>

    ${emailFooter()}
  `);

  const text = `Hello ${recipientFirstName || 'there'},

Exchange Completed!

Great news! Your ticket exchange for ${gameInfo} with ${otherPartyName} has been marked as complete.

Game: ${gameInfo}
Exchange Type: ${ticketType}
Exchanged With: ${otherPartyName}

Thank you for using the DU Ticket Exchange!

View exchange details: ${defaultUrl}

Lead with your heart.

--
Dirigo Union Ticket Exchange
Keeping tickets in the community, at reasonable prices.`;

  return {
    subject: `Exchange Complete - ${gameInfo}`,
    html,
    text
  };
};

/**
 * Welcome Email - First Login
 */
export const welcomeTemplate = ({ firstName, username }) => {
  const html = wrapEmail(`
    ${emailHeader}

    <!-- Welcome Banner -->
    <tr>
      <td style="background-color: #e8f5e9; padding: 20px 40px; border-bottom: 3px solid #1a5f2a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="40" valign="top">
              <div style="width: 32px; height: 32px; background-color: #1a5f2a; border-radius: 50%; text-align: center; line-height: 32px;">
                <span style="color: #ffffff; font-size: 18px;">&#127881;</span>
              </div>
            </td>
            <td style="padding-left: 16px;">
              <h2 style="margin: 0 0 4px 0; color: #1a5f2a; font-size: 20px; font-weight: 600;">
                Welcome to the Dirigo Union Ticket Exchange!
              </h2>
              <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                You're now part of the Ticket Exchange community.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Content -->
    <tr>
      <td style="padding: 32px 40px;">
        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
          Hello ${firstName || username || 'there'},
        </p>

        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
          Welcome to the <strong>Dirigo Union Ticket Exchange</strong>! We're excited to have you join our community of Hearts of Pine supporters.
        </p>

        <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
          Please visit My Account and enter your Discord username to ease the ticket exchange process with other DU members.
        </p>

        <!-- What You Can Do Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #1a5f2a; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <h3 style="margin: 0 0 16px 0; color: #1a5f2a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                What You Can Do
              </h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #1a5f2a; font-size: 16px; font-weight: 600;">&#127915; Buy Tickets</span><br>
                    <span style="color: #6c757d; font-size: 14px;">Find tickets from fellow supporters at reasonable prices</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="color: #1a5f2a; font-size: 16px; font-weight: 600;">&#128181; Sell Tickets</span><br>
                    <span style="color: #6c757d; font-size: 14px;">List tickets you can't use and help another fan get to the match</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="color: #1a5f2a; font-size: 16px; font-weight: 600;">&#128260; Trade Tickets</span><br>
                    <span style="color: #6c757d; font-size: 14px;">Swap tickets for different games with other season ticket members</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="color: #1a5f2a; font-size: 16px; font-weight: 600;">&#x2764;&#xFE0F;&#x200D;&#x1F525; Donations</span><br>
                    <span style="color: #6c757d; font-size: 14px;">You may request or list a donation. Donation offers are not listed for browsing so if you need a donation, request it!</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- How It Works Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border-radius: 8px; border: 1px solid #ffc107; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <h3 style="margin: 0 0 12px 0; color: #856404; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                &#128161; How It Works
              </h3>
              <ol style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px; line-height: 1.8;">
                <li>Create a buy, sell, or trade request</li>
                <li>Browse listings and find a match</li>
                <li>Accept the exchange and coordinate with your counterparty</li>
                <li>Complete the exchange and enjoy the match!</li>
              </ol>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 8px 0 24px 0;">
              <a href="${defaultUrl}" style="display: inline-block; background: linear-gradient(135deg, #1a5f2a 0%, #166b2a 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(26, 95, 42, 0.3);">
                Get Started
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.6; text-align: center;">
          Questions? Reply to this email or reach out on Discord.<br>
          <span style="color: #c41e3a;">&#9829;</span> Lead with your heart.
        </p>
      </td>
    </tr>

    ${emailFooter(false)}
  `);

  const text = `Hello ${firstName || username || 'there'},

Welcome to the Dirigo Union Ticket Exchange!

We're excited to have you join our community of Hearts of Pine supporters.

WHAT YOU CAN DO:
- Buy Tickets: Find tickets from fellow supporters at reasonable prices
- Sell Tickets: List tickets you can't use and help another fan get to the match
- Trade Tickets: Swap tickets for different games with other season ticket members
- Donations: You may request or list a donation. Donation offers are not listed for browsing so if you need a donation, request it!

HOW IT WORKS:
1. Create a buy, sell, or trade request
2. Browse listings and find a match
3. Accept the exchange and coordinate with your counterparty
4. Complete the exchange and enjoy the match!

Get started: ${defaultUrl}

Questions? Reply to this email or reach out on Discord #ticket-exchange.

Lead with your heart.

--
Dirigo Union Ticket Exchange
Keeping tickets in the community, at reasonable prices.`;

  return {
    subject: `You're in the Dirigo Union Ticket Exchange!`,
    html,
    text
  };
};