import HeroSection from "./components/HeroSection";
import StorySection from "./components/StorySection";
import GrowthStats from "./components/GrowthStats";
import CafeGrid from "./components/CafeGrid";
import ActivitiesGrid from "./components/ActivitiesGrid";
import CTASection from "./components/CTASection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <StorySection />
      <GrowthStats />
      <CafeGrid />
      <ActivitiesGrid />
      <CTASection />
    </>
  );
}
