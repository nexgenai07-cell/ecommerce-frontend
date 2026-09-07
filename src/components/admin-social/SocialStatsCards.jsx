// ============================================================
// SocialStatsCards — SOCIAL DASHBOARD SUB-COMPONENT
// ============================================================
// Only 2 of the design's 4 cards survive with real data — "Total
// Reach" and "Engagement Rate" were REMOVED entirely (see the flag
// notes shared before this code: those numbers can only be computed
// by calling the per-post Analytics endpoint for every single
// published post, which isn't feasible at scale — a dedicated
// aggregate social-analytics endpoint would be needed to do this honestly).

import { useQuery } from "@tanstack/react-query";
import { AiOutlineFileText, AiOutlineCalendar } from "react-icons/ai";

import { getSocialPosts } from "../../api/social.api";
import { SOCIAL_POST_STATUS } from "../../constants/statusTypes";
import extractListData from "../../utils/extractListData";
import StatsCard from "../ui/StatsCard";

const SocialStatsCards = () => {
  const { data: publishedResponse, isLoading: isPublishedLoading } = useQuery({
    queryKey: ["socialDashboard", "published"],
    queryFn: ({ signal }) => getSocialPosts({ status: SOCIAL_POST_STATUS.PUBLISHED }, signal),
  });
  const publishedPosts = extractListData(publishedResponse);
  const totalPublished =
    publishedResponse?.data?.count ?? publishedPosts.length;

  const { data: scheduledResponse, isLoading: isScheduledLoading } = useQuery({
    queryKey: ["socialDashboard", "scheduled"],
    queryFn: ({ signal }) => getSocialPosts({ status: SOCIAL_POST_STATUS.SCHEDULED }, signal),
  });
  const scheduledPosts = extractListData(scheduledResponse);
  const totalScheduled =
    scheduledResponse?.data?.count ?? scheduledPosts.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <StatsCard
        title="Total Published"
        value={isPublishedLoading ? "—" : totalPublished}
        icon={<AiOutlineFileText />}
        iconBg="bg-primary-50"
        iconColor="text-primary"
      />
      <StatsCard
        title="Scheduled Posts"
        value={isScheduledLoading ? "—" : totalScheduled}
        icon={<AiOutlineCalendar />}
        iconBg="bg-info-light"
        iconColor="text-info"
      />
    </div>
  );
};

export default SocialStatsCards;
