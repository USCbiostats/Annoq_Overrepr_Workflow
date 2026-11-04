import { describe, expect, it } from "vitest";
import versionPy from "../../backend/src/version.py?raw";
import { LATEST_RELEASE, RELEASES } from "./news";

describe("release history", () => {
  it("lists releases newest first with unique versions", () => {
    const dates = RELEASES.map((r) => r.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    const versions = RELEASES.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it("has a valid date and some content in every release", () => {
    for (const release of RELEASES) {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.sections.length).toBeGreaterThan(0);
      for (const section of release.sections) {
        expect(section.items.length).toBeGreaterThan(0);
      }
    }
  });

  it("lists the version set in backend/src/version.py as the latest", () => {
    const match = versionPy.match(/SNPWAY_VERSION\s*=\s*"([^"]+)"/);
    expect(match?.[1]).toBe(LATEST_RELEASE.version);
  });
});
