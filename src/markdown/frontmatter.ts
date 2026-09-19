import { parse as parseYaml } from "yaml";
import { z } from "zod";

export const FrontmatterSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    date: z.union([z.string(), z.date()]).optional(),
  })
  .passthrough();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

export function parseFrontmatter(raw: unknown): { data: Frontmatter; errors: string[] } {
  try {
    const data = typeof raw === "string" ? parseYaml(raw) : raw;
    const parsed = FrontmatterSchema.safeParse(data ?? {});
    if (!parsed.success) {
      return { data: {}, errors: parsed.error.issues.map((i) => i.message) };
    }
    return { data: parsed.data, errors: [] };
  } catch (e) {
    return { data: {}, errors: [e instanceof Error ? e.message : "YAML inválido"] };
  }
}
