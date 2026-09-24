import { useQuery } from "@tanstack/react-query";
import { AiOutlineUser } from "react-icons/ai";
import {
  HiOutlineShieldCheck,
  HiOutlineCalendarDays,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiCheckBadge,
} from "react-icons/hi2";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { getMyProfile } from "../../api/auth.api";
import PageHeader from "../../components/shared/PageHeader";
import PersonalInfoForm from "../../components/profile-settings/PersonalInfoForm";
import Avatar from "../../components/ui/Avatar";
import Skeleton from "../../components/ui/Skeleton";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const InfoTile = ({ icon, label, value, tone = "primary" }) => {
  const tones = {
    primary: "bg-primary-50 text-primary",
    success: "bg-success-light text-success",
    warning: "bg-warning-light text-warning",
    info: "bg-info-light text-info",
  };

  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3.5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}
      >
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-sm font-bold text-gray-900 truncate capitalize">
          {value}
        </span>
      </div>
    </div>
  );
};

const VerifiedBadge = ({ verified, label }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
      verified
        ? "bg-success-light text-success"
        : "bg-warning-light text-warning"
    }`}
  >
    <HiCheckBadge className="w-3.5 h-3.5" />
    {label} {verified ? "verified" : "not verified"}
  </span>
);

const ProfileSkeleton = () => (
  <div className="flex flex-col gap-6">
    <Skeleton className="w-full h-64 rounded-3xl" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="w-full h-18 rounded-2xl" />
      ))}
    </div>
    <Skeleton className="w-full h-80 rounded-3xl" />
  </div>
);

const AdminProfile = () => {
  const { data: profileData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.MY_PROFILE,
    queryFn: ({ signal }) => getMyProfile(signal),
    staleTime: 1000 * 60 * 5,
  });

  const user = profileData?.data || null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={<AiOutlineUser />} title="My Profile" />

      {isLoading ? (
        <ProfileSkeleton />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="relative h-28 sm:h-36 bg-linear-to-br from-primary via-primary to-primary-dark overflow-hidden">
              <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10" />
              <div className="absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-white/10" />
              <div className="absolute top-6 left-8 w-16 h-16 rounded-full bg-white/10" />
            </div>

            <div className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 -mt-12 sm:-mt-14">
                <Avatar
                  src={user?.profile_picture}
                  name={user?.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 text-3xl sm:text-4xl ring-4 ring-white shadow-lg mx-auto sm:mx-0"
                />

                <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start gap-1.5 sm:pb-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate max-w-full">
                      {user?.name || "Admin"}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary text-xs font-bold capitalize">
                      <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                      {user?.role || "Admin"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate max-w-full">
                    {user?.email || "—"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-5">
                <VerifiedBadge
                  verified={!!user?.email_verified}
                  label="Email"
                />
                <VerifiedBadge
                  verified={!!user?.phone_verified}
                  label="Phone"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoTile
              icon={<HiOutlineShieldCheck className="w-5 h-5" />}
              label="Account Role"
              value={user?.role || "Admin"}
            />
            <InfoTile
              icon={<HiOutlineCalendarDays className="w-5 h-5" />}
              label="Member Since"
              value={formatDate(user?.created_at)}
              tone="info"
            />
            <InfoTile
              icon={<HiOutlineEnvelope className="w-5 h-5" />}
              label="Email"
              value={user?.email || "—"}
              tone={user?.email_verified ? "success" : "warning"}
            />
            <InfoTile
              icon={<HiOutlinePhone className="w-5 h-5" />}
              label="Phone"
              value={user?.phone || "—"}
              tone={user?.phone_verified ? "success" : "warning"}
            />
          </div>

          <PersonalInfoForm user={user} />
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
