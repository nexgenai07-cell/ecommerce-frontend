import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { HiOutlineShieldCheck } from "react-icons/hi2";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { getMyProfile } from "../../api/auth.api";
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
    queryFn: getMyProfile,
    staleTime: 1000 * 60 * 5, // 5 minute cache
  });

  const user = profileData?.data || null;

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
              <div className="p-1 rounded-full bg-white/20 backdrop-blur-sm shrink-0 w-fit">
                <Avatar
                  src={user?.avatar}
                  name={user?.name}
                  size="xl"
                  className="ring-2 ring-white/30"
                />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                  {user?.name || "Your Account"}
                </h1>
                <p className="text-sm text-white/70 truncate">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-1 text-white/80">
                  <HiOutlineShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">Account Settings</span>
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
