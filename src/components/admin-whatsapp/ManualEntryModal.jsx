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

  const sendMutation = useMutation({
    mutationFn: () =>
      sendWhatsAppMessage({ phone_number: phoneNumber, message }),
    onSuccess: () => {
      showSuccess("Message sent.");
      queryClient.invalidateQueries({ queryKey: ["whatsappNumbers"] });
      setPhoneNumber("");
      setMessage("");
      onClose();
    },
    onError: () => showError("Failed to send message."),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send New Message" size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-gray-400">
          There's no way to add a number without messaging it — sending a
          message here is what makes it show up in the numbers list below.
        </p>
        <Input
          label="Phone Number"
          placeholder="+1 555 012 3456"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <Textarea
          label="Message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => sendMutation.mutate()}
            isLoading={sendMutation.isPending}
            disabled={!phoneNumber || !message}
          >
            Send
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ManualEntryModal;
