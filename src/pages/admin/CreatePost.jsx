import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BsFacebook, BsInstagram, BsTwitterX, BsTiktok } from "react-icons/bs";

import { createSocialPost, approvePost } from "../../api/social.api";
// createSocialPost — API 78: creates the post, always starts PENDING
// approvePost      — API 80: the REAL step that moves a post from
//                    pending toward scheduled/live — Create Post
//                    alone does NOT schedule or publish anything.

import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Textarea from "../../components/ui/Textarea";
import ProductPicker from "../../components/admin-social/ProductPicker";
import PostPreview, {
  getCharacterLimit,
} from "../../components/admin-social/PostPreview";

const PLATFORMS = [
  { key: "facebook", label: "Facebook", icon: BsFacebook },
  { key: "instagram", label: "Instagram", icon: BsInstagram },
  { key: "twitter", label: "Twitter", icon: BsTwitterX },
  { key: "tiktok", label: "TikTok", icon: BsTiktok },
];

const CreatePost = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedPlatforms, setSelectedPlatforms] = useState(["facebook"]);
  const [activePreviewPlatform, setActivePreviewPlatform] =
    useState("facebook");
  const [product, setProduct] = useState(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mode, setMode] = useState("now"); // "now" | "schedule"
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePlatform = (key) => {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  // When a product is picked, default the image to that product's
  // real primary image — the admin can still override it manually below
  const handleProductSelect = (selected) => {
    setProduct(selected);
    if (selected?.primary_image) {
      setImageUrl(selected.primary_image);
    }
  };

  // --------------------------------------------------
  // CORE SUBMIT FLOW
  // For EACH selected platform: create a real post (API 78), then —
  // unless this is a plain "Save as Draft" — immediately approve it
  // (API 80) with the chosen scheduled_at value. "Post Now" uses the
  // current moment as scheduled_at; there's no separate "publish
  // instantly" action documented beyond approving with an immediate time.
  // --------------------------------------------------
  const runSubmit = async ({ asDraft }) => {
    if (!product) {
      showError("Please select a product to link this post to.");
      return;
    }
    if (selectedPlatforms.length === 0) {
      showError("Please select at least one platform.");
      return;
    }
    if (!caption.trim()) {
      showError("Please write a caption.");
      return;
    }

    setIsSubmitting(true);
    try {
      const effectiveScheduledAt =
        mode === "now" ? new Date().toISOString() : scheduledAt;

      // One real create (+ optional approve) call PER selected
      // platform — matches API 78's single-platform-per-post shape
      for (const platform of selectedPlatforms) {
        const createResponse = await createSocialPost({
          product: product.id,
          platform,
          caption,
          hashtags,
          image_url: imageUrl,
        });

        if (!asDraft) {
          await approvePost(createResponse.data.id, {
            scheduled_at: effectiveScheduledAt,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SOCIAL_POSTS });
      showSuccess(
        asDraft
          ? "Saved as draft."
          : mode === "now"
            ? "Post approved and queued to publish."
            : "Post scheduled.",
      );
      navigate(ROUTES.ADMIN_SOCIAL_POSTS);
    } catch (error) {
      showError(
        error?.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeLimit = getCharacterLimit(activePreviewPlatform);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-gray-400 mb-1">
          Social Media / Create New Post
        </p>
        <h1 className="text-xl font-bold text-gray-900">Create New Post</h1>
        <p className="text-sm text-gray-500">
          Compose and schedule your social media content.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — the form */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Platform selection */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3">
            <span className="text-sm font-medium text-gray-700">
              Select Platforms
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const isSelected = selectedPlatforms.includes(platform.key);
                return (
                  <button
                    key={platform.key}
                    type="button"
                    onClick={() => togglePlatform(platform.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-primary bg-primary-50 text-primary"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <ProductPicker
              selectedProduct={product}
              onSelect={handleProductSelect}
            />
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3">
            <Textarea
              label="Content"
              placeholder="What would you like to share?"
              rows={5}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <p
              className={`text-xs text-right ${
                caption.length > activeLimit ? "text-danger" : "text-gray-400"
              }`}
            >
              {caption.length}/{activeLimit} characters ({activePreviewPlatform}
              )
            </p>
            <Input
              label="Hashtags"
              placeholder="#newarrival #sale"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>

          {/* Media */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3">
            <span className="text-sm font-medium text-gray-700">Media</span>
            <p className="text-xs text-gray-400">
              Auto-filled from the selected product's image — override with a
              direct image URL if needed.
            </p>
            <Input
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          {/* Scheduling */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3">
            <span className="text-sm font-medium text-gray-700">
              Scheduling
            </span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              <button
                type="button"
                onClick={() => setMode("now")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === "now"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                Post Now
              </button>
              <button
                type="button"
                onClick={() => setMode("schedule")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === "schedule"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                Schedule
              </button>
            </div>
            {mode === "schedule" && (
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            )}
          </div>
        </div>

        {/* Right column — live preview */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-1 mb-4 border-b border-gray-100">
              {selectedPlatforms.map((platform) => (
                <button
                  key={platform}
                  onClick={() => setActivePreviewPlatform(platform)}
                  className={`px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${
                    activePreviewPlatform === platform
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
            <PostPreview
              platform={activePreviewPlatform}
              caption={`${caption} ${hashtags}`.trim()}
              imageUrl={imageUrl}
            />
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => runSubmit({ asDraft: true })}
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Save as Draft
        </Button>
        <Button
          variant="primary"
          onClick={() => runSubmit({ asDraft: false })}
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {mode === "now" ? "Post Now" : "Schedule Post"}
        </Button>
      </div>
    </div>
  );
};

export default CreatePost;
