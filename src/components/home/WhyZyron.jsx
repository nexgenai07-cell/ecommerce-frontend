// ============================================================
// WHY ZYRON SECTION
// Displays 3 feature cards explaining why customers should choose Zyron.
// Content here is intentionally static — there is no "platform features"
// model anywhere in the ERD or the 94-endpoint API documentation, so
// this is fixed marketing copy, same as on any real ecommerce site.
// Fully responsive — 1 column on mobile, 3 columns on desktop.
// ============================================================

import { BsRobot, BsTruck, BsHeadset } from "react-icons/bs";
import Container from "../layouts/Container";

const FEATURES = [
  {
    icon: <BsRobot className="w-6 h-6" />,
    title: "AI Recommendations",
    description:
      "Our proprietary AI learns your style and curates a personalized selection just for you, getting smarter with every interaction.",
  },
  {
    icon: <BsTruck className="w-6 h-6" />,
    title: "Lightning Fast Delivery",
    description:
      "Logistics optimized for maximum speed. Most orders arrive within 2-3 business days with real-time tracking.",
  },
  {
    icon: <BsHeadset className="w-6 h-6" />,
    title: "24/7 AI Support",
    description:
      "Intelligent assistance available around the clock. Get instant answers to any question, anytime you need help.",
  },
];

const WhyZyron = () => {
  return (
    <section className="py-14 px-14">
      <Container>
        <div className="flex flex-col gap-10">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">
              Why Choose Zyron
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Built different. Designed for the modern shopper.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col gap-4 p-6 rounded-xl border border-gray-100 shadow-2xl hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary shrink-0">
                  {feature.icon}
                </div>

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
