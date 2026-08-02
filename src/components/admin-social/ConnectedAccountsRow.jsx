// ============================================================
// ConnectedAccountsRow — SOCIAL DASHBOARD SUB-COMPONENT
// ============================================================
// Real data from API 85 (List Connected Accounts). Platforms NOT
// present in that real response show a "Connect" button — clicking it
// navigates to the dedicated Accounts.jsx page (a later page in the
// roadmap) rather than attempting an OAuth flow inline here. API 84
// (Connect Social Account) expects an access_token/page_id that only
// a real OAuth redirect can produce — that flow belongs on its own
// page, not embedded in a dashboard widget.

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BsFacebook, BsInstagram, BsTwitterX, BsTiktok } from "react-icons/bs";
import { AiOutlineCheckCircle } from "react-icons/ai";

import { getSocialAccounts } from "../../api/social.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { ROUTES } from "../../constants/routes";
import extractListData from "../../utils/extractListData";
import Button from "../ui/Button";

const PLATFORMS = [
  { key: "facebook", label: "Facebook", icon: BsFacebook },
  { key: "instagram", label: "Instagram", icon: BsInstagram },
  { key: "twitter", label: "Twitter / X", icon: BsTwitterX },
  { key: "tiktok", label: "TikTok", icon: BsTiktok },
];

const ConnectedAccountsRow = () => {
  const navigate = useNavigate();

  const { data: response, isLoading } = useQuery({
    queryKey: QUERY_KEYS.SOCIAL_ACCOUNTS,
    queryFn: getSocialAccounts,
    staleTime: 1000 * 60 * 5,
  });

  const connectedAccounts = extractListData(response);
  // Builds a quick lookup — "is this platform's key present anywhere
  // in the real connected accounts list?"
  const connectedPlatforms = new Set(
    connectedAccounts.map((account) => account.platform?.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
        Connected Accounts
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const isConnected = connectedPlatforms.has(platform.key);

          return (
            <div
              key={platform.key}
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-gray-50 text-gray-700 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {platform.label}
                  </p>
                  {!isLoading && (
                    <p
                      className={`text-xs flex items-center gap-1 ${
                        isConnected ? "text-success" : "text-gray-400"
                      }`}
                    >
                      {isConnected && (
                        <AiOutlineCheckCircle className="w-3 h-3" />
                      )}
                      {isConnected ? "Connected" : "Not connected"}
                    </p>
                  )}
                </div>
              </div>

              {!isConnected && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(ROUTES.ADMIN_SOCIAL_ACCOUNTS)}
                >
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConnectedAccountsRow;
