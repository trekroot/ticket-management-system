export const addOwnerFlag = (ticket, userId) => ({
  ...ticket.toObject(),
  isOwner: userId && ticket.userId?._id
    ? ticket.userId._id.equals(userId)
    : false
});