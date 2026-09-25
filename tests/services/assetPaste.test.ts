import { describe, expect, it, vi } from "vitest";
import {
  handlePastedImageAsset,
  validateAssetDestination,
  generatePastedAssetName,
} from "../../src/services/assetPaste";

describe("Asset Manager (MD-V03-014)", () => {
  it("rejects path traversal attempts outside assets/", () => {
    expect(validateAssetDestination("../../etc/passwd").valid).toBe(false);
    expect(validateAssetDestination("assets/../../secret.png").valid).toBe(false);
    expect(validateAssetDestination("src/hack.png").valid).toBe(false);
    expect(validateAssetDestination("assets/valid.png").valid).toBe(true);
  });

  it("generates deterministic name under assets/ directory", () => {
    const name = generatePastedAssetName("png");
    expect(name).toMatch(/^assets\/pasted-\d{8}-\d{6}\.png$/);
  });

  it("inserts markdown ref ONLY after successful disk write", async () => {
    const fakeBlob = new Blob(["fake-image-bytes"], { type: "image/png" });
    const writeFn = vi.fn().mockResolvedValue(true);

    const result = await handlePastedImageAsset(fakeBlob, { customFilename: "assets/photo.png" }, writeFn);

    expect(writeFn).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.markdownRef).toBe("![image](assets/photo.png)");
    expect(result.sha256).toBeDefined();
  });

  it("does NOT insert markdown ref if disk write fails", async () => {
    const fakeBlob = new Blob(["fake-image-bytes"], { type: "image/png" });
    const writeFn = vi.fn().mockRejectedValue(new Error("Disk full"));

    const result = await handlePastedImageAsset(fakeBlob, { customFilename: "assets/failed.png" }, writeFn);

    expect(writeFn).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.markdownRef).toBeUndefined();
    expect(result.error).toContain("Disk full");
  });

  it("rejects write and insertion if path fence is violated", async () => {
    const fakeBlob = new Blob(["fake-image-bytes"], { type: "image/png" });
    const writeFn = vi.fn().mockResolvedValue(true);

    const result = await handlePastedImageAsset(
      fakeBlob,
      { customFilename: "../outside.png" },
      writeFn
    );

    expect(writeFn).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.markdownRef).toBeUndefined();
    expect(result.error).toContain("Path fence violation");
  });
});
