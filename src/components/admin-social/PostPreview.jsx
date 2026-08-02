// ============================================================
// PostPreview — CREATE POST SUB-COMPONENT
// ============================================================
// A purely visual phone-mockup rendering of the caption + image the
// admin has already typed/selected — this doesn't claim to fetch or
// verify anything from the backend, it's an honest live reflection of
// form state the admin controls directly, same category as the
// dashboard's LivePreviewCard for products.

const PLATFORM_LIMITS = {
  facebook: 2000,
  instagram: 2200,
  twitter: 280,
  tiktok: 2200,
};

export const getCharacterLimit = (platform) =>
  PLATFORM_LIMITS[platform] || 2000;

const PostPreview = ({ platform, caption, imageUrl }) => {
  return (
    <div className="w-full max-w-[280px] mx-auto bg-white rounded-2xl border-4 border-gray-900 overflow-hidden shadow-lg">
      {/* Header row — static brand identity, matches whatever the
          store's own name is (hardcoded here as a simple label since
          there's no per-post "posting as" identity field to pull from) */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-50">
        <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
          Z
        </span>
        <div>
          <p className="text-xs font-semibold text-gray-900">
            Zyron Marketplace
          </p>
          <p className="text-[10px] text-gray-400 capitalize">
            {platform} · Sponsored
          </p>
        </div>
      </div>

      <p className="px-3 py-2 text-xs text-gray-700 line-clamp-4">
        {caption || "Your caption will appear here..."}
      </p>

      <div className="aspect-square bg-gray-100">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
            No image selected
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 p-3 text-gray-400">
        <span className="text-xs">♡ Like</span>
        <span className="text-xs">💬 Comment</span>
        <span className="text-xs">↗ Share</span>
      </div>
    </div>
  );
};

export default PostPreview;
