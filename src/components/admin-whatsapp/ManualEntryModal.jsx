// ============================================================
// ManualEntryModal — NUMBERS MANAGEMENT SUB-COMPONENT
// ============================================================
// The design's "+ Manual Entry" button implied manually adding a new
// WhatsApp number to the system — but there's no "create a WhatsApp
// contact" endpoint anywhere in the API (numbers only ever appear
// after they've messaged the bot, via the Meta webhook). The closest
// REAL equivalent is sending that number a first message via API 92
// (Send WhatsApp Message) — which is exactly what this modal does.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sendWhatsAppMessage } from "../../api/whatsapp.api";
import { showSuccess, showError } from "../ui/Toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";

const ManualEntryModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  // Track which fields the user has already interacted with, so errors
  // only appear after a field has been touched once (blur) or after a
  // submit attempt -- not while the user is still typing into it for
  // the first time. Same "onTouched"-style pattern used across the
  // rest of the project's react-hook-form schemas.
  const [touched, setTouched] = useState({
    phoneNumber: false,
    message: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const phoneError = !phoneNumber.trim()
    ? "Phone number is required"
    : !/^\+?[0-9]{10,15}$/.test(phoneNumber.trim())
      ? "Enter a valid phone number (10–15 digits)"
      : "";

  const messageError = !message.trim()
    ? "Message is required"
    : message.trim().length > 1000
      ? "Message is too long (max 1000 characters)"
      : "";

  const showPhoneError = (touched.phoneNumber || submitAttempted) && phoneError;
  const showMessageError = (touched.message || submitAttempted) && messageError;

  const sendMutation = useMutation({
    mutationFn: () =>
      sendWhatsAppMessage({
        phone_number: phoneNumber.trim(),
        message: message.trim(),
      }),
    onSuccess: () => {
      showSuccess("Message sent.");
      queryClient.invalidateQueries({ queryKey: ["whatsappNumbers"] });
      setPhoneNumber("");
      setMessage("");
      setTouched({ phoneNumber: false, message: false });
      setSubmitAttempted(false);
      onClose();
    },
    onError: () => showError("Failed to send message."),
  });

  const handleSend = () => {
    setSubmitAttempted(true);
    if (phoneError || messageError) return;
    sendMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send New Message" size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-gray-400">
          There's no way to add a number without messaging it — sending a
          message here is what makes it show up in the numbers list below.
        </p>
        <div className="flex flex-col gap-1">
          <Input
            label="Phone Number"
            placeholder="+1 555 012 3456"
            value={phoneNumber}
            onChange={(e) => {
              // Only digits and a leading "+" can ever land in the field
              const cleaned = e.target.value
                .replace(/[^\d+]/g, "")
                .replace(/(?!^)\+/g, "");
              setPhoneNumber(cleaned);
            }}
            onBlur={() => setTouched((t) => ({ ...t, phoneNumber: true }))}
            error={showPhoneError ? phoneError : undefined}
          />
          {showPhoneError && (
            <p className="text-xs text-danger">{phoneError}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Textarea
            label="Message"
            rows={4}
            placeholder="Type the message you want to send..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, message: true }))}
            error={showMessageError ? messageError : undefined}
          />
          {showMessageError && (
            <p className="text-xs text-danger">{messageError}</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            isLoading={sendMutation.isPending}
          >
            Send
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ManualEntryModal;
