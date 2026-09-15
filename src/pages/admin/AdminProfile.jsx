// ADMIN PROFILE PAGE
// ============================================================
// Reuses the exact same GET /api/v1/auth/me/ (API 7) endpoint as the
// customer account profile page — role is simply a field on that
// response, there is no separate admin-only profile endpoint. The
// name/phone/avatar edit form (PersonalInfoForm) and the Change
// Email flow (ChangeEmailModal, opened from inside it) are the same
// shared components used on the customer side, so a fix to either
// one automatically applies here too.
//
// Reached via the "Profile" link in TopHeader's account dropdown

import { useQuery } from "@tanstack/react-query";
import { AiOutlineUser } from "react-icons/ai";
import { HiOutlineShieldCheck } from "react-icons/hi2";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { getMyProfile } from "../../api/auth.api";
import PageHeader from "../../components/shared/PageHeader";
import PersonalInfoForm from "../../components/profile-settings/PersonalInfoForm";
import Skeleton from "../../components/ui/Skeleton";

const AdminProfile = () => {
  // =============================================
  // MY PROFILE API — API 7 — GET /api/v1/auth/me/
  // =============================================
  const { data: profileData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.MY_PROFILE,
    queryFn: ({ signal }) => getMyProfile(signal),
    staleTime: 1000 * 60 * 5, // 5 minute cache — same as the customer profile page
  });

  const user = profileData?.data || null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={<AiOutlineUser />} title="My Profile" />

      {isLoading ? (
        <Skeleton className="w-full h-80 rounded-3xl" />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Role / account status strip — read-only context that isn't
              part of the editable form below (role can't be changed
              from this page, it's assigned on the backend) */}
          <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shrink-0">
              <HiOutlineShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Account Role
              </span>
              <span className="text-sm font-bold text-gray-900 capitalize">
                {user?.role || "Admin"}
              </span>
            </div>
            <span className="text-xs text-gray-300 mx-1">•</span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Member Since
              </span>
              <span className="text-sm font-medium text-gray-700">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>

          <PersonalInfoForm user={user} />
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
