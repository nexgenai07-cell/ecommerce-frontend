// ============================================================
// calculateProfileCompletion - UTILITY FUNCTION
// ============================================================
// Works out what percentage of the key profile fields (name, email,
// phone) a user has filled in. Both CustomerAccountSidebar (for the
// "Verified Profile" badge next to the avatar) and ProfileSettings
// (for the matching badge on the main profile page) call this same
// function, so the two badges can never disagree with each other.

const calculateProfileCompletion = (profile) => {
  // --------------------------------------------------
  // GUARD CLAUSE (Safety Check)
  // --------------------------------------------------
  // If the profile hasn't loaded yet, treat it as 0% complete rather
  // than throwing on undefined field access.
  if (!profile) return 0;

  const fields = [profile.name, profile.email, profile.phone];
  const filledFields = fields.filter(Boolean).length;

  return Math.round((filledFields / fields.length) * 100);
};

export default calculateProfileCompletion;
