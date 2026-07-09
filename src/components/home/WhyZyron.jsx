import { BsRobot, BsTruck, BsHeadset } from "react-icons/bs"; // Icons used for each feature card
import Container from "../layouts/Container"; // Wrapper that centers content and applies consistent side padding

// Static list of feature cards — no API call needed, this content never changes
const FEATURES = [
  {
    icon: <BsRobot className="w-6 h-6" />, // Robot icon for the AI recommendations feature
    title: "AI Recommendations",
    description:
      "Our proprietary AI learns your style and curates a personalized selection just for you, getting smarter with every interaction.",
  },
  {
    icon: <BsTruck className="w-6 h-6" />, // Truck icon for the delivery feature
    title: "Lightning Fast Delivery",
    description:
      "Logistics optimized for maximum speed. Most orders arrive within 2-3 business days with real-time tracking.",
  },
  {
    icon: <BsHeadset className="w-6 h-6" />, // Headset icon for the support feature
    title: "24/7 AI Support",
    description:
      "Intelligent assistance available around the clock. Get instant answers to any question, anytime you need help.",
  },
];

const WhyZyron = () => {
  return (
    // Outer section wrapper with vertical + horizontal padding
    <section className="py-14 px-14">
      <Container>
        {/* Vertical stack: header block, then the 3-column feature grid */}
        <div className="flex flex-col gap-10">
          {/* ============ SECTION HEADER ============ */}
          {/* Centered eyebrow label + main heading + supporting subtitle */}
          <div className="flex flex-col items-center text-center gap-3">
            {/* Main section title — scales up from mobile (text-2xl) to desktop (text-4xl) for a bold, responsive look */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Why Choose Zyron
            </h2>
            {/* Supporting subtitle text under the heading, width-capped so it doesn't stretch too wide */}
            <p className="text-sm sm:text-base text-gray-500 max-w-md">
              Built different. Designed for the modern shopper.
            </p>
          </div>

          {/* ============ FEATURE CARDS GRID ============ */}
          {/* 1 column on mobile, 3 columns side-by-side from md breakpoint up */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title} // Unique key required by React for list items
                className="flex flex-col gap-4 p-6 rounded-xl border border-gray-100 shadow-2xl hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300" // Card lifts slightly and highlights on hover
              >
                {/* Icon badge — soft gradient circle behind each feature's icon */}
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary shrink-0">
                  {feature.icon}
                </div>

                {/* Feature title + description text */}
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-gray-900 text-base">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default WhyZyron;
