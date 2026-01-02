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
 * @param {Array} formData.seats - The array of seat numbers
 * @returns {boolean} Whether the seats are adjacent
 */
export function seatsAreAdjacent(ticket) {
  if (ticket.seats?.length < 1) return true;
  return (() => {
      const sorted = [...ticket.seats].sort((a, b) => a - b);
      return sorted[sorted.length - 1] - sorted[0] + 1 === ticket.seats.length;
    })()
}

/**
 * Get number of tickets from an offer (works for seats array or numTickets)
 */
export function getNumTickets(ticket) {
  if (ticket.seats?.length > 0) return ticket.seats.length;
  return ticket.numTickets || 1;
}
