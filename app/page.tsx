"use client";

import { BookOpenText, Cookie, FileTextIcon, Headphones, Rss } from "lucide-react";
import Script from "next/script";
import { Hero } from "@/components/hero";
import { SmoothScroll } from "@/components/smooth-scroll";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";

const features = [
  {
    Icon: Rss,
    name: "RSS Feeds",
    description: "Subscribe to your favorite websites and blogs with a simple URL.",
    href: "/web",
    cta: "Launch Web App",
    background: <></>,
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
  },
  {
    Icon: Headphones,
    name: "Podcast Support",
    description: "Listen to podcasts with our built-in player that follows you as you browse.",
    href: "/web",
    cta: "Launch Web App",
    background: <></>,
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4",
  },
  {
    Icon: BookOpenText,
    name: "Reader View",
    description: "Enjoy distraction-free reading with our clean reader view for articles.",
    href: "/web",
    cta: "Launch Web App",
    background: <></>,
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-2",
  },
  {
    Icon: Cookie,
    name: "Private by Design",
    description: "No recomendations, no tracking, no ads. Forever. Just you and content you love.",
    href: "/pages/why-digests",
    cta: "Why Digests?",
    background: <></>,
    className: "lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3 ",
  },
  {
    Icon: FileTextIcon,
    name: "Your data is yours",
    description: "Import/Export your subscriptions and take them wherever you go",
    href: "/pages/privacy-policy",
    cta: "Privacy Policy",
    background: <></>,
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-2 lg:row-end-4",
  },
];

export default function Home() {
  return (
    <div id="home-container" className="flex flex-col min-h-screen max-w-7xl mx-auto">
      <SmoothScroll />
      {/* Hero Section */}

      <section id="hero" className="w-full py-1 md:py-0 lg:py-0 bg-transparent">
        <Hero
          eyebrow="Digests"
          className="animate-appear delay-100 bg-transparent"
          title={
            <>
              <div className="w-full lg:whitespace-nowrap md:whitespace-nowrap sm:whitespace-nowrap xs:whitespace-nowrap">
                <span className=" font-normal">Your content, </span>
                <span className=" font-normal italic">your way </span>
                <span className=" font-normal">always</span>
              </div>
              <div className=" font-normal">everywhere.</div>
            </>
          }
          subtitle="Subscribe, manage, and read your favorite RSS feeds and podcasts in one beautiful interface."
          ctaText="Launch Web App"
          ctaLink="/web"
          mockupImage={{
            src: "/assets/Digests-WebApp.png",
            alt: "Digests web app screenshot",
            width: 1274,
            height: 1043,
          }}
        />
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32" id="features">
        <div className="container px-4 md:px-6">
          <BentoGrid className=" lg:grid-rows-3">
            {features.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-display-small md:text-display text-primary-content">
                Available on all your devices
              </h2>
              <p className="max-w-[900px] text-secondary-content text-body md:text-body-large">
                Native Digests apps are on the way for your preferred platform. Windows Alpha is
                available now. More platforms coming soon.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 w-full">
              <div className="w-full">
                <Script
                  type="module"
                  src="https://get.microsoft.com/badge/ms-store-badge.bundled.js"
                  strategy="lazyOnload"
                />
                <ms-store-badge
                  productid="9p8m0cvk7fqq"
                  productname="Digests - RSS & Podcasts"
                  window-mode="full"
                  theme="auto"
                  size="large"
                  language="en-us"
                  animation="on"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
