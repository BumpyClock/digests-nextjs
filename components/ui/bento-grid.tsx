import { ArrowRightIcon } from "lucide-react";
import { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BentoGrid = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <div className={cn("grid w-full auto-rows-[22rem] grid-cols-3 gap-4", className)}>
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string;
  className: string;
  background: ReactNode;
  Icon: ComponentType<{ className?: string }>;
  description: string;
  href: string;
  cta: string;
}) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex transform-gpu flex-col justify-between overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-md",
      className
    )}
  >
    <div>{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-[transform,opacity] duration-slow ease-standard group-hover:-translate-y-10">
      <Icon className="h-12 w-12 origin-left transform-gpu text-primary-content/80 transition-transform duration-slow ease-standard group-hover:scale-75" />
      <h3 className="text-title-large text-primary-content">{name}</h3>
      <p className="max-w-lg text-secondary-content">{description}</p>
    </div>

    <div
      className={cn(
        "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-[transform,opacity] duration-slow ease-standard group-hover:translate-y-0 group-hover:opacity-100"
      )}
    >
      <Button variant="ghost" asChild size="sm" className="pointer-events-auto">
        <a href={href}>
          {cta}
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </a>
      </Button>
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-colors duration-slow ease-standard group-hover:bg-foreground/5" />
  </div>
);

export { BentoCard, BentoGrid };
