// Put this near the top of each component file, outside the variants
import type { Transition } from "framer-motion";

export const SPRING: Transition = {
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1] as Transition["ease"],
};