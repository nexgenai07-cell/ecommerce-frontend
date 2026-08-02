const groupChatSessionsByDate = (sessions = []) => {
  // Single bucket instead of four. Every session — regardless of its
  // updatedAt date — goes straight into "Recents".
  return {
    Recents: [...sessions],
  };
};

export default groupChatSessionsByDate;
