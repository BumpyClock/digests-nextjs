"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Mockup, MockupFrame } from "@/components/ui/mockup";
import { LucideArrowRight } from "lucide-react";

interface HeroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  subtitle?: string;
  eyebrow?: string;
  ctaText?: string;
  ctaLink?: string;
  mockupImage?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
}

const Hero = React.forwardRef<HTMLDivElement, HeroProps>(
  ({ className, title, subtitle, eyebrow, ctaText, ctaLink, mockupImage, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col items-center ", className)} {...props}>
        {eyebrow && (
          <p className="font-sans uppercase tracking-wider leading-relaxed text-center text-base md:text-lg mt-24 mb-8 text-primary animate-appear opacity-0">
            {eyebrow}
          </p>
        )}

        <h1 className="text-4xl lg:text-6xl md:text-5xl leading-tight text-center px-4 lg:px-24 text-primary animate-appear opacity-0 delay-100">
          {title}
        </h1>

        {subtitle && (
          <p className="text-xl md:text-2xl text-center font-sans font-normal px-4 lg:px-24 mt-6 mb-12 leading-relaxed text-primary animate-appear opacity-0 delay-300">
            {subtitle}
          </p>
        )}

        {ctaText && ctaLink && (
          <Link href={ctaLink}>
            <div className="inline-flex items-center bg-secondary text-primary rounded-lg group hover:bg-secondary/90 transition-token-colors font-sans w-56 h-12 animate-appear opacity-0 delay-500">
              <div className="flex items-center justify-between w-full px-5">
                <span className="text-base">{ctaText}</span>
                <div className="flex items-center gap-3">
                  <div className="w-[36px] h-full relative">
                    <LucideArrowRight className="w-5 h-5 animate-bounce-x" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {mockupImage && (
          <div className="mt-20 w-full relative animate-appear opacity-0 delay-700 ">
            <MockupFrame>
              <Mockup type="responsive">
                <Image
                  src={mockupImage.src}
                  alt={mockupImage.alt}
                  width={mockupImage.width}
                  height={mockupImage.height}
                  priority
                />
              </Mockup>
            </MockupFrame>
            <div
              className="absolute bottom-0 left-0 right-0 z-10 w-full h-72 rounded-2xl"
              style={{
                background:
                  "linear-gradient(to top, hsl(var(--muted)) 0%, hsl(var(--muted) / 0) 100%)",
              }}
            />
          </div>
        )}
      </div>
    );
  }
);
Hero.displayName = "Hero";

export { Hero };
