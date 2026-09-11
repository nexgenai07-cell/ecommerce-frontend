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

// Selectable "rows per page" values shown in the pagination dropdown,
// matching the backend's page_size cap of 100.
const PAGE_SIZE_OPTIONS = [9, 18, 36, 90];
// 9 (the previous fixed value) is kept as the smallest/default option
// here instead of 10, since this page renders posts as a 3-column card
// grid and 9 divides evenly into full rows.
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const PostsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeStatus, setActiveStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // pageSize — how many posts the backend returns per page, controlled
  // by the "Rows per page" dropdown next to the Prev/Next controls.
  // Sent to the backend as `page_size` alongside `page` on every request.
  const [postToDelete, setPostToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  // Resets back to page 1 whenever the admin picks a different rows-per-
  // page value, since staying on a deep page of a now-differently-sized
  // result set could land on an empty page.
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

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
      pageSize,
    ],
    queryFn: ({ signal }) =>
      getSocialPosts(
        {
          status: activeStatus || undefined,
          platform: platform || undefined,
          // `search` is now confirmed to work server-side on this
          // endpoint (previously undocumented and sent optimistically)
          search: debouncedSearch || undefined,
          page: currentPage,
          page_size: pageSize,
        },
        signal,
      ),
  });

  const posts = extractListData(postsResponse);
  const totalCount = postsResponse?.data?.count ?? posts.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  // Real server-side pagination is now confirmed on this endpoint, so
  // `posts` is always already exactly one page's worth of results —
  // no more client-side slicing fallback needed for the case where
  // the backend used to return the entire post history at once.

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
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={handlePageSizeChange}
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
