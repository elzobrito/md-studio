import type { MermaidSlot } from "./epubTypes";

export interface MermaidCaptureSummary {
  totalSlots: number;
  capturedCount: number;
  missingCount: number;
  previewActive: boolean;
  needsPrompt: boolean;
}

export type MermaidPromptAction = "activate_preview" | "continue_fallback" | "cancel";

export interface PromptDecision {
  shouldPrompt: boolean;
  message: string;
}

/**
 * Checks whether the markdown preview pane is currently mounted and visible in the DOM.
 */
export function isPreviewActive(doc?: Document): boolean {
  const targetDoc = doc ?? (typeof document !== "undefined" ? document : undefined);
  if (!targetDoc) return false;

  const preview = targetDoc.querySelector(".preview, .preview-body, [aria-label='Preview']");
  if (!preview) return false;

  // In real browser DOM, also ensure it is not hidden via display:none
  if (typeof window !== "undefined" && preview instanceof HTMLElement) {
    const style = window.getComputedStyle(preview);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
  }

  return true;
}

/**
 * Clean and sanitize a Mermaid SVG string for EPUB 3 packaging:
 * - Strips all <script> tags and on* event handlers (XSS safety).
 * - Ensures viewBox attribute exists based on dimensions if missing.
 * - Normalizes width/height and removes fixed overflowing style constraints.
 * - Embeds relevant CSS rules into <defs><style> so e-readers render colors properly.
 */
export function cleanSvgForEpub(svgString: string, docContext?: Document): string {
  if (!svgString || typeof svgString !== "string") return "";

  const trimmed = svgString.trim();
  if (!trimmed) return "";

  if (typeof DOMParser === "undefined") {
    // Basic regex fallback if DOMParser is unavailable (e.g. pure Node without JSDOM)
    let cleaned = trimmed
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/\son[a-z]+="[^"]*"/gi, "")
      .replace(/\son[a-z]+='[^']*'/gi, "");

    if (!cleaned.includes("viewBox")) {
      const wMatch = /width="(\d+(?:\.\d+)?)(?:px)?"/i.exec(cleaned);
      const hMatch = /height="(\d+(?:\.\d+)?)(?:px)?"/i.exec(cleaned);
      if (wMatch && hMatch) {
        cleaned = cleaned.replace(
          /<svg([^>]*)>/i,
          `<svg$1 viewBox="0 0 ${wMatch[1]} ${hMatch[1]}">`,
        );
      }
    }
    return cleaned;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return trimmed;

    // 1. Remove all <script> elements
    const scripts = svgEl.querySelectorAll("script");
    scripts.forEach((s) => s.remove());

    // 2. Remove all inline event handlers (onclick, onload, etc.) and javascript: hrefs
    const allElements = svgEl.querySelectorAll("*");
    allElements.forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        if (/^on/i.test(attr.name)) {
          el.removeAttribute(attr.name);
        }
        if (
          (attr.name === "href" || attr.name === "xlink:href") &&
          attr.value.trim().toLowerCase().startsWith("javascript:")
        ) {
          el.removeAttribute(attr.name);
        }
      }
    });

    // Also sanitize svgEl root attributes
    for (const attr of Array.from(svgEl.attributes)) {
      if (/^on/i.test(attr.name)) {
        svgEl.removeAttribute(attr.name);
      }
    }

    // 3. Ensure viewBox attribute exists
    const currentViewBox = svgEl.getAttribute("viewBox");
    let widthVal = parseFloat(svgEl.getAttribute("width") || "");
    let heightVal = parseFloat(svgEl.getAttribute("height") || "");

    if (!currentViewBox) {
      if (!isNaN(widthVal) && !isNaN(heightVal) && widthVal > 0 && heightVal > 0) {
        svgEl.setAttribute("viewBox", `0 0 ${widthVal} ${heightVal}`);
      } else {
        svgEl.setAttribute("viewBox", "0 0 800 600");
      }
    }

    // 4. Set responsive attributes for EPUB e-readers
    svgEl.setAttribute("width", "100%");
    svgEl.removeAttribute("height");
    if (svgEl.hasAttribute("style")) {
      // Retain layout styles except fixed max-width constraints that break e-reader viewports
      const style = svgEl.getAttribute("style") || "";
      const cleanedStyle = style
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("max-width"))
        .join("; ");
      if (cleanedStyle) {
        svgEl.setAttribute("style", cleanedStyle);
      } else {
        svgEl.removeAttribute("style");
      }
    }

    // 5. Ensure XML namespaces
    if (!svgEl.getAttribute("xmlns")) {
      svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    if (!svgEl.getAttribute("xmlns:xlink")) {
      svgEl.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    }

    // 6. Inlining styles from host document to preserve node/edge colors
    const hostDoc = docContext ?? (typeof document !== "undefined" ? document : undefined);
    if (hostDoc) {
      let defs = svgEl.querySelector("defs");
      if (!defs) {
        defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
        svgEl.insertBefore(defs, svgEl.firstChild);
      }

      const styles = Array.from(hostDoc.querySelectorAll("style"))
        .filter(
          (s) =>
            s.id?.includes("mermaid") ||
            s.textContent?.includes(".node") ||
            s.textContent?.includes(".edgePath") ||
            s.textContent?.includes(".cluster"),
        )
        .map((s) => s.textContent || "")
        .join("\n");

      if (styles) {
        const styleEl = doc.createElementNS("http://www.w3.org/2000/svg", "style");
        styleEl.textContent = styles;
        defs.appendChild(styleEl);
      }
    }

    return new XMLSerializer().serializeToString(svgEl);
  } catch {
    return trimmed;
  }
}

/**
 * Capture rendered Mermaid SVGs from the DOM and inject them into the corresponding MermaidSlots.
 */
export function captureMermaidSvgsFromDom(
  slots: MermaidSlot[],
  doc?: Document,
): MermaidCaptureSummary {
  const targetDoc = doc ?? (typeof document !== "undefined" ? document : undefined);
  const previewActive = isPreviewActive(targetDoc);

  if (slots.length === 0) {
    return {
      totalSlots: 0,
      capturedCount: 0,
      missingCount: 0,
      previewActive,
      needsPrompt: false,
    };
  }

  if (!targetDoc || !previewActive) {
    return {
      totalSlots: slots.length,
      capturedCount: 0,
      missingCount: slots.length,
      previewActive: false,
      needsPrompt: true,
    };
  }

  // Find all rendered SVGs inside preview
  const containerEls = Array.from(
    targetDoc.querySelectorAll<HTMLElement>(
      ".mermaid-diagram-container, figure.mermaid-chrome, .mermaid-panzoom-target",
    ),
  );

  let captured = 0;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    let foundSvgEl: SVGSVGElement | null = null;

    // Try matching container by data-mermaid-code
    for (const container of containerEls) {
      const code = container.dataset?.mermaidCode || "";
      if (code && code.trim() === slot.source.trim()) {
        foundSvgEl = container.querySelector("svg");
        if (foundSvgEl) break;
      }
    }

    // Fallback: match by DOM position
    if (!foundSvgEl) {
      const allSvgs = Array.from(
        targetDoc.querySelectorAll<SVGSVGElement>(
          ".preview svg[id^='mmd-'], .preview-body svg, figure.mermaid-chrome svg, .mermaid-panzoom-target svg",
        ),
      );
      if (allSvgs[i]) {
        foundSvgEl = allSvgs[i];
      }
    }

    if (foundSvgEl) {
      const rawSvg = new XMLSerializer().serializeToString(foundSvgEl);
      slot.svgContent = cleanSvgForEpub(rawSvg, targetDoc);
      captured++;
    } else {
      slot.svgContent = undefined;
    }
  }

  const missing = slots.length - captured;

  return {
    totalSlots: slots.length,
    capturedCount: captured,
    missingCount: missing,
    previewActive,
    needsPrompt: missing > 0,
  };
}

/**
 * Checks if a user prompt should be displayed before exporting when preview is inactive or diagrams are unrendered.
 */
export function getMermaidPromptDecision(summary: MermaidCaptureSummary): PromptDecision {
  if (summary.totalSlots === 0 || summary.capturedCount === summary.totalSlots) {
    return {
      shouldPrompt: false,
      message: "",
    };
  }

  if (!summary.previewActive) {
    return {
      shouldPrompt: true,
      message:
        "O documento contém diagramas Mermaid, mas a pré-visualização não está ativa. Ative a pré-visualização para exportar os diagramas como imagens ou prossiga para usar o código fonte como fallback no EPUB.",
    };
  }

  return {
    shouldPrompt: true,
    message: `Foram encontrados ${summary.totalSlots} diagramas Mermaid, mas apenas ${summary.capturedCount} foram renderizados na tela. Deseja prosseguir com o fallback de código para os restantes?`,
  };
}
