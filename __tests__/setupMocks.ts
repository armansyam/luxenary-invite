import { vi } from "vitest";

// Menyimpan atau menerbitkan tema builder mengantrekan thumbnail dan menyalakan worker Chrome; di tes antrean cukup
// dicatat. Tes antrean sendiri memakai implementasi asli lewat vi.importActual.
vi.mock("@/lib/themeThumbnailJob", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requestThemeThumbnails: vi.fn(),
}));
