import { Link } from "react-router-dom"; // Client-side navigation for the call-to-action on the last page
import { AiOutlineArrowRight } from "react-icons/ai"; // Arrow used as the "turn the page" affordance and inside the call-to-action
import {
  BsRobot,
  BsTruck,
  BsHeadset,
  BsBagCheckFill,
  BsCheckCircleFill,
} from "react-icons/bs"; // Feature icons, plus the badge and check marks of the closing page
import Container from "../layouts/Container"; // Shared layout wrapper that centers content
import SectionHeading from "../shared/SectionHeading"; // Animated heading block shared by the home sections
import InteractiveBook from "../ui/InteractiveBook"; // Reusable 3D page-flip book
import FireworksBackground from "../ui/FireworksBackground"; // Decorative canvas fireworks drawn behind the section content
import { ROUTES } from "../../constants/routes"; // Central list of app route paths

// ============================================================
// FEATURE DATA
// The three reasons shown in the book. Each feature is printed as a
// photo page (left) paired with a text page (right) in the same spread.
// ============================================================
const FEATURES = [
  {
    id: 1, // Unique identifier used as the React key
    label: "Feature 01", // Small eyebrow shown above the title
    title: "AI Recommendations",
    description:
      "Our proprietary AI learns your style and curates a personalized selection just for you, getting smarter with every interaction.",
    image:
      "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80&auto=format&fit=crop&crop=entropy", // Photo related to AI and circuitry
    Icon: BsRobot, // Badge icon shown on the photo
    highlights: ["Personalized", "Self-learning"], // Short tags printed under the description
  },
  {
    id: 2,
    label: "Feature 02",
    title: "Lightning Fast Delivery",
    description:
      "Logistics optimized for maximum speed. Most orders arrive within 2-3 business days with real-time tracking.",
    image:
      "https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?w=900&q=80&auto=format&fit=crop&crop=entropy", // Photo of a shipping package
    Icon: BsTruck,
    highlights: ["2-3 days", "Live tracking"],
  },
  {
    id: 3,
    label: "Feature 03",
    title: "24/7 AI Support",
    description:
      "Intelligent assistance available around the clock. Get instant answers to any question, anytime you need help.",
    image:
      "https://images.unsplash.com/photo-1553775282-20af80779df7?w=900&q=80&auto=format&fit=crop&crop=entropy", // Photo of a support headset
    Icon: BsHeadset,
    highlights: ["Always on", "Instant answers"],
  },
];

// Short recap of the benefits listed on the closing page
const BENEFIT_RECAP = [
  "AI-curated picks",
  "2-3 day delivery",
  "24/7 AI support",
];

// Deep emerald and teal shades used for the fireworks, matching the brand theme.
const FIREWORK_COLORS = ["#064e3b", "#065f46", "#047857", "#059669", "#0f766e"];

// Rocket sticks with a clearly visible thickness and small glassy sparks.
const FIREWORK_SIZE = { min: 1.5, max: 3 };
const FIREWORK_PARTICLE_SIZE = { min: 1.5, max: 3.5 };

const TOTAL_FEATURES = FEATURES.length; // Number of features, used for the "01 / 03" counter

// Pads a number to two digits, for example 1 becomes "01"
const formatNumber = (value) => String(value).padStart(2, "0");

// ============================================================
// PAGE CONTENT
// The three page layouts printed inside the book. Every measurement
// uses em units, and the base font size of a page scales with the page
// width (see .zyron-book__type in index.css), so each layout stays
// proportional on every screen size.
// ============================================================

// Left page: framed photo of a feature with its icon badge and counter
const FeaturePhotoPage = ({ feature, index, folio }) => {
  const { Icon } = feature; // Icon component of this feature

  return (
    <div className="zyron-book__pad zyron-book__pad--photo zyron-book__type flex h-full select-none flex-col gap-[0.6em]">
      {/* Photo frame, like a mounted print */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[0.9em] bg-gray-200">
        <img
          src={feature.image}
          alt={feature.title}
          className="size-full object-cover object-center"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        {/* Soft gradient so the chips stay readable on any photo */}
        <div className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-black/10" />

        {/* Icon badge in the top-left corner of the photo */}
        <div className="absolute left-[0.8em] top-[0.8em] flex size-[2.7em] items-center justify-center rounded-[0.85em] bg-linear-to-br from-primary to-primary-dark text-[1.15em] text-white shadow-lg shadow-primary/30">
          <Icon aria-hidden="true" />
        </div>

        {/* Feature counter in the bottom-left corner of the photo */}
        <span className="absolute bottom-[0.8em] left-[0.8em] rounded-full bg-white/85 px-[0.8em] py-[0.25em] font-sans text-[0.75em] font-semibold tracking-wider text-gray-800 backdrop-blur-sm">
          {formatNumber(index + 1)} / {formatNumber(TOTAL_FEATURES)}
        </span>
      </div>

      {/* Page number; a non-breaking space keeps the frame height identical when no page number is given */}
      <span className="font-sans text-[0.8em] tracking-wider text-gray-400">
        {folio ?? "\u00A0"}
      </span>
    </div>
  );
};

// Right page: label, title, description, tags, progress and a "next" cue for a feature
const FeatureTextPage = ({ feature, index, folio }) => (
  <div className="zyron-book__pad zyron-book__type relative flex h-full select-none flex-col font-serif text-gray-700">
    {/* Decorative background: soft glows, a dotted corner and a large ghost number */}
    <div className="pointer-events-none absolute -bottom-[24cqw] -left-[24cqw] size-[76cqw] rounded-full bg-primary/10 blur-2xl" />
    <div className="pointer-events-none absolute -right-[20cqw] -top-[20cqw] size-[62cqw] rounded-full bg-primary-100/70 blur-2xl" />
    <div className="zyron-book__dots pointer-events-none absolute right-0 top-0 size-[44cqw]" />
    <span
      className="pointer-events-none absolute -bottom-[3cqw] right-[3cqw] font-serif text-[44cqw] font-black leading-none text-primary/[0.07]"
      aria-hidden="true"
    >
      {formatNumber(index + 1)}
    </span>

    {/* Top row: feature label pill and page number */}
    <div className="relative flex items-center justify-between">
      <span className="inline-flex items-center gap-[0.5em] rounded-full bg-primary/10 px-[0.85em] py-[0.3em] font-sans text-[0.8em] font-bold uppercase tracking-[0.16em] text-primary-dark">
        <span
          className="size-[0.55em] rounded-full bg-primary"
          aria-hidden="true"
        />
        {feature.label}
      </span>
      <span className="font-sans text-[0.8em] tracking-wider text-gray-400">
        {folio}
      </span>
    </div>

    {/* Feature copy, vertically centered in the page */}
    <div className="relative flex min-h-0 flex-1 flex-col items-start justify-center gap-[0.85em]">
      <h3 className="break-words text-[1.45em] font-extrabold leading-[1.08] tracking-tight text-gray-900 min-[380px]:text-[1.7em]">
        {feature.title}
      </h3>
      <span
        className="h-[0.3em] w-[3.2em] rounded-full bg-linear-to-r from-primary to-primary-light"
        aria-hidden="true"
      />
      {/* The first letter is enlarged like the drop cap of a printed book */}
      <p className="leading-[1.55] text-gray-600 first-letter:float-left first-letter:mr-[0.1em] first-letter:text-[2.7em] first-letter:font-black first-letter:leading-[0.85] first-letter:text-primary">
        {feature.description}
      </p>
      {/* Tags are hidden on the narrowest screens to protect the space of the description */}
      <ul className="flex flex-wrap gap-[0.4em] max-[380px]:hidden">
        {feature.highlights.map((highlight) => (
          <li
            key={highlight}
            className="rounded-full border border-primary/25 bg-white/80 px-[0.75em] py-[0.25em] font-sans text-[0.8em] font-semibold text-primary-dark shadow-sm"
          >
            {highlight}
          </li>
        ))}
      </ul>
    </div>

    {/* Bottom row: progress dots and the cue that clicking turns the page */}
    <div className="relative flex items-center justify-between">
      <div className="flex items-center gap-[0.4em]" aria-hidden="true">
        {FEATURES.map((item, dotIndex) => (
          <span
            key={item.id}
            className={`h-[0.5em] rounded-full transition-all ${
              dotIndex === index
                ? "w-[1.7em] bg-primary"
                : "w-[0.5em] bg-primary/25"
            }`}
          />
        ))}
      </div>
      <span
        className="flex items-center gap-[0.5em] font-sans text-[0.8em] font-semibold text-primary-dark"
        aria-hidden="true"
      >
        Next
        <span className="relative flex size-[2.6em] items-center justify-center rounded-full bg-linear-to-br from-primary to-primary-dark text-[1.05em] text-white shadow-md shadow-primary/30">
          <span className="zyron-book__pulse absolute inset-0 rounded-full bg-primary/40" />
          <AiOutlineArrowRight className="relative" />
        </span>
      </span>
    </div>
  </div>
);

// Left page of the last spread: recap of the three benefits and the call-to-action
const ClosingPage = ({ folio }) => (
  <div className="zyron-book__pad zyron-book__type relative flex h-full select-none flex-col font-serif text-gray-700">
    {/* Decorative glows in the corners of the page */}
    <div className="pointer-events-none absolute -right-[22cqw] -top-[22cqw] size-[70cqw] rounded-full bg-primary/15 blur-2xl" />
    <div className="pointer-events-none absolute -bottom-[26cqw] -left-[26cqw] size-[76cqw] rounded-full bg-primary-100/80 blur-2xl" />
    <div className="pointer-events-none absolute -right-[30cqw] -top-[30cqw] size-[90cqw] rounded-full border border-primary/15" />

    {/* Page number, placed in the corner so it does not take space from the content */}
    <span className="absolute left-[7cqw] top-[5cqw] font-sans text-[0.8em] tracking-wider text-gray-400">
      {folio}
    </span>

    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[0.85em] text-center">
      {/* Icon badge with a soft pulsing ring */}
      <div className="relative">
        <span
          className="zyron-book__pulse absolute inset-0 rounded-full bg-primary/40"
          aria-hidden="true"
        />
        <div className="relative flex size-[2.8em] items-center justify-center rounded-full bg-linear-to-br from-primary-light to-primary-dark text-[1.3em] text-white shadow-lg shadow-primary/40 ring-[0.22em] ring-white">
          <BsBagCheckFill aria-hidden="true" />
        </div>
      </div>

      <span className="font-sans text-[0.78em] font-bold uppercase tracking-[0.2em] text-primary">
        Your turn
      </span>

      <h3 className="break-words text-[1.4em] font-extrabold leading-[1.1] tracking-tight text-gray-900 min-[380px]:text-[1.6em]">
        Ready when{" "}
        <span className="bg-linear-to-r from-primary to-primary-dark bg-clip-text text-transparent">
          you are
        </span>
      </h3>

      {/* Recap of the three benefits */}
      <ul className="flex flex-col gap-[0.5em] text-left font-sans text-[0.85em] font-medium text-gray-600">
        {BENEFIT_RECAP.map((benefit) => (
          <li key={benefit} className="flex items-center gap-[0.6em]">
            <BsCheckCircleFill
              className="shrink-0 text-primary"
              aria-hidden="true"
            />
            {benefit}
          </li>
        ))}
      </ul>

      {/* Call-to-action with a light sweep */}
      <Link
        to={ROUTES.PRODUCTS}
        onClick={(event) => event.stopPropagation()} // Keeps the click from turning the page
        className="group relative mt-[0.3em] inline-flex items-center gap-[0.6em] overflow-hidden rounded-full bg-linear-to-br from-primary to-primary-dark px-[1.5em] py-[0.8em] font-sans text-[0.9em] font-semibold text-white shadow-lg shadow-primary/40 transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span
          className="zyron-book__sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/30"
          aria-hidden="true"
        />
        <span className="relative">Start Shopping</span>
        <AiOutlineArrowRight
          className="relative transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden="true"
        />
      </Link>
    </div>
  </div>
);

// ============================================================
// BOOK CONTENT
// Spread 1 shows feature 1 (photo on the inside cover, text on sheet 1).
// Every following spread pairs the photo on the back of the previous
// sheet with the text on the front of the next one. The back of the
// last sheet holds the closing invitation.
// ============================================================
const BOOK_PAGES = FEATURES.map((feature, index) => {
  const nextFeature = FEATURES[index + 1]; // Feature whose photo is printed on the back of this sheet, if any

  return {
    id: feature.id,
    front: (
      <FeatureTextPage feature={feature} index={index} folio={index * 2 + 1} />
    ),
    back: nextFeature ? (
      <FeaturePhotoPage
        feature={nextFeature}
        index={index + 1}
        folio={(index + 1) * 2}
      />
    ) : (
      <ClosingPage folio={TOTAL_FEATURES * 2} />
    ),
  };
});

// Inside of the front cover: the photo of the first feature
const COVER_INNER = <FeaturePhotoPage feature={FEATURES[0]} index={0} />;

// Emblem printed on the front cover
const COVER_EMBLEM = (
  <div className="flex size-[13cqw] items-center justify-center rounded-[3.5cqw] border border-white/40 bg-white/10 font-serif text-[7cqw] font-bold leading-none text-white backdrop-blur-sm">
    Z
  </div>
);

const WhyZyron = () => {
  return (
    // Section with a soft gradient backdrop; horizontal overflow is clipped so the 3D motion can never cause sideways scrolling
    <section className="relative overflow-x-clip bg-linear-to-b from-gray-50 via-primary-50/40 to-gray-50 pb-1 pt-4 sm:pb-2 sm:pt-6">
      {/* Fireworks fill the whole section behind the content and never receive clicks */}
      <FireworksBackground
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        canvasClassName="opacity-90"
        population={0.6}
        color={FIREWORK_COLORS}
        fireworkSize={FIREWORK_SIZE}
        particleSize={FIREWORK_PARTICLE_SIZE}
      />

      {/* Small side padding on phones gives the two-page spread as much width as possible; it sits above the fireworks */}
      <Container className="relative z-10 px-2 sm:px-6 lg:px-8">
        {/* ============ SECTION HEADER ============ */}
        <SectionHeading
          title="Why Choose"
          highlight="Zyron"
          subtitle="Built different. Designed for the modern shopper."
          className="mb-2 px-2 sm:mb-3"
        />

        {/* ============ INTERACTIVE BOOK ============ */}
        <InteractiveBook
          title="The Zyron Promise"
          subtitle="Three reasons to shop with us"
          coverEmblem={COVER_EMBLEM}
          coverInner={COVER_INNER}
          pages={BOOK_PAGES}
          endTitle="Thank you for reading"
          endSubtitle="Your next favorite find is just one click away."
          restartLabel="Read Again"
        />
      </Container>
    </section>
  );
};

export default WhyZyron; // Rendered by the Home page
