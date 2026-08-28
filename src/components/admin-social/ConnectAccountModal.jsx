// ============================================================
// ConnectAccountModal — ACCOUNTS PAGE SUB-COMPONENT
// ============================================================
// A manual token-entry form — NOT an OAuth redirect flow. The API doc
// only documents ONE social-account endpoint (API 84), and its own
// comment says it's "Called AFTER an OAuth authorization flow
// completes" — meaning the actual OAuth handshake (redirecting to
// Facebook/TikTok, handling the callback, exchanging a code for a
// token) isn't something this API doc describes at all. Building a
// fake "Connect" button that pretends to launch OAuth would be
// non-functional theater; this instead honestly asks the admin to
// paste in the token values they already obtained from that
// platform's own developer console — which maps EXACTLY to API 84's
// real, documented request fields.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { connectSocialAccount } from "../../api/social.api";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { showSuccess, showError } from "../ui/Toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";

const ConnectAccountModal = ({ isOpen, onClose, platform, platformLabel }) => {
  const queryClient = useQueryClient();
  const [accountName, setAccountName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [tokenExpiry, setTokenExpiry] = useState("");
  // Same "onTouched"-style pattern as the rest of the project: a field's
  // error only shows once the admin has left it (blur) or tried to submit.
  const [touched, setTouched] = useState({
    accountName: false,
    pageId: false,
    accessToken: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const accountNameError = !accountName.trim()
    ? "Account name is required"
    : accountName.trim().length > 100
      ? "Account name is too long"
      : "";

  const pageIdError = !pageId.trim() ? "Page / Account ID is required" : "";

  const accessTokenError = !accessToken.trim()
    ? "Access token is required"
    : accessToken.trim().length < 10
      ? "That doesn't look like a valid access token"
      : "";

  // Token expiry is optional, but if the admin does set one, it should
  // be a real future date/time -- a past expiry would mean saving a
  // token that's already dead on arrival.
  const tokenExpiryError =
    tokenExpiry && new Date(tokenExpiry) <= new Date()
      ? "Expiry must be a future date/time"
      : "";

  const show = (field, error) => (touched[field] || submitAttempted) && error;

  const connectMutation = useMutation({
    mutationFn: () =>
      connectSocialAccount({
        platform,
        account_name: accountName.trim(),
        access_token: accessToken.trim(),
        page_id: pageId.trim(),
        token_expiry: tokenExpiry || undefined,
      }),
    onSuccess: () => {
      showSuccess(`${platformLabel} account connected.`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SOCIAL_ACCOUNTS });
      onClose();
      setAccountName("");
      setAccessToken("");
      setPageId("");
      setTokenExpiry("");
      setTouched({ accountName: false, pageId: false, accessToken: false });
      setSubmitAttempted(false);
    },
    onError: (error) =>
      showError(error?.response?.data?.message || "Failed to connect account."),
  });

  const handleConnect = () => {
    setSubmitAttempted(true);
    if (
      accountNameError ||
      pageIdError ||
      accessTokenError ||
      tokenExpiryError
    ) {
      return;
    }
    connectMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Connect ${platformLabel}`}
      size="sm"
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-gray-400">
          Generate an access token for this account from {platformLabel}'s own
          developer console, then paste the resulting values below.
        </p>

        <div className="flex flex-col gap-1">
          <Input
            label="Account Name"
            placeholder="Zyron Official Page"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, accountName: true }))}
            error={
              show("accountName", accountNameError)
                ? accountNameError
                : undefined
            }
          />
          {show("accountName", accountNameError) && (
            <p className="text-xs text-danger">{accountNameError}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Input
            label="Page / Account ID"
            placeholder="1234567890123456"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, pageId: true }))}
            error={show("pageId", pageIdError) ? pageIdError : undefined}
          />
          {show("pageId", pageIdError) && (
            <p className="text-xs text-danger">{pageIdError}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Input
            label="Access Token"
            type="password"
            placeholder="Paste the generated access token"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, accessToken: true }))}
            error={
              show("accessToken", accessTokenError)
                ? accessTokenError
                : undefined
            }
          />
          {show("accessToken", accessTokenError) && (
            <p className="text-xs text-danger">{accessTokenError}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Input
            label="Token Expiry"
            type="datetime-local"
            hint="Optional"
            value={tokenExpiry}
            onChange={(e) => setTokenExpiry(e.target.value)}
            error={tokenExpiryError || undefined}
          />
          {tokenExpiryError && (
            <p className="text-xs text-danger">{tokenExpiryError}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConnect}
            isLoading={connectMutation.isPending}
          >
            Connect
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConnectAccountModal;
