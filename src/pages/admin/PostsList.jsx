import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AiOutlinePlus, AiOutlineFileText } from "react-icons/ai";

import { getSocialPosts, deleteSocialPost } from "../../api/social.api";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { SOCIAL_POST_STATUS } from "../../constants/statusTypes";
import extractListData from "../../utils/extractListData";
import useDebounce from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../components/ui/Toast";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Pagination from "../../components/ui/Pagination";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already
// used on every other admin screen, replacing this page's own custom
// header row so it finally matches the rest of the panel.
import PostCard from "../../components/admin-social/PostCard";
import PostFilters from "../../components/admin-social/PostFilters";
// PostFilters — the shared-style toolbar above the grid (status tabs,
// search, Filters toggle, Platform chip). The platform option list
// itself now lives inside that file.

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

// Note: the platform option list (Facebook/Instagram/Twitter/TikTok)
// now lives inside PostFilters.jsx, right next to the Platform
// dropdown chip that renders it.

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

  const hasActiveFilters = !!activeStatus || !!platform || !!search;
  // Drives the "Clear all" link's visibility in the toolbar.

  const handleClearFilters = () => {
    setActiveStatus("");
    setPlatform("");
    setSearch("");
    setCurrentPage(1);
  };

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
      {/* Shared gradient PageHeader — matches every other admin screen. */}
      <PageHeader
        icon={<AiOutlineFileText />}
        title="All Posts"
        actions={
          <Button
            variant="primary"
            leftIcon={<AiOutlinePlus className="w-4 h-4" />}
            onClick={() => navigate(ROUTES.ADMIN_SOCIAL_CREATE_POST)}
          >
            Create New Post
          </Button>
        }
      />

      {/* Toolbar — status tabs, search, Filters, and (once opened) the
          Platform dropdown chip. Same shared toolbar pattern used on
          every other admin list page. */}
      <PostFilters
        statusTabs={STATUS_TABS}
        activeStatus={activeStatus}
        onStatusChange={(key) => {
          setActiveStatus(key);
          setCurrentPage(1);
        }}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        platform={platform}
        onPlatformChange={(value) => {
          setPlatform(value);
          setCurrentPage(1);
        }}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

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
