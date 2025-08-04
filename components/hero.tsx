"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Mockup, MockupFrame } from "@/components/ui/mockup";
import { LucideArrowRight } from "lucide-react";

interface HeroProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
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
  (
    {
      className,
      title,
      subtitle,
      eyebrow,
      ctaText,
      ctaLink,
      mockupImage,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center ", className)}
        {...props}
      >
        {eyebrow && (
          <p className="font-instrument-sans uppercase tracking-[0.51em] leading-[133%] text-center text-[19px] mt-48 mb-8 text-primary animate-appear opacity-0">
            {eyebrow}
          </p>
        )}

        <h1 className="text-[48px] lg:text-[64px] md:text-[56px] sm:text-[48px] xs:text-[40px] leading-[83px] text-center px-4 lg:px-[314px] text-primary animate-appear opacity-0 delay-100">
          {title}
        </h1>

        {subtitle && (
          <p className="text-[28px] text-center font-instrument-sans font-light px-4 lg:px-[314px] mt-[25px] mb-[48px] leading-[133%] text-primary  animate-appear opacity-0 delay-300">
            {subtitle}
          </p>
        )}

        {ctaText && ctaLink && (
          <Link href={ctaLink}>
            <div className="inline-flex items-center bg-secondary text-primary rounded-[10px] group hover:bg-secondary/90 transition-colors font-instrument-sans w-[227px] h-[49px] animate-appear opacity-0 delay-500">
              <div className="flex items-center justify-between w-fill pl-[22px] pr-[17px]">
                <span className="text-[19px]">{ctaText}</span>
                <div className="flex items-center gap-[14px]">
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
              className="absolute bottom-0 left-0 right-0 w-full h-[303px] rounded-2xl"
              style={{
                background:
                  "linear-gradient(to top, #DCD5C1 0%, rgba(217, 217, 217, 0) 100%)",
                zIndex: 10,
              }}
            />
          </div>
        )}
      </div>
    );
  },
);
Hero.displayName = "Hero";

export { Hero };
