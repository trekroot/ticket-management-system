/**
 * Email templates for match notifications
 */

const defaultUrl = 'https://www.dirigounion.com/ticket-exchange';

export const matchInitiatedTemplate = ({ initiatorName, ticketType, gameInfo, matchId }) => {
  const url = matchId ? `https://www.dirigounion.com/ticket-exchange?matchId=${matchId}` : defaultUrl;
  return {
    subject: `New Match Request - ${gameInfo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You Have a <a href=${url}>New Match Request</a></h2>
        <p><strong>${initiatorName}</strong> wants to match with your ticket.</p>
        <p><strong>Game:</strong> ${gameInfo}</p>
        <p><strong>Type:</strong> ${ticketType}</p>
        <p>Log in to Dirigo Union to review and accept or decline this match.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">Dirigo Union Ticket Exchange</p>
      </div>
    `
  }
};

export const matchAcceptedTemplate = ({ counterpartyName, counterpartyEmail, counterpartyDiscord, ticketType, gameInfo, matchId }) => {
  const url = matchId ? `https://www.dirigounion.com/ticket-exchange?matchId=${matchId}` : defaultUrl;
  return {
    subject: `Match Accepted - ${gameInfo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Match Has Been Accepted!</h2>
        <p>Great news! <a href=${url}>Your ticket match</a>< has been accepted./p>
        <p><strong>Game:</strong> ${gameInfo}</p>
        <p><strong>Type:</strong> ${ticketType}</p>
        <h3>Counterparty Contact Info</h3>
        <ul>
          <li><strong>Name:</strong> ${counterpartyName}</li>
          <li><strong>Email:</strong> ${counterpartyEmail}</li>
          ${counterpartyDiscord ? `<li><strong>Discord:</strong> ${counterpartyDiscord}</li>` : ''}
        </ul>
        <p>Please reach out to coordinate the exchange.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">Dirigo Union Ticket Exchange</p>
      </div>
    `
  }
};

export const matchCancelledTemplate = ({ otherPartyName, reason, gameInfo, matchId }) => {
  const url = matchId ? `https://www.dirigounion.com/ticket-exchange?matchId=${matchId}` : defaultUrl;
  return {
    subject: `Match Cancelled - ${gameInfo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Match Cancelled</h2>
        <p><a href=${url}>Your match</a> for <strong>${gameInfo}</strong> has been cancelled by <strong>${otherPartyName}</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Your ticket is now available for new matches.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">Dirigo Union Ticket Exchange</p>
      </div>
    `
  }
};

export const matchCompletedTemplate = ({ otherPartyName, ticketType, gameInfo, matchId }) => {
  const url = matchId ? `https://www.dirigounion.com/ticket-exchange?matchId=${matchId}` : defaultUrl;
  return {
    subject: `Exchange Complete - ${gameInfo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Exchange Completed!</h2>
        <p><a href=${url}>Your ticket exchange</a> for <strong>${gameInfo}</strong> with <strong>${otherPartyName}</strong> has been marked as complete.</p>
        <p><strong>Type:</strong> ${ticketType}</p>
        <p>Thank you for using Dirigo Union!</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">Dirigo Union Ticket Exchange</p>
      </div>
    `
  }
};
