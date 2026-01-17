/**
 * Email templates for match notifications
 * TODO: MatchId passed in // might need to use ticketId for /matches/{ticketId} redirect
 */

const defaultUrl = 'https://www.dirigounion.com/ticket-exchange';

export const matchInitiatedTemplate = ({ recipientFirstName, initiatorName, ticketType, gameInfo, reason, matchId }) => {
  // const url = matchId ? `https://www.dirigounion.com/ticket-exchange?matchId=${matchId}` : defaultUrl;
  return {
    subject: `New Exchange Request - ${gameInfo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hello ${recipientFirstName || 'there'},</p>
        <h2>You Have a New Exchange Request on the <a href=${defaultUrl}>DU Ticket Exchange</a></h2>
        <p><strong>${initiatorName}</strong> wants to exchange with your ticket.</p>
        <p><strong>Game:</strong> ${gameInfo}</p>
        <p><strong>Type:</strong> ${ticketType}</p>
        ${reason ? `<p><strong>User Notes:</strong> ${reason}</p>` : ''}
        <p>Log in to Dirigo Union to review and accept or decline this exchange.</p>
        <p>Thank you for using the DU Ticket Exchange! <img src="https://www.ticketexchange.me/assets/du-tms-logo-CEbGGye5.png" alt="DU Ticket Exchange Logo" width="50" /></p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">Dirigo Union Ticket Exchange</p>
      </div>
    `
  }
};

export const matchAcceptedTemplate = ({ recipientFirstName, counterpartyName, counterpartyEmail, counterpartyDiscord, ticketType, gameInfo, matchId }) => {
  // const url = matchId ? `https://www.dirigounion.com/ticket-exchange?matchId=${matchId}` : defaultUrl;
  return {
    subject: `Exchange Accepted - ${gameInfo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hello ${recipientFirstName || 'there'},</p>
        <h2>Your Match Has Been Accepted!</h2>
        <p>Great news! Your ticket exchange has been accepted. Visit the <a href="${defaultUrl}">DU Ticket Exchange</a> to follow up.</p>
        <p><strong>Game:</strong> ${gameInfo}</p>
        <p><strong>Type:</strong> ${ticketType}</p>
        <h3>Counterparty Contact Info</h3>
        <ul>
          <li><strong>Name:</strong> ${counterpartyName}</li>
          <li><strong>Email:</strong> ${counterpartyEmail}</li>
          ${counterpartyDiscord ? `<li><strong>Discord:</strong> ${counterpartyDiscord}</li>` : ''}
        </ul>
        <p>Please reach out to coordinate the exchange.</p>
        <p>Thank you for using the DU Ticket Exchange! <img src="https://www.ticketexchange.me/assets/du-tms-logo-CEbGGye5.png" alt="DU Ticket Exchange Logo" width="50" /></p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">Dirigo Union Ticket Exchange</p>
      </div>
    `
  }
};

export const matchCancelledTemplate = ({ recipientFirstName, otherPartyName, reason, gameInfo, matchId }) => {
  // const url = matchId ? `https://www.dirigounion.com/ticket-exchange?matchId=${matchId}` : defaultUrl;
  return {
    subject: `Exchange Cancelled - ${gameInfo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hello ${recipientFirstName || 'there'},</p>
        <h2>Exchange Cancelled</h2>
        <p>Your exchange for <strong>${gameInfo}</strong> has been cancelled by <strong>${otherPartyName}</strong>. Visit the <a href="${defaultUrl}">DU Ticket Exchange</a> to find a new match.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Your ticket is now available for new matches.</p>
        <p>Thank you for using the DU Ticket Exchange! <img src="https://www.ticketexchange.me/assets/du-tms-logo-CEbGGye5.png" alt="DU Ticket Exchange Logo" width="50" /></p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">Dirigo Union Ticket Exchange</p>
      </div>
    `
  }
};

export const exchangeCompletedTemplate = ({ recipientFirstName, otherPartyName, ticketType, gameInfo, matchId }) => {
  // const url = matchId ? `https://www.dirigounion.com/ticket-exchange?matchId=${matchId}` : defaultUrl;
  return {
    subject: `Exchange Complete - ${gameInfo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hello ${recipientFirstName || 'there'},</p>
        <h2>Exchange Completed!</h2>
        <p>Your ticket exchange for <strong>${gameInfo}</strong> with <strong>${otherPartyName}</strong> has been marked as complete. Visit the <a href="${defaultUrl}">DU Ticket Exchange</a> to review details.</p>
        <p><strong>Type:</strong> ${ticketType}</p>
        <p>Thank you for using the DU Ticket Exchange! <img src="https://www.ticketexchange.me/assets/du-tms-logo-CEbGGye5.png" alt="DU Ticket Exchange Logo" width="50" /></p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">Dirigo Union Ticket Exchange</p>
      </div>
    `
  }
};
