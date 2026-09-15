import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AiOutlineSend } from "react-icons/ai";

import { sendNotification } from "../../api/notifications.api";
import { getCustomers } from "../../api/customers.api";
import extractListData from "../../utils/extractListData";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Input from "../../components/ui/Input";
import Textarea from "../../components/ui/Textarea";
import Select from "../../components/ui/Select";
import Toggle from "../../components/ui/Toggle";
import Button from "../../components/ui/Button";
import Avatar from "../../components/ui/Avatar";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already
// used on every other admin screen, replacing this page's own plain
// <h1> so it finally matches the rest of the panel. This page composes
// a single notification rather than listing records, so — unlike
// every other page updated in this pass — it has no table, and
// therefore no shared list-toolbar to adopt.

// Real, confirmed enum — matches the type values TopHeader's
// notification bell already uses to route items into tabs
const TYPE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "order", label: "Order" },
  { value: "promotion", label: "Promotion" },
];

// CONFIRMED — these 4 are the complete, accepted list of `sent_via`
// values for API 78 (Send Notification): "web", "email", "whatsapp",
// and "in_app". Sending any other value is rejected with a 400 that
// lists these exact accepted values.
const CHANNEL_OPTIONS = [
  { value: "in_app", label: "In-App" },
  { value: "web", label: "Web" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

const NotificationTemplates = () => {
  const [isBroadcast, setIsBroadcast] = useState(true);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("system");
  const [sentVia, setSentVia] = useState("in_app");
  // Same "onTouched"-style pattern as the rest of the project: a field's
  // error only shows once the admin has left it (blur) or tried to send.
  const [touched, setTouched] = useState({ title: false, message: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const debouncedSearch = useDebounce(customerSearch, 400);

  const { data: customersResponse } = useQuery({
    queryKey: ["notificationCompose", "customerSearch", debouncedSearch],
    queryFn: ({ signal }) => getCustomers({ search: debouncedSearch }, signal),
    enabled: !isBroadcast && debouncedSearch.length > 0,
  });
  const customerResults = extractListData(customersResponse);

  const sendMutation = useMutation({
    mutationFn: () =>
      sendNotification({
        user: isBroadcast ? null : selectedCustomer?.user,
        // "user" is the account id this notification targets — null
        // means broadcast to everyone, per API 74's documented behavior
        title,
        message,
        type,
        sent_via: sentVia,
      }),
    onSuccess: () => {
      showSuccess(
        isBroadcast
          ? "Notification broadcast to all users."
          : `Notification sent to ${selectedCustomer?.name}.`,
      );
      setTitle("");
      setMessage("");
      setSelectedCustomer(null);
      // Clearing the fields makes titleError/messageError true again
      // (empty value fails the "required" check), so submitAttempted
      // and touched must also reset here — otherwise the now-empty
      // form still renders "Title is required" / "Message is required"
      // right after a successful send.
      setSubmitAttempted(false);
      setTouched({ title: false, message: false });
    },
    onError: (error) =>
      // API 78's error responses are returned under an "error" key
      // (e.g. { "error": "title and message are required." }), not
      // "message" — reading the wrong key here would always fall
      // back to the generic text below instead of showing the real,
      // specific reason the request was rejected.
      showError(error?.response?.data?.error || "Failed to send notification."),
  });

  const canSend =
    title.trim() && message.trim() && (isBroadcast || selectedCustomer);

  const titleError = !title.trim()
    ? "Title is required"
    : title.trim().length > 100
      ? "Title is too long (max 100 characters)"
      : "";

  const messageError = !message.trim()
    ? "Message is required"
    : message.trim().length > 500
      ? "Message is too long (max 500 characters)"
      : "";

  const showTitleError = (touched.title || submitAttempted) && titleError;
  const showMessageError = (touched.message || submitAttempted) && messageError;

  // Customer selection is only required when NOT broadcasting. Without
  // this, turning the toggle off and typing (but not clicking) a
  // search result left `selectedCustomer` null, `canSend` false, and
  // handleSend silently returned — no request, no error, nothing.
  const customerError =
    !isBroadcast && !selectedCustomer
      ? "Please select a customer from the search results"
      : "";
  const showCustomerError = submitAttempted && customerError;

  const handleSend = () => {
    setSubmitAttempted(true);
    if (titleError || messageError || customerError) return;

    // A selected customer with no linked user id would otherwise send
    // `user: null` to API 78, which the backend treats as a broadcast —
    // silently notifying everyone instead of the intended person.
    if (!isBroadcast && !selectedCustomer?.user) {
      showError("This customer has no linked user account.");
      return;
    }

    sendMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={<AiOutlineSend />} title="Send Notification" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
          {/* Target */}
          <div className="flex flex-col gap-2">
            <Toggle
              label="Broadcast to all users"
              hint={
                isBroadcast ? undefined : "Off — pick a specific customer below"
              }
              checked={isBroadcast}
              onChange={(e) => {
                setIsBroadcast(e.target.checked);
                setSelectedCustomer(null);
              }}
            />

            {!isBroadcast && (
              <>
                {selectedCustomer ? (
                  <div className="flex items-center gap-3 p-2 border border-primary rounded-lg bg-primary-50">
                    <Avatar name={selectedCustomer.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedCustomer.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {selectedCustomer.email}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="text-xs text-gray-400 hover:text-danger shrink-0"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Search customer by name or email..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                    {customerResults.length > 0 && (
                      <div className="border border-gray-100 rounded-lg max-h-40 overflow-y-auto">
                        {customerResults.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setCustomerSearch("");
                            }}
                            className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 text-left"
                          >
                            <Avatar name={customer.name} size="sm" />
                            <span className="text-sm text-gray-700 truncate">
                              {customer.name} — {customer.email}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {showCustomerError && (
              <p className="text-xs text-danger">{customerError}</p>
            )}
          </div>

          {/* Input already renders the error prop as red text below the
              field (see Input.jsx) — a second <p> here was duplicating
              the same message a second time under the field. */}
          <Input
            label="Title"
            placeholder="Your order has shipped!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, title: true }))}
            error={showTitleError ? titleError : undefined}
          />

          {/* Same duplication removed here — Textarea already renders
              its own error text below the field (see Textarea.jsx). */}
          <Textarea
            label="Message"
            placeholder="Write the notification content..."
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, message: true }))}
            error={showMessageError ? messageError : undefined}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
            <Select
              label="Channel"
              options={CHANNEL_OPTIONS}
              value={sentVia}
              onChange={(e) => setSentVia(e.target.value)}
            />
          </div>

          <Button
            variant="primary"
            leftIcon={<AiOutlineSend className="w-4 h-4" />}
            onClick={handleSend}
            disabled={!canSend}
            isLoading={sendMutation.isPending}
            className="self-end"
          >
            {isBroadcast ? "Broadcast to Everyone" : "Send Notification"}
          </Button>
        </div>

        {/* Live preview — purely visual, reflects what's already typed */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Preview</h2>
          <div className="border border-gray-200 rounded-xl p-4 flex gap-3 bg-gray-50">
            <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
              Z
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                {title || "Notification title"}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {message || "Your message will appear here..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationTemplates;
