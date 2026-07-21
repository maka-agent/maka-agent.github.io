/* Site behavior entry: loader → telemetry, navigation, reveal, cursor. */

import { initCursor } from "./site/cursor";
import { initLoader } from "./site/loader";
import { initNavigation } from "./site/navigation";
import { initReveal } from "./site/reveal";
import { initTelemetry } from "./site/telemetry";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

initLoader(reduceMotion);
initTelemetry(reduceMotion);
initNavigation(reduceMotion);
initReveal(reduceMotion);
initCursor(reduceMotion);
