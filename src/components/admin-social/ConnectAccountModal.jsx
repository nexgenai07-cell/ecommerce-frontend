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

  const connectMutation = useMutation({
    mutationFn: () =>
      connectSocialAccount({
        platform,
        account_name: accountName,
        access_token: accessToken,
        page_id: pageId,
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
    },
    onError: (error) =>
      showError(error?.response?.data?.message || "Failed to connect account."),
  });

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

        <Input
          label="Account Name"
          placeholder="Zyron Official Page"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
        />
        <Input
          label="Page / Account ID"
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
        />
        <Input
          label="Access Token"
          type="password"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
        />
        <Input
          label="Token Expiry"
          type="datetime-local"
          hint="Optional"
          value={tokenExpiry}
          onChange={(e) => setTokenExpiry(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => connectMutation.mutate()}
            isLoading={connectMutation.isPending}
            disabled={!accountName || !accessToken}
          >
            Connect
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConnectAccountModal;
