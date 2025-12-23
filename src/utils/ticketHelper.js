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
