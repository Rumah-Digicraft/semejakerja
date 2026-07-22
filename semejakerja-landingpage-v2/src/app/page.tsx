import type { Metadata } from "next";
import HeroSection from "./components/HeroSection";
import StorySection from "./components/StorySection";
import GrowthStats from "./components/GrowthStats";
import WfcEvents from "./components/WfcEvents";
import CafeGrid from "./components/CafeGrid";
import PartnershipSection from "./components/PartnershipSection";
import ActivitiesGrid from "./components/ActivitiesGrid";
import FaqSection from "./components/FaqSection";
import CTASection from "./components/CTASection";
import JsonLd from "./components/JsonLd";
import { faqPageSchema } from "@/lib/schema";
import { homeFaqs } from "@/lib/faq";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <JsonLd data={faqPageSchema(homeFaqs)} />
      <HeroSection />
      <WfcEvents />
      <StorySection />
      <GrowthStats />
      <CafeGrid />
      <PartnershipSection />
      <ActivitiesGrid />
      <FaqSection />
      <CTASection />
    </>
  );
}
