// ============================================================
// TESTIMONIALS SECTION
// Static content — confirmed against the ERD that there is no
// testimonials/reviews table in the backend, so this is fixed
// curated copy rather than an empty/fake API call.
// Fully responsive — 1 column on mobile, 3 columns on larger screens.
// ============================================================

import { AiFillStar } from "react-icons/ai";
import Container from "../layouts/Container";

const TESTIMONIALS = [
  {
    name: "Sarah Johnson",
    role: "Fashion Enthusiast",
    text: "The curation is so precise, it feels like they know me better than I know myself. Every recommendation has been spot on.",
    rating: 5,
    initials: "SJ",
    color: "bg-primary/10 text-primary",
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
    <section className="py-14 bg-gray-50">
      <Container>
        <div className="flex flex-col gap-10">
          <blockquote className="text-center max-w-2xl mx-auto">
            <p className="text-2xl sm:text-2xl font-extrabold text-black italic leading-relaxed">
              "The curation is so precise, it feels like they know me better
              than I know myself."
            </p>
          </blockquote>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 px-12">
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col shadow gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <AiFillStar
                      key={i}
                      className="w-3.5 h-3.5 text-yellow-400"
                    />
                  ))}
                </div>

                <p className="text-sm text-gray-600 leading-relaxed italic flex-1">
                  "{testimonial.text}"
                </p>

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
