import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BsFacebook, BsInstagram, BsTwitterX, BsTiktok } from "react-icons/bs";
import { AiOutlineCheckCircle } from "react-icons/ai";

import { getSocialAccounts } from "../../api/social.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import extractListData from "../../utils/extractListData";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import ConnectAccountModal from "../../components/admin-social/ConnectAccountModal";

const ALL_PLATFORMS = [
  { key: "facebook", label: "Facebook", icon: BsFacebook },
  { key: "instagram", label: "Instagram", icon: BsInstagram },
  { key: "twitter", label: "Twitter / X", icon: BsTwitterX },
  { key: "tiktok", label: "TikTok", icon: BsTiktok },
];

const Accounts = () => {
  const [connectTarget, setConnectTarget] = useState(null);
  // The platform currently being connected via the modal, or null

  const { data: response, isLoading } = useQuery({
    queryKey: QUERY_KEYS.SOCIAL_ACCOUNTS,
    queryFn: ({ signal }) => getSocialAccounts(signal),
  });

  const connectedAccounts = extractListData(response);
  const connectedPlatformKeys = new Set(
    connectedAccounts.map((account) => account.platform?.toLowerCase()),
  );

  const connected = ALL_PLATFORMS.filter((p) =>
    connectedPlatformKeys.has(p.key),
  );
  const notConnected = ALL_PLATFORMS.filter(
    (p) => !connectedPlatformKeys.has(p.key),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Connected Accounts</h1>
        <p className="text-sm text-gray-500">
          Connect your social media accounts to publish posts from Zyron.
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Connected accounts */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Connected{" "}
              <span className="text-gray-400">({connected.length})</span>
            </h2>

            {connected.length === 0 ? (
              <p className="text-sm text-gray-400">
                No accounts connected yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {connected.map((platform) => {
                  const account = connectedAccounts.find(
                    (a) => a.platform?.toLowerCase() === platform.key,
                  );
                  const Icon = platform.icon;
                  return (
                    <div
                      key={platform.key}
                      className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-lg bg-gray-50 text-gray-700 flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {account?.account_name || platform.label}
                            </p>
                            <p className="text-xs text-gray-400">
                              ID: {account?.page_id || "—"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          label="Connected"
                          variant="success"
                          size="sm"
                          rounded
                        />
                      </div>
                      {/* Note: "Last synced", "Permissions Granted", and
                          "Refresh Token"/"Disconnect" buttons from the
                          design are NOT included — none of that data or
                          those actions exist anywhere in the documented
                          API (see the flags shared before this code). */}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Connect new account */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Connect New Account{" "}
              <span className="text-gray-400">
                ({notConnected.length} available)
              </span>
            </h2>

            {notConnected.length === 0 ? (
              <p className="text-sm text-gray-400">
                All platforms are connected.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {notConnected.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <div
                      key={platform.key}
                      className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-gray-50 text-gray-700 flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </span>
                        <p className="text-sm font-medium text-gray-900">
                          {platform.label}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setConnectTarget(platform)}
                      >
                        Connect
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Decorative tip banner — static marketing copy, no backend
              data implied, harmless to keep as page decoration */}
          <div className="bg-[#0d1b2a] rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <AiOutlineCheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">
                  Optimize Your Reach with Cross-Posting
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-md">
                  Select multiple platforms when creating a post to publish the
                  same content everywhere at once.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {connectTarget && (
        <ConnectAccountModal
          isOpen={!!connectTarget}
          onClose={() => setConnectTarget(null)}
          platform={connectTarget.key}
          platformLabel={connectTarget.label}
        />
      )}
    </div>
  );
};

export default Accounts;
