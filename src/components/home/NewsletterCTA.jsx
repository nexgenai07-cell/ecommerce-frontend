// ============================================================
// COMMUNITY CTA SECTION
// Static, purely presentational call-to-action — the 94-endpoint API
// documentation has NO newsletter subscription endpoint (confirmed
// across every module), so rather than fake an email form with a
// simulated success message, this is now an honest static section
// with a real, working CTA button that takes the user to browse
// products. No dead/fake inputs.
//
// Rendered as a floating rounded-2xl card with visible margins on
// both sides (not full-bleed edge-to-edge), matching the reference.
// Fully responsive, richly styled gradient + decorative glow.
// ============================================================

import { Link } from "react-router-dom";
import { AiOutlineArrowRight } from "react-icons/ai";
import { HiOutlineSparkles } from "react-icons/hi2";
import { ROUTES } from "../../constants/routes";
import Container from "../layouts/Container";

const NewsletterCTA = () => {
  return (
    <section className="py-14">
      <Container>
        {/* Floating rounded card — margins on left/right come from Container's
            own padding, so the colored background never touches the screen edges */}
        <div className="relative rounded-2xl overflow-hidden bg-linear-to-br from-primary-dark via-primary to-emerald-500 px-6 sm:px-12 py-14 sm:py-16">
          {/* Decorative soft glow shapes — premium, lit-from-within feel */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col items-center gap-6 text-center max-w-xl mx-auto">
            {/* Small badge above the heading */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 border border-white/20 rounded-full text-xs font-semibold text-white uppercase tracking-wider">
              <HiOutlineSparkles className="w-3.5 h-3.5" />
              Join The Movement
            </span>

            <div className="flex flex-col gap-3">
              <h2 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
                Join the Zyron Community
              </h2>
              <p className="text-sm sm:text-base text-white/75 leading-relaxed">
                Curated drops, exclusive deals, and style inspiration —
                delivered straight to your feed. Be part of something different.
              </p>
            </div>

            {/* Real, working CTA — no dead form, no fake submit */}
            <Link
              to={ROUTES.PRODUCTS}
              className="group inline-flex items-center gap-2 px-7 py-3.5 bg-white text-primary text-sm font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
            >
              Start Shopping
              <AiOutlineArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default NewsletterCTA;
