import { AiFillStar } from "react-icons/ai"; // Filled star icon used for the rating display
import Container from "../layouts/Container"; // Wrapper that centers content and applies consistent side padding

// Static list of customer testimonials — no API call needed, this content never changes
const TESTIMONIALS = [
  {
    name: "Sarah Johnson",
    role: "Fashion Enthusiast",
    text: "The curation is so precise, it feels like they know me better than I know myself. Every recommendation has been spot on.",
    rating: 5, // Number of filled stars to display
    initials: "SJ", // Shown inside the avatar circle since there's no profile photo
    color: "bg-primary/10 text-primary", // Avatar circle background + text color
  },
  {
    name: "Michael Chen",
    role: "Tech Professional",
    text: "Finally, an AI that actually understands my aesthetic. I've discovered so many unique pieces I never would have found on my own.",
    rating: 5,
    initials: "MC",
    color: "bg-blue-50 text-blue-600",
  },
  {
    name: "Priya Sharma",
    role: "Interior Designer",
    text: "The delivery was incredibly fast and the product quality exceeded my expectations. Will definitely be a regular customer.",
    rating: 5,
    initials: "PS",
    color: "bg-purple-50 text-purple-600",
  },
];

const Testimonials = () => {
  return (
    // Outer section wrapper — light gray background to visually separate it from surrounding sections
    <section className="py-14 bg-gray-50">
      <Container>
        {/* ============ SECTION HEADER ============ */}
        {/* Centered eyebrow label + main heading + supporting subtitle */}
        <div className="flex flex-col items-center text-center gap-3 mb-4">
          {/* Main section title — scales up from mobile (text-2xl) to desktop (text-4xl) for a bold, responsive look */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Our Stories
          </h2>
          {/* Supporting subtitle text under the heading, width-capped so it doesn't stretch too wide */}
          <p className="text-sm sm:text-base text-gray-500 max-w-md">
            Real experiences from real Zyron shoppers
          </p>
        </div>

        {/* ============ TESTIMONIAL CARDS ============ */}
        <div className="flex flex-col gap-10">
          {/* 1 column on mobile, 3 columns side-by-side from sm breakpoint up */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 px-12">
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.name} // Unique key required by React for list items
                className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col shadow gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300" // Card lifts slightly on hover
              >
                {/* Star rating row */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <AiFillStar
                      key={i} // Index-based key is fine here since this list never reorders
                      className="w-3.5 h-3.5 text-yellow-400"
                    />
                  ))}
                </div>

                {/* Testimonial quote text, italicized and wrapped in quotation marks */}
                <p className="text-sm text-gray-600 leading-relaxed italic flex-1">
                  "{testimonial.text}"
                </p>

                {/* Reviewer identity: avatar initials + name + role, pinned to the bottom of the card */}
                <div className="flex items-center gap-3 mt-auto pt-3 border-t border-gray-50">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${testimonial.color}`}
                  >
                    {testimonial.initials}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Testimonials;
