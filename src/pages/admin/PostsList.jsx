import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlinePlus, AiOutlineSearch } from "react-icons/ai";

import { getSocialPosts, deleteSocialPost } from "../../api/social.api";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { SOCIAL_POST_STATUS } from "../../constants/statusTypes";
import extractListData from "../../utils/extractListData";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Pagination from "../../components/ui/Pagination";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import PostCard from "../../components/admin-social/PostCard";

// Real status tabs — matches the actual SOCIAL_POST_STATUS enum
// exactly. "Draft" and "Failed" from the design were dropped — they
// aren't real values anywhere in the backend contract.
const STATUS_TABS = [
  { key: "", label: "All" },
  { key: SOCIAL_POST_STATUS.PENDING, label: "Pending" },
  { key: SOCIAL_POST_STATUS.SCHEDULED, label: "Scheduled" },
  { key: SOCIAL_POST_STATUS.PUBLISHED, label: "Published" },
  { key: SOCIAL_POST_STATUS.REJECTED, label: "Rejected" },
];

const PLATFORM_OPTIONS = [
  { value: "", label: "Platform: All" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter / X" },
  { value: "tiktok", label: "TikTok" },
];

const PAGE_SIZE = 9;

const PostsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeStatus, setActiveStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [postToDelete, setPostToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const {
    data: postsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      ...QUERY_KEYS.SOCIAL_POSTS,
      activeStatus,
      platform,
      debouncedSearch,
      currentPage,
    ],
    queryFn: () =>
      getSocialPosts({
        status: activeStatus || undefined,
        platform: platform || undefined,
        // FLAG: `search` isn't a documented param on API 78 (only
        // status/platform are) — sent as an optimistic attempt, same
        // pattern used across every other admin list page
        search: debouncedSearch || undefined,
        page: currentPage,
      }),
  });

  const allPosts = extractListData(postsResponse);
  const totalCount = postsResponse?.data?.count ?? allPosts.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // Client-side pagination fallback — only kicks in if the backend
  // response ISN'T actually paginated (i.e. it returned every post at
  // once), so the grid never shows more than PAGE_SIZE cards
  const posts = postsResponse?.data?.results
    ? allPosts
    : allPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const deleteMutation = useMutation({
    mutationFn: () => deleteSocialPost(postToDelete.id),
    onSuccess: () => {
      showSuccess("Post deleted.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SOCIAL_POSTS });
      setPostToDelete(null);
    },
    onError: () => showError("Failed to delete post."),
  });

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Posts</h1>
          <p className="text-sm text-gray-500">
            Manage and track your social content across all platforms.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<AiOutlinePlus className="w-4 h-4" />}
          onClick={() => navigate(ROUTES.ADMIN_SOCIAL_CREATE_POST)}
        >
          Create New Post
        </Button>
      </div>

      {/* Status tabs + filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key || "all"}
              onClick={() => {
                setActiveStatus(tab.key);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeStatus === tab.key
                  ? "bg-primary-50 text-primary"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Select
            options={PLATFORM_OPTIONS}
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Input
            placeholder="Search posts..."
            leftIcon={<AiOutlineSearch className="w-4 h-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Posts grid */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <p className="text-sm text-gray-400">Something went wrong.</p>
          <Button variant="secondary" onClick={refetch}>
            Try again
          </Button>
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          variant="noResults"
          title="No Posts Found"
          description="Create your first social post to get started."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onEdit={(p) =>
                navigate(ROUTES.ADMIN_SOCIAL_CREATE_POST, {
                  state: { editPost: p },
                })
              }
              onDeleteRequest={setPostToDelete}
            />
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <ConfirmModal
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Post?"
        message="This will permanently remove this social post. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default PostsList;
