/**
 * Animation utilities for micro-interactions and hover effects
 */

import { cn } from "@/lib/utils";

/**
 * Animation class names for common effects
 */
export const animations = {
  // Slide animations
  slideInFromLeft: "animate-in slide-in-from-left-4 duration-300",
  slideInFromRight: "animate-in slide-in-from-right-4 duration-300",
  slideInFromTop: "animate-in slide-in-from-top-4 duration-300",
  slideInFromBottom: "animate-in slide-in-from-bottom-4 duration-300",
  
  // Fade animations
  fadeIn: "animate-in fade-in-0 duration-200",
  fadeOut: "animate-out fade-out-0 duration-200",
  
  // Scale animations
  scaleIn: "animate-in zoom-in-95 duration-200",
  scaleOut: "animate-out zoom-out-95 duration-200",
  
  // Pulse animations
  pulse: "animate-pulse",
  pulseSlow: "animate-pulse-slow",
  
  // Hover effects
  hoverScale: "transition-transform duration-200 hover:scale-105",
  hoverScaleUp: "transition-transform duration-200 hover:scale-110",
  hoverLift: "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
  
  // Smooth transitions
  smooth: "transition-all duration-200 ease-in-out",
  smoothSlow: "transition-all duration-300 ease-in-out",
};

/**
 * Combine animation classes
 */
export function combineAnimations(...classes: (string | undefined)[]): string {
  return cn(...classes.filter(Boolean));
}

/**
 * Animation variants for different components
 */
export const componentAnimations = {
  alertCard: combineAnimations(
    animations.slideInFromLeft,
    animations.fadeIn,
    animations.hoverLift
  ),
  
  clientTile: combineAnimations(
    animations.fadeIn,
    animations.hoverScale,
    animations.smooth
  ),
  
  button: combineAnimations(
    animations.smooth,
    animations.hoverScale
  ),
  
  statusIndicator: combineAnimations(
    animations.pulseSlow
  ),
  
  modal: combineAnimations(
    animations.fadeIn,
    animations.scaleIn
  ),
  
  drawer: combineAnimations(
    animations.slideInFromRight,
    animations.fadeIn
  ),
};

/**
 * Stagger animation delay for list items
 */
export function getStaggerDelay(index: number, baseDelay: number = 50): string {
  return `animation-delay: ${index * baseDelay}ms`;
}

/**
 * Conditional animation based on state
 */
export function conditionalAnimation(
  condition: boolean,
  animationClass: string,
  fallbackClass?: string
): string {
  return condition ? animationClass : (fallbackClass || "");
}

