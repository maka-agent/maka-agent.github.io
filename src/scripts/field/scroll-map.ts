/*
 * Maps real scroll position onto the field's two continuous signals:
 *
 *   theme — 0 sky · 1 paper · 2 night, from each section's data-theme
 *   stage — the section index, for particle choreography
 *
 * Both interpolate across a transition zone around section boundaries so
 * the canvas hands off smoothly while the reader scrolls.
 */

interface SectionInfo {
  top: number;
  theme: number;
  stage: number;
}

export interface ScrollSample {
  theme: number;
  stage: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const smoothstep = (value: number) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};

const themeValueFor = (name: string | undefined): number =>
  name === "night" ? 2 : name === "paper" ? 1 : 0;

export class ScrollMap {
  private sections: SectionInfo[] = [];

  measure(): void {
    this.sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-theme]"),
    )
      .map((element, index) => ({
        top: element.offsetTop,
        theme: themeValueFor(element.dataset.theme),
        stage: index,
      }))
      .sort((a, b) => a.top - b.top);
  }

  sample(): ScrollSample {
    const viewportHeight = window.innerHeight;
    const middle = window.scrollY + viewportHeight * 0.5;
    let theme = 0;
    let stage = 0;

    if (this.sections.length > 0) {
      let index = 0;
      for (let i = 0; i < this.sections.length; i += 1) {
        if (this.sections[i].top <= middle) index = i;
      }
      theme = this.sections[index].theme;
      stage = this.sections[index].stage;

      const next = this.sections[index + 1];
      if (next) {
        const zone = viewportHeight * 0.9;
        const t = smoothstep((middle - (next.top - zone * 0.5)) / zone);
        theme = lerp(theme, next.theme, t);
        stage = lerp(stage, next.stage, t);
      }
    }

    return { theme, stage };
  }
}
