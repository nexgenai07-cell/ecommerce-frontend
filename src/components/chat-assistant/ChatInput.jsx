import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AiOutlineSend,
  AiOutlinePaperClip,
  AiOutlineClose,
  AiOutlineLock,
} from "react-icons/ai";
import { BsMicFill, BsMicMuteFill } from "react-icons/bs";

import { uploadChatFile } from "../../api/chat.api";
import { showError } from "../ui/Toast";
import cn from "../../utils/cn";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB — mirrors the backend's own upload limit
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"]; // mirrors the backend's allowed types

const ChatInput = ({
  onSend,
  connectionStatus,
  isTyping = false, // NEW: true while the assistant is still responding to the previous message
  placeholder = "Type a message...",
}) => {
  const [text, setText] = useState(""); // the text currently typed into the input
  const [attachment, setAttachment] = useState(null); // { file_id, url, previewUrl } once uploaded
  const [isListening, setIsListening] = useState(false); // whether voice input is actively recording

  const fileInputRef = useRef(null); // used to programmatically open the hidden native file picker
  const recognitionRef = useRef(null); // holds the browser SpeechRecognition instance across renders

  // The widget is only usable when the WebSocket is fully connected —
  // "connecting"/"reconnecting"/"disconnected"/"expired"/"unauthorized"
  // all disable sending, matching the "reconnecting" locked-input state
  // shown in the approved UI designs.
  const isDisabled = connectionStatus !== "connected";

  // NEW: while the assistant is still replying to the previous message,
  // the user can keep typing freely, but they can't SEND another message
  // yet — this only blocks the send action (button + Enter key), it does
  // NOT disable/lock the text field itself.
  const isSendBlocked = isDisabled || isTyping;

  // --------------------------------------------------
  // File upload mutation — runs uploadChatFile() and stores the
  // returned file_id/url as the pending attachment once it succeeds.
  // --------------------------------------------------
  const uploadMutation = useMutation({
    mutationFn: uploadChatFile,
    onSuccess: (response, file) => {
      setAttachment({
        file_id: response.data.file_id,
        url: response.data.url,
        previewUrl: URL.createObjectURL(file), // instant local preview, doesn't wait on the network
      });
    },
    onError: (error) => {
      // Surfaces the backend's specific validation message (e.g. file
      // too large / wrong type) if available, otherwise a generic one.
      showError(
        error?.response?.data?.error ||
          "Couldn't attach that file. Please try another one.",
      );
    },
  });

  // --------------------------------------------------
  // FUNCTION: handleFileChange
  // --------------------------------------------------
  // Runs the SAME size/type checks the backend enforces, client-side
  // first, so the user gets instant feedback instead of waiting on a
  // round-trip just to learn the file was rejected.
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // reset so selecting the same file again still fires this handler
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      showError("Please attach a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showError(
        "That image is larger than 5 MB. Please choose a smaller file.",
      );
      return;
    }

    uploadMutation.mutate(file);
  };

  // --------------------------------------------------
  // FUNCTION: handleRemoveAttachment
  // --------------------------------------------------
  // Clears a pending attachment before the message is sent (e.g. the
  // user attached the wrong image and wants to remove it).
  const handleRemoveAttachment = () => {
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl); // frees the browser memory used for the local preview
    }
    setAttachment(null);
  };

  // --------------------------------------------------
  // FUNCTION: handleSend
  // --------------------------------------------------
  // Sends the typed text (and attachment, if any) up to the parent via
  // onSend(), then clears the composer for the next message.
  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isSendBlocked) return; // nothing to send, socket isn't ready, or still awaiting the previous response

    onSend(trimmed, attachment ? { file_id: attachment.file_id } : null);

    setText("");
    handleRemoveAttachment();
  };

  // --------------------------------------------------
  // FUNCTION: handleKeyDown
  // --------------------------------------------------
  // Enter sends the message; Shift+Enter inserts a newline instead,
  // matching standard chat-app keyboard behavior.
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // --------------------------------------------------
  // VOICE INPUT — using the browser's native SpeechRecognition API
  // --------------------------------------------------
  // Guarded so this silently does nothing (and hides the mic button)
  // on browsers that don't support it, rather than throwing an error.
  const SpeechRecognitionApi =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  const handleToggleVoice = () => {
    if (!SpeechRecognitionApi) return;

    // Already listening -> stop it (acts as a toggle button).
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-US"; // browser auto-detects mixed speech reasonably well even set to en-US
    recognition.interimResults = false; // only fire onresult once the phrase is finished, not word-by-word
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    // Appends the recognized speech onto whatever text is already
    // typed, rather than overwriting it, so voice and typing can mix.
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText((previous) =>
        previous ? `${previous} ${transcript}` : transcript,
      );
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Cleans up an in-progress recognition session if the component
  // unmounts while still listening (e.g. the widget is closed).
  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      {/* Attachment preview chip — shown above the input row once a
          file has finished uploading, before the message is sent. */}
      {attachment && (
        <div className="flex items-center gap-2 mb-2 w-fit">
          <div className="relative">
            <img
              src={attachment.previewUrl}
              alt="Attachment preview"
              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
            />
            <button
              type="button"
              onClick={handleRemoveAttachment}
              aria-label="Remove attachment"
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-800 text-white
                flex items-center justify-center"
            >
              <AiOutlineClose className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-2",
          isDisabled
            ? "border-gray-200 bg-gray-50"
            : "border-gray-200 bg-white focus-within:border-primary",
        )}
      >
        {/* Hidden native file input, triggered by the paperclip button below */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_FILE_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />

        {isDisabled ? (
          // Locked state — shown while the socket isn't connected,
          // matching the "Reconnecting..." disabled-input design.
          <div className="flex items-center gap-2 text-gray-400 text-sm flex-1 px-1">
            <AiOutlineLock className="w-4 h-4" />
            <span>
              {connectionStatus === "reconnecting" ||
              connectionStatus === "connecting"
                ? "Connecting to server..."
                : "Chat unavailable"}
            </span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach image"
              disabled={uploadMutation.isPending}
              className="text-gray-400 hover:text-primary transition-colors shrink-0"
            >
              <AiOutlinePaperClip className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
            />

            {/* Mic button — only rendered when the browser actually
                supports SpeechRecognition, so unsupported browsers
                (e.g. older Firefox) never see a broken control. */}
            {SpeechRecognitionApi && (
              <button
                type="button"
                onClick={handleToggleVoice}
                aria-label={
                  isListening ? "Stop voice input" : "Start voice input"
                }
                className={cn(
                  "shrink-0 transition-colors",
                  isListening
                    ? "text-danger animate-pulse"
                    : "text-gray-400 hover:text-primary",
                )}
              >
                {isListening ? (
                  <BsMicMuteFill className="w-4 h-4" />
                ) : (
                  <BsMicFill className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || isTyping}
              aria-label="Send message"
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all",
                text.trim() && !isTyping
                  ? "bg-primary text-white hover:bg-primary-dark active:scale-95"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              )}
            >
              <AiOutlineSend className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
