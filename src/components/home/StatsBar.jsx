import { FiUsers, FiStar, FiTruck, FiRefreshCw } from "react-icons/fi";
import Container from "../layouts/Container"; // Wrapper component for consistent max-width/padding

// =============================================
// STATS DATA
// Every icon badge uses a shade from the SAME emerald "primary"
// family defined in tokens.css — keeps the row visually rhythmic
// without ever stepping outside the brand's color system.
// =============================================
const STATS = [
  {
    icon: FiUsers,
    value: "120k+",
    label: "Active Customers",
    iconBg: "bg-gradient-to-br from-primary to-primary-dark",
  },
  {
    icon: FiStar,
    value: "4.9/5",
    label: "Average Rating",
    iconBg: "bg-gradient-to-br from-primary-light to-primary",
  },
  {
    icon: FiTruck,
    value: "FREE",
    label: "Delivery on Rs.5000+",
    iconBg: "bg-gradient-to-br from-primary to-primary-dark",
  },
  {
    icon: FiRefreshCw,
    value: "30-Day",
    label: "Easy Returns",
    iconBg: "bg-gradient-to-br from-primary-light to-primary",
  },
];

const StatsBar = () => {
  return (
    // Full-width section — NOT wrapped in Container at the section
    // level, so the light-mint background stretches edge to edge
    // across the entire viewport. Container is only applied to the
    // inner content below, to keep the stats themselves centered
    // and consistently padded with the rest of the page.
    <section className="w-full bg-primary-50 py-10 border-y border-primary-100">
      <Container>
        {/* Grid layout for the stats:
            - grid-cols-2: 2 columns by default (mobile)
            - md:grid-cols-4: switches to 4 columns on medium screens and above (desktop)
            - gap-8: spacing between grid items */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Loop through each stat in the STATS array and render a block for it */}
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-2.5 text-center transition-transform duration-300 hover:-translate-y-1"
              >
                {/* Icon badge — brand-emerald gradient circle, soft shadow so it lifts off the mint background */}
                <div
                  className={`
                    w-11 h-11 sm:w-13 sm:h-13 rounded-full
                    flex items-center justify-center
                    text-white shadow-md
                    ${stat.iconBg}
                  `}
                >
                  <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </div>

                {/* Main number/value (e.g. "120k+", "4.9/5") */}
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>

                {/* Descriptive label below the value */}
                <p className="text-xs sm:text-sm text-gray-600">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

export default StatsBar;
