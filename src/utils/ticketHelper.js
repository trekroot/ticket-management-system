export const addOwnerFlag = (ticket, userId) => {
  const ticketObject = ticket.toObject();
  const isOwner = getIsOwnerFromTicketUserId(ticketObject, userId);

  return {
    ...ticketObject,
    isOwner
  };
};

export const hidePrivateData = (ticket, userId) => {
  const ticketObject = ticket.toObject();
  const isOwner = getIsOwnerFromTicketUserId(ticketObject, userId);

  if (!isOwner) {
    // Trim lastName for privacy
    if (ticketObject.userSnapshot?.lastName) {
      ticketObject.userSnapshot.lastName = ticketObject.userSnapshot.lastName.charAt(0);
    }
    // Hide maxPrice from BuyRequests for non-owners
    if (ticketObject.__t === 'BuyRequest') {
      ticketObject.maxPrice = null;
    }
  }

  return {
    ...ticketObject,
    isOwner
  }
}

const getIsOwnerFromTicketUserId = (ticket, userId) => {
  if (!userId || !ticket.userId?._id) return false;
  return ticket.userId._id.toString() === userId.toString();
};

/**
 * Check if seats are adjacent
 * @param {Object} ticket - Ticket object with optional seats array
 * @returns {boolean} Whether the seats are adjacent (true if no seats or empty)
 */
export function seatsAreAdjacent(ticket) {
  // Handle null, undefined, or empty seats array
  if (!ticket.seats?.length) return true;

  const sorted = [...ticket.seats].sort((a, b) => a - b);
  return sorted[sorted.length - 1] - sorted[0] + 1 === ticket.seats.length;
}

/**
 * Get number of tickets from an offer (works for seats array or numTickets)
 */
export function getNumTickets(ticket) {
  if (ticket.seats?.length > 0) return ticket.seats.length;
  return ticket.numTickets || 1;
}
