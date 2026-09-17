import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { HiOutlineShieldCheck } from "react-icons/hi2";
import { MdVerified } from "react-icons/md";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { getMyProfile } from "../../api/auth.api";
import calculateProfileCompletion from "../../utils/calculateProfileCompletion";
import Container from "../../components/layouts/Container";
import PersonalInfoForm from "../../components/profile-settings/PersonalInfoForm";
import ChangePasswordForm from "../../components/profile-settings/ChangePasswordForm";
import AccountSecurity from "../../components/profile-settings/AccountSecurity";
import DangerZone from "../../components/profile-settings/DangerZone";
import Avatar from "../../components/ui/Avatar";
// SkeletonProfileSettings mirrors this page's actual layout (gradient hero
// header with avatar, Personal Information card, the Change Password /
// Account Security 2-column row, and the Danger Zone card) rather than the
// unrelated generic detail-page skeleton, so the page no longer jumps in
// height once the real profile data arrives.
import { SkeletonProfileSettings } from "../../components/ui/Skeleton";

const ProfileSettings = () => {
  // =============================================
  // MY PROFILE API — API 7 — GET /api/v1/auth/me/
  // =============================================
  const { data: profileData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.MY_PROFILE,
    queryFn: ({ signal }) => getMyProfile(signal),
    staleTime: 1000 * 60 * 5, // 5 minute cache
  });

  const user = profileData?.data || null;

  // Same completion check the account sidebar uses for its "Verified
  // Profile" badge — kept in one shared utility so this page's badge
  // always matches the sidebar's.
  const profileCompletion = calculateProfileCompletion(user);

  if (isLoading) {
    return (
      <Container className="py-8">
        <SkeletonProfileSettings />
      </Container>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Container className="py-6 sm:py-8">
        <div className="flex flex-col gap-6 sm:gap-8">
          {/* Hero header */}
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-primary to-primary-dark px-6 py-8 sm:px-10 sm:py-10 shadow-lg shadow-primary/20">
            <div className="absolute -top-16 -left-10 w-52 h-52 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-10 w-64 h-64 bg-primary-light/30 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Plain green ring border directly on the photo circle,
                  with a small white gap (ring-offset) so it reads clearly
                  even sitting on the green hero background. */}
              <Avatar
                src={user?.profile_picture}
                name={user?.name}
                size="xl"
                className="ring-4 ring-primary ring-offset-2 ring-offset-white"
              />
              <div className="flex flex-col gap-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                  {user?.name || "Your Account"}
                </h1>
                <p className="text-sm text-white/70 truncate">{user?.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 text-white/80">
                    <HiOutlineShieldCheck className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium">
                      Account Settings
                    </span>
                  </div>
                  {/* Verified badge — shown once the profile is fully
                      complete, matching the one in the account sidebar */}
                  {profileCompletion === 100 && (
                    <div className="inline-flex w-fit items-center gap-1 px-2.5 py-1 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm">
                      <MdVerified className="w-3.5 h-3.5 shrink-0 text-white" />
                      <span className="text-xs font-bold tracking-wide text-white truncate">
                        Verified Profile
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <PersonalInfoForm user={user} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <ChangePasswordForm />
            {/* Passing user so AccountSecurity can read two_factor_enabled (see note in that file) */}
            <AccountSecurity user={user} />
          </div>

          <DangerZone />
        </div>
      </Container>
    </motion.div>
  );
};

export default ProfileSettings;
