'use client';

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface CardAnimationProps {
  children: React.ReactNode;
  index: number;
}

export default function CardAnimation({ children, index }: CardAnimationProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = cardRef.current;
    
    if (!element) return;

    // Initial entrance animation
    gsap.set(element, {
      opacity: 0,
      x: 50,
    });

    gsap.to(element, {
      opacity: 1,
      x: 0,
      duration: 0.8,
      delay: index * 0.1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: element,
        start: "top bottom-=100",
        toggleActions: "play none none none",
        once: true,
      },
    });

    // Hover animations
    const card = element.querySelector('.deck-card');
    if (!card) return;

    // Create hover animation timeline (but don't play it yet)
    const hoverTimeline = gsap.timeline({ paused: true })
      .to(card, {
        scale: 1.02,
        boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
        duration: 0.3,
        ease: "power2.out"
      });

    // Add hover event listeners
    element.addEventListener('mouseenter', () => {
      hoverTimeline.play();
    });

    element.addEventListener('mouseleave', () => {
      hoverTimeline.reverse();
    });

    // Cleanup
    return () => {
      const trigger = ScrollTrigger.getById(element.id);
      if (trigger) trigger.kill();
      hoverTimeline.kill();
    };
  }, [index]);

  return (
    <div ref={cardRef} style={{ width: '100%' }}>
      {children}
    </div>
  );
}