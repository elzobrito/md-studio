/**
 * Diagram export utilities: SVG style inlining, PNG rendering, and file download.
 */

export function embedStylesInSvg(svgString: string): string {
  if (typeof DOMParser === "undefined") return svgString;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return svgString;

    // Ensure <defs> element exists
    let defs = svgEl.querySelector("defs");
    if (!defs) {
      defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
      svgEl.insertBefore(defs, svgEl.firstChild);
    }

    // Collect Mermaid style rules from document
    if (typeof document !== "undefined") {
      const styles = Array.from(document.querySelectorAll("style"))
        .filter(
          (s) =>
            s.id?.includes("mermaid") ||
            s.textContent?.includes(".node") ||
            s.textContent?.includes(".edgePath") ||
            s.textContent?.includes(".cluster"),
        )
        .map((s) => s.textContent)
        .join("\n");

      if (styles) {
        const styleEl = doc.createElementNS("http://www.w3.org/2000/svg", "style");
        styleEl.textContent = styles;
        defs.appendChild(styleEl);
      }
    }

    if (!svgEl.getAttribute("xmlns")) {
      svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    if (!svgEl.getAttribute("xmlns:xlink")) {
      svgEl.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    }

    return new XMLSerializer().serializeToString(svgEl);
  } catch {
    return svgString;
  }
}

export async function mermaidSvgToPng(svg: string): Promise<Blob> {
  const preparedSvg = embedStylesInSvg(svg);
  const img = new Image();
  const svgBlob = new Blob([preparedSvg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg load failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(img.width || 800, 300);
    canvas.height = Math.max(img.height || 600, 200);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context failed");

    // Transparent or solid canvas background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png blob failed"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadSvg(svg: string, fileName: string = "diagram.svg"): void {
  const prepared = embedStylesInSvg(svg);
  const blob = new Blob([prepared], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, fileName);
}

export async function downloadPng(svg: string, fileName: string = "diagram.png"): Promise<void> {
  const blob = await mermaidSvgToPng(svg);
  downloadBlob(blob, fileName);
}
