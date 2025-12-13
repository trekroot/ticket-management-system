export const addOwnerFlag = (ticket, userId) => {
  const ticketObject = ticket.toObject();
  const isOwner = getIsOwnerFromTicketUserId(ticketObject, userId);

  return {
    ...ticketObject,
    isOwner
  };
};

export const addOwnerFlagTrimLastName = (ticket, userId) => {
  const ticketObject = ticket.toObject();
  const isOwner = getIsOwnerFromTicketUserId(ticketObject, userId);

  if (!isOwner && ticketObject.userSnapshot?.lastName) {
    ticketObject.userSnapshot.lastName = ticketObject.userSnapshot.lastName.charAt(0);
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
