import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlineCheckCircle } from "react-icons/ai";
import {
  HiOutlineUserCircle,
  HiOutlineCamera,
  HiOutlinePhoto,
  HiOutlineTrash,
} from "react-icons/hi2";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { updateMyProfile, sendVerificationEmail } from "../../api/auth.api";
import useAuth from "../../hooks/useAuth";
import { showSuccess, showError } from "../ui/Toast";
import Avatar from "../ui/Avatar";
import ChangeEmailModal from "./ChangeEmailModal";
import PhoneVerifyModal from "./PhoneVerifyModal";
import CameraCaptureModal from "./CameraCaptureModal";

const personalInfoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[A-Za-z\s'-]+$/, "Name can only contain letters"),
  // Same Pakistani phone format already validated on Register.jsx, so
  // the account-level phone number entered here follows the exact
  // same rule as the one collected at sign-up.
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(
      /^(\+92|0)[0-9]{10}$/,
      "Please enter a valid Pakistani phone number",
    ),
});

const PersonalInfoForm = ({ user }) => {
  const queryClient = useQueryClient();
  const { updateProfile } = useAuth();
  // updateProfile -> syncs Redux auth state (and localStorage) so the
  // navbar/sidebar avatar, name, and email reflect a save immediately,
  // without requiring a page refresh or a fresh login.

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty, dirtyFields },
  } = useForm({
    resolver: zodResolver(personalInfoSchema),
    // Live validation (industry-standard pattern, same one Gmail/Amazon/
    // most production sites use): a field is left completely alone while
    // the user is still typing into it for the first time -- no error,
    // no matter how invalid the in-progress value looks. The first check
    // happens on "blur", i.e. the moment the user leaves that field
    // (Tab key or clicking elsewhere) -- mode: "onTouched" below. From
    // that point on, react-hook-form's default reValidateMode ("onChange")
    // takes over automatically: if the field was invalid, it re-checks on
    // every keystroke so the error clears the instant the value becomes
    // valid, without needing another blur.
    mode: "onTouched",
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [user, reset]);

  // =============================================
  // AVATAR PHOTO PICKER — local file selection + preview
  // =============================================
  // The actual upload (or removal) only happens when the form is
  // submitted (Save Changes), together with any name/phone edit, in
  // one single request — see updateMutation below.
  //
  // Clicking the avatar opens a small menu with three choices:
  //   - Take Photo          -> opens a live camera preview (via the
  //                            CameraCaptureModal below) and lets the
  //                            user snap a photo, on both desktop
  //                            webcams and mobile device cameras
  //   - Choose from Gallery -> opens the regular file/photo picker
  //   - Remove Photo        -> only shown when a photo is currently
  //                            set, clears it instead of forcing a
  //                            re-upload just to get rid of it
  const galleryInputRef = useRef(null);
  const avatarMenuRef = useRef(null);

  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAvatarRemoved, setIsAvatarRemoved] = useState(false);

  // Revokes the previous local preview URL whenever a new one is
  // created (or the component unmounts), so the browser doesn't keep
  // an ever-growing list of unused object URLs in memory.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Closes the photo options menu when the user clicks anywhere
  // outside of it, so it behaves like a standard dropdown.
  useEffect(() => {
    if (!isAvatarMenuOpen) return;

    const handleClickOutside = (event) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target)
      ) {
        setIsAvatarMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAvatarMenuOpen]);

  const toggleAvatarMenu = () => setIsAvatarMenuOpen((open) => !open);

  const openGalleryPicker = () => {
    setIsAvatarMenuOpen(false);
    galleryInputRef.current?.click();
  };

  const openCameraModal = () => {
    setIsAvatarMenuOpen(false);
    setIsCameraModalOpen(true);
  };

  // Shared by both photo sources (the gallery file input and a frame
  // captured from CameraCaptureModal) so a chosen image is validated
  // and previewed the exact same way no matter where it came from.
  const applySelectedFile = (file) => {
    if (!file) return;

    // Basic client-side guardrails before it's ever sent anywhere —
    // an image type and a sane size cap (5MB), matching the kind of
    // limit already used for the complaint attachment upload.
    if (!file.type.startsWith("image/")) {
      showError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError("Image is too large — please choose a file under 5MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    // A freshly chosen photo replaces any pending removal request.
    setIsAvatarRemoved(false);
  };

  const handleAvatarFileSelected = (e) => {
    applySelectedFile(e.target.files?.[0]);

    // Resetting the input's value lets the user pick the exact same
    // file again later (e.g. after removing it) and still have the
    // change event fire — browsers don't fire "change" a second time
    // for an identical selection otherwise.
    e.target.value = "";
  };

  // Called by CameraCaptureModal with the photo the user just snapped.
  const handleCameraCapture = (file) => applySelectedFile(file);

  const handleRemovePhoto = () => {
    setIsAvatarMenuOpen(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsAvatarRemoved(true);
  };

  // The avatar shown right now — the freshly picked local file while
  // one is pending, an empty avatar while a removal is pending,
  // otherwise whatever the backend already has saved.
  const displayedAvatarSrc =
    previewUrl || (isAvatarRemoved ? "" : user?.profile_picture);

  // Whether the "Remove Photo" option should be offered at all — no
  // point showing it when there's nothing set to remove.
  const hasAvatarToRemove = Boolean(displayedAvatarSrc);

  // =============================================
  // UPDATE PROFILE MUTATION — API 8
  // =============================================
  const updateMutation = useMutation({
    mutationFn: (data) => updateMyProfile(data),
    onSuccess: (response) => {
      showSuccess("Profile updated successfully!");
      // Writes the freshly saved profile straight into the query
      // cache so "user" (passed down from ProfileSettings/AdminProfile)
      // updates in the very same render as the local overrides being
      // cleared below. Relying only on invalidateQueries here left a
      // gap — its background refetch takes a moment to land, and in
      // that gap "user" still held the old profile_picture, so the
      // old (or just-removed) photo would flash back on screen for an
      // instant before snapping to the correct one.
      queryClient.setQueryData(QUERY_KEYS.MY_PROFILE, (previous) =>
        previous ? { ...previous, data: response?.data } : previous,
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PROFILE });
      updateProfile(response?.data || {});
      // Clear the pending local file/preview/removal now that it's
      // been saved — displayedAvatarSrc falls back to the freshly
      // saved user.profile_picture from here on.
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsAvatarRemoved(false);
    },
    onError: (error) => {
      showError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to update profile. Please try again.",
      );
    },
  });

  // =============================================
  // PHONE VERIFY MODAL STATE
  // =============================================
  // A new phone number is never saved directly from this form — it
  // has to be confirmed with a code emailed to the account first (see
  // PhoneVerifyModal). "pendingPhone" holds the number currently
  // awaiting that confirmation.
  const [pendingPhone, setPendingPhone] = useState(null);

  const onSubmit = (data) => {
    const trimmedPhone = data.phone.trim();
    const phoneChanged = trimmedPhone !== (user?.phone || "");
    const avatarFields = selectedFile
      ? { profile_picture: selectedFile }
      : isAvatarRemoved
        ? { profile_picture: null }
        : {};

    if (!phoneChanged) {
      // Phone is untouched — save exactly as before, name/avatar and
      // the existing phone together in one request.
      updateMutation.mutate({
        name: data.name,
        phone: data.phone,
        ...avatarFields,
      });
      return;
    }

    // The phone changed — name and/or avatar changes (if any) are not
    // gated behind verification, so they're saved right away, keeping
    // the account's current phone untouched for this request. The new
    // phone itself only gets applied once PhoneVerifyModal confirms it.
    if (dirtyFields.name || selectedFile || isAvatarRemoved) {
      updateMutation.mutate({
        name: data.name,
        phone: user?.phone || "",
        ...avatarFields,
      });
    }

    setPendingPhone(trimmedPhone);
  };

  // Called by PhoneVerifyModal once the code is confirmed — mirrors
  // handleEmailChanged below, refreshing both the query cache and the
  // Redux auth state with the account's new, now-verified phone.
  const handlePhoneVerified = (updatedUser) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PROFILE });
    if (updatedUser) updateProfile(updatedUser);
    setPendingPhone(null);
  };

  // Called when the customer closes PhoneVerifyModal without
  // completing verification — the typed number is discarded and the
  // field snaps back to the account's actual saved phone.
  const handlePhoneVerifyCancel = () => {
    setValue("phone", user?.phone || "", { shouldDirty: false });
    setPendingPhone(null);
  };

  // =============================================
  // RESEND VERIFICATION EMAIL MUTATION
  // API 17 — POST /api/v1/auth/send-verification-email/
  // =============================================
  const resendMutation = useMutation({
    mutationFn: () => sendVerificationEmail(user?.email),
    onSuccess: (response) => {
      showSuccess(
        response?.data?.message || "Verification email has been sent.",
      );
    },
    onError: (error) => {
      showError(
        error?.response?.data?.message ||
          "Failed to send verification email. Please try again.",
      );
    },
  });

  // =============================================
  // CHANGE EMAIL MODAL — API 8.1 / API 8.2
  // =============================================
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);

  // Called by ChangeEmailModal once the two-step flow completes —
  // "updatedUser" is the fresh, already-updated profile object the
  // confirm step (API 8.2) returns, with the new (now verified) email.
  const handleEmailChanged = (updatedUser) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PROFILE });
    if (updatedUser) updateProfile(updatedUser);
  };

  const canSave =
    (isDirty || selectedFile || isAvatarRemoved) && !updateMutation.isPending;

  return (
    <div className="relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute -top-24 -right-24 w-56 h-56 bg-linear-to-br from-primary/20 to-primary-light/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-6 sm:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <HiOutlineUserCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Personal Information
            </h2>
            <p className="text-xs text-gray-400">
              Manage your basic account details
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar — clickable, opens a small menu with Take Photo /
                Choose from Gallery / Remove Photo. A camera badge in
                the corner signals it's editable, and the ring becomes
                a hover target. */}
            <div
              ref={avatarMenuRef}
              className="relative shrink-0 mx-auto sm:mx-0"
            >
              <button
                type="button"
                onClick={toggleAvatarMenu}
                className="relative block rounded-full group focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Change profile picture"
                aria-haspopup="true"
                aria-expanded={isAvatarMenuOpen}
              >
                <Avatar
                  src={displayedAvatarSrc}
                  name={user?.name}
                  size="xl"
                  className="ring-4 ring-primary ring-offset-2 ring-offset-white"
                />
                {/* Plain green ring border directly on the photo circle —
                    a clean ring-primary border with a small white gap,
                    no extra padding wrapper divs. */}
                <span className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-md ring-2 ring-white group-hover:bg-primary transition-colors">
                  <HiOutlineCamera className="w-3.5 h-3.5" />
                </span>
              </button>

              {/* Photo options menu — anchored under the avatar and
                  centered on narrow screens so it always stays inside
                  the viewport instead of running off the edge. */}
              {isAvatarMenuOpen && (
                <div
                  role="menu"
                  className="absolute z-20 top-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-gray-100 shadow-lg shadow-gray-900/10 py-1.5 overflow-hidden"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openCameraModal}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <HiOutlineCamera className="w-4 h-4 text-gray-400 shrink-0" />
                    Take Photo
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openGalleryPicker}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <HiOutlinePhoto className="w-4 h-4 text-gray-400 shrink-0" />
                    Choose from Gallery
                  </button>
                  {hasAvatarToRemove && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleRemovePhoto}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger-light/10 transition-colors border-t border-gray-50"
                    >
                      <HiOutlineTrash className="w-4 h-4 shrink-0" />
                      Remove Photo
                    </button>
                  )}
                </div>
              )}

              {/* Gallery picker — opens the regular file/photo library */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelected}
                className="hidden"
              />

              {selectedFile && (
                <p className="text-[11px] text-primary text-center mt-1.5">
                  New photo selected — click Save to upload
                </p>
              )}
              {isAvatarRemoved && !selectedFile && (
                <p className="text-[11px] text-danger text-center mt-1.5">
                  Photo will be removed — click Save to confirm
                </p>
              )}
            </div>

            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  {...register("name")}
                  className={`
                    w-full px-4 py-3 text-sm rounded-xl border bg-gray-50/50
                    placeholder:text-gray-300 text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white
                    transition-all duration-200
                    ${errors.name ? "border-danger" : "border-gray-200"}
                  `}
                />
                {errors.name && (
                  <p className="text-xs text-danger">{errors.name.message}</p>
                )}
              </div>

              {/* Phone Number — the verified checkmark mirrors the one on
                  the read-only Email field below, and this field stays
                  fully editable, unlike email. The account's phone is
                  verified together with the account's email at signup;
                  changing it here goes through PhoneVerifyModal — a
                  code emailed to the account confirms the new number
                  before it's actually saved (see onSubmit above). */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="03001234567"
                    autoComplete="tel"
                    {...register("phone")}
                    className={`
                      w-full pl-4 pr-10 py-3 text-sm rounded-xl border bg-gray-50/50
                      placeholder:text-gray-300 text-gray-900
                      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white
                      transition-all duration-200
                      ${errors.phone ? "border-danger" : "border-gray-200"}
                    `}
                  />
                  {user?.phone_verified && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success">
                      <AiOutlineCheckCircle className="w-4 h-4" />
                    </span>
                  )}
                </div>
                {errors.phone && (
                  <p className="text-xs text-danger">{errors.phone.message}</p>
                )}
                {!errors.phone && dirtyFields.phone && (
                  <p className="text-xs text-gray-400">
                    You'll need to confirm this number with a code emailed to
                    you before it's saved.
                  </p>
                )}
                {!errors.phone &&
                  !dirtyFields.phone &&
                  user?.phone &&
                  !user?.phone_verified && (
                    <p className="text-xs text-gray-400">
                      Not verified yet — save this field again to confirm it by
                      email.
                    </p>
                  )}
              </div>

              {/* Email — read only with verified checkmark; changing it
                  now goes through the two-step Change Email flow
                  (API 8.1 / API 8.2) instead of being editable here */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user?.email || ""}
                    readOnly
                    className="
                      w-full pl-4 pr-10 py-3 text-sm rounded-xl border border-gray-200
                      bg-gray-100 text-gray-500 cursor-not-allowed
                      focus:outline-none
                    "
                  />
                  {user?.email_verified && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success">
                      <AiOutlineCheckCircle className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-400">
                    Changing your email requires verifying the new address.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsChangeEmailOpen(true)}
                    className="text-xs font-semibold text-primary hover:underline shrink-0 whitespace-nowrap"
                  >
                    Change Email
                  </button>
                </div>

                {user?.email_verified === false && (
                  <div className="flex items-center justify-between gap-3 mt-1 p-3 bg-linear-to-r from-warning-light to-warning-light/40 rounded-xl border border-warning/20">
                    <p className="text-xs text-warning leading-relaxed">
                      Your email isn't verified yet. Please check your inbox.
                    </p>
                    <button
                      type="button"
                      onClick={() => resendMutation.mutate()}
                      disabled={resendMutation.isPending}
                      className="
                        text-xs font-semibold text-primary hover:underline
                        disabled:opacity-50 disabled:cursor-not-allowed
                        shrink-0 whitespace-nowrap
                      "
                    >
                      {resendMutation.isPending ? "Sending..." : "Resend Email"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Changes button */}
          <div className="flex justify-end pt-4 border-t border-gray-50">
            <button
              type="submit"
              disabled={!canSave}
              className="
                px-7 py-3 bg-linear-to-r from-primary to-primary-dark text-white text-sm font-semibold rounded-xl
                shadow-md shadow-primary/25
                hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5
                active:scale-[0.98] active:translate-y-0
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none disabled:hover:shadow-none
                transition-all duration-200
              "
            >
              {updateMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>

      <ChangeEmailModal
        isOpen={isChangeEmailOpen}
        onClose={() => setIsChangeEmailOpen(false)}
        onSuccess={handleEmailChanged}
      />

      <PhoneVerifyModal
        isOpen={Boolean(pendingPhone)}
        phone={pendingPhone}
        onCancel={handlePhoneVerifyCancel}
        onSuccess={handlePhoneVerified}
      />

      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};

export default PersonalInfoForm;
