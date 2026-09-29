declare module "wavedrom" {
  export const version: string;
  export const waveSkin: Record<string, unknown>;
  export function renderWaveElement(
    index: number,
    source: unknown,
    outputElement: HTMLElement,
    waveSkin: unknown,
    notFirstSignal?: boolean,
  ): void;
  export function renderAny(index: number, source: unknown, outputElement: HTMLElement): void;
  const wavedrom: {
    version: string;
    waveSkin: Record<string, unknown>;
    renderWaveElement(
      index: number,
      source: unknown,
      outputElement: HTMLElement,
      waveSkin: unknown,
      notFirstSignal?: boolean,
    ): void;
    renderAny(index: number, source: unknown, outputElement: HTMLElement): void;
  };
  export default wavedrom;
}
