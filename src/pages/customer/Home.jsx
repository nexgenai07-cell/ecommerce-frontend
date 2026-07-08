import HeroSection from "../../components/home/HeroSection"; // Top banner section (currently a "Coming Soon" placeholder)
import TrendingSection from "../../components/home/TrendingSection"; // Trending products grid with category filter pills
import StatsBar from "../../components/home/StatsBar"; // Static stats row (120k+ users, 4.9/5 rating, etc.)
import CollectionsGrid from "../../components/home/CollectionsGrid"; // Bento-style grid of curated categories
import FlashSaleSection from "../../components/home/FlashSaleSection"; // Dark flash sale section with countdown timer + discounted products
import WhyZyron from "../../components/home/WhyZyron"; // 3 static feature cards explaining platform benefits
import Testimonials from "../../components/home/Testimonials"; // Static customer review cards with star ratings
import NewsletterCTA from "../../components/home/NewsletterCTA"; // Bottom newsletter signup call-to-action section

const Home = () => {
  return (
    // Outer wrapper — flex-col stacks all the sections vertically, one after another
    <div className="flex flex-col">
      {/* Hero section — will be fully completed at the end of the project (currently just a placeholder) */}
      <HeroSection />

      {/* Trending products section — fetches real products from the API */}
      <TrendingSection />

      {/* Stats bar — static numbers like 120k+ users, 4.9/5 rating, etc. */}
      <StatsBar />

      {/* Curated collections shown as a bento grid — fetches real categories from the API */}
      <CollectionsGrid />

      {/* Flash sale section — real discounted products + a live countdown timer */}
      <FlashSaleSection />

      {/* "Why Choose Zyron" feature highlights section */}
      <WhyZyron />

      {/* Customer testimonials/reviews section */}
      <Testimonials />

      {/* Newsletter subscription call-to-action section at the bottom */}
      <NewsletterCTA />
    </div>
  );
};

export default Home;
