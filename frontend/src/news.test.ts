import { describe, expect, it } from "vitest";
import versionPy from "../../backend/src/version.py?raw";
import { LATEST_RELEASE, RELEASES, newsBarStyle } from "./news";

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

  it("flags a release as beta exactly when its version is a beta", () => {
    for (const release of RELEASES) {
      expect(Boolean(release.beta), release.version).toBe(/-beta\.\d+$/.test(release.version));
    }
  });
});

// This deployment serves TOPMed Freeze 8 (GRCh38/hg38) as a beta, so users must
// be able to tell it apart from the HRC SNPWay at a glance.
describe("TOPMed beta release", () => {
  it("is the latest release, numbered as a beta", () => {
    expect(LATEST_RELEASE.beta).toBe(true);
    expect(LATEST_RELEASE.version).toMatch(/^2\.0\.0-beta\.\d+$/);
  });

  it("says the data is TOPMed on GRCh38/hg38", () => {
    const text = [LATEST_RELEASE.title, ...LATEST_RELEASE.sections.flatMap((s) => s.items)].join(" ");
    expect(text).toMatch(/TOPMed/);
    expect(text).toMatch(/GRCh38\/hg38/);
  });
});

describe("newsBarStyle", () => {
  it("shows a beta release on a light yellow warning banner", () => {
    expect(newsBarStyle({ beta: true })).toEqual({ bgcolor: "#fff3cd", borderColor: "#e9bd30", showBeta: true });
  });

  it("keeps the usual light blue banner for other releases", () => {
    expect(newsBarStyle({})).toEqual({ bgcolor: "#e8eff7", borderColor: "divider", showBeta: false });
  });
});
