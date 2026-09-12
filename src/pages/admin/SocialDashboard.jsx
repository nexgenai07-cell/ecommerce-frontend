import { useNavigate } from "react-router-dom";
import { AiOutlinePlus, AiOutlineShareAlt } from "react-icons/ai";

import { ROUTES } from "../../constants/routes";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/shared/PageHeader";
// PageHeader — the SAME shared gradient icon + title header already
// used on every other admin screen, replacing this page's own plain
// <h1> so it finally matches the rest of the panel.
import ConnectedAccountsRow from "../../components/admin-social/ConnectedAccountsRow";
import SocialStatsCards from "../../components/admin-social/SocialStatsCards";
import PostsByPlatformChart from "../../components/admin-social/PostsByPlatformChart";
import RecentPostsPerformanceTable from "../../components/admin-social/RecentPostsPerformanceTable";

const SocialDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      {/* Shared gradient PageHeader — matches every other admin screen. */}
      <PageHeader
        icon={<AiOutlineShareAlt />}
        title="Social Media Dashboard"
        actions={
          <Button
            variant="primary"
            leftIcon={<AiOutlinePlus className="w-4 h-4" />}
            onClick={() => navigate(ROUTES.ADMIN_SOCIAL_CREATE_POST)}
          >
            Create Post
          </Button>
        }
      />

      <ConnectedAccountsRow />

      <SocialStatsCards />
      {/* Note: "Total Reach" and "Engagement Rate" cards from the
          design are NOT included — see the flag notes shared before
          this code: neither is computable without an aggregate
          social-analytics endpoint that doesn't currently exist. */}

      {/* "Engagement Over Time" chart from the design is NOT included
          — no time-series social-engagement endpoint exists to power
          it. PostsByPlatformChart (real, via the documented platform
          filter) sits alone here at a natural donut-chart width
          instead of being stretched into the space meant for a
          wider chart. */}
      <div className="max-w-md">
        <PostsByPlatformChart />
      </div>

      <RecentPostsPerformanceTable />
    </div>
  );
};

export default SocialDashboard;
