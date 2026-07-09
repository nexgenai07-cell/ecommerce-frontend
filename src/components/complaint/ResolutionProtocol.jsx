import {
  BsRobot,
  BsPerson,
  BsCheckCircle,
  BsShieldCheck,
} from "react-icons/bs";

// Protocol steps
// Define a static array describing each step of the resolution protocol, used to render the step list dynamically
const PROTOCOL_STEPS = [
  {
    // Step identifier, displayed as the step number badge
    id: "01",
    // The icon element shown for this step (robot icon, representing AI involvement)
    icon: <BsRobot className="w-3.5 h-3.5" />,
    // The title/heading text for this step
    title: "AI Triage",
    // The descriptive explanation text for this step
    description:
      "Your complaint is analyzed by our system for immediate categorization.",
  },
  {
    // Step identifier for the second step
    id: "02",
    // The icon element shown for this step (person icon, representing a human reviewer)
    icon: <BsPerson className="w-3.5 h-3.5" />,
    // The title/heading text for this step
    title: "Human Review",
    // The descriptive explanation text for this step
    description:
      "A specialist reviews high-priority or complex cases within 4 hours.",
  },
  {
    // Step identifier for the third step
    id: "03",
    // The icon element shown for this step (check-circle icon, representing completion/resolution)
    icon: <BsCheckCircle className="w-3.5 h-3.5" />,
    // The title/heading text for this step
    title: "Resolution",
    // The descriptive explanation text for this step
    description:
      "Most issues are resolved with a final decision in 24-48 business hours.",
  },
];

// Define the ResolutionProtocol functional component (no props required)
const ResolutionProtocol = () => {
  // Begin the JSX returned by this component — plain section now, no outer card wrapper
  return (
    // Vertical flex layout stacking the header, steps, and trust badge with gap spacing between them
    <div className="flex flex-col gap-5">
      {/* Header */}
      {/* Bold heading text displaying this section's title */}
      <h3 className="text-base font-bold text-gray-900">Resolution Protocol</h3>

      {/* Steps */}
      {/* Steps container: vertical flex layout stacking each step with gap spacing between them */}
      <div className="flex flex-col gap-4">
        {/* Map over the PROTOCOL_STEPS array to render one row per step */}
        {PROTOCOL_STEPS.map((step) => (
          // Each step row: flex container aligning the number badge and text content horizontally, with items aligned to the top
          <div key={step.id} className="flex items-start gap-3">
            {/* Step number + icon */}
            {/* Circular badge showing the step's number — now a soft emerald gradient fill instead of a flat tint, giving it a bit more presence */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-br from-primary-50 to-primary-100 text-primary shrink-0 mt-0.5">
              {/* The step's numeric ID text (e.g., "01"), shown small and bold */}
              <span className="text-xs font-extrabold">{step.id}</span>
            </div>

            {/* Content */}
            {/* Text content container: takes up remaining horizontal space (flex-1) and allows text truncation via min-w-0 */}
            <div className="flex-1 min-w-0">
              {/* Step title text, bold and slightly larger, followed by a colon */}
              <p className="text-sm font-semibold text-gray-800">
                {step.title}:
              </p>
              {/* Step description text, smaller and lighter gray, with a small top margin and relaxed line spacing for readability */}
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Trust badge panel */}
      {/* Decorative trust statement panel — dark emerald gradient (instead of plain gray-800) so it ties into the page's brand color
          rather than looking like an unrelated flat block */}
      <div className="relative h-24 rounded-xl overflow-hidden bg-linear-to-br from-gray-900 via-gray-800 to-primary-dark flex items-end p-3">
        {/* Small shield icon in the corner, reinforcing the "trust" message visually */}
        <BsShieldCheck className="absolute top-3 right-3 w-4 h-4 text-white/40" />
        {/* Trust statement text, shown in semi-transparent white with tight line spacing, sitting at the bottom of the panel */}
        <p className="text-xs text-white/80 leading-snug">
          Trusted by 50k+ merchants globally for 99.9% resolution rate.
        </p>
      </div>
    </div>
  );
};

// Export this component as the default export so it can be imported and used in other files
export default ResolutionProtocol;
