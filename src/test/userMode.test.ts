import { describe, it, expect } from "vitest";
import {
  getModeSections,
  STUDENT_SECTIONS,
  PROFESSIONAL_SECTIONS,
  isCategoryInMode,
} from "@/config/userMode";
import categorySummaries from "@/data/categorySummaries.json";

describe("userMode sections configuration", () => {
  it("returns 6 sections for student mode including the 5 readiness pillars and campus & life", () => {
    const studentSections = getModeSections("student");
    expect(studentSections).toHaveLength(6);

    const sectionIds = studentSections.map((s) => s.id);
    expect(sectionIds).toEqual([
      "aptitude",
      "technical",
      "communication",
      "interview",
      "work_readiness",
      "campus_life",
    ]);

    expect(studentSections[0].title).toBe("Aptitude & Reasoning");
    expect(studentSections[0].weightBadge).toBe("20% weightage");

    expect(studentSections[1].title).toBe("Technical Fundamentals");
    expect(studentSections[1].weightBadge).toBe("30% weightage");

    expect(studentSections[2].title).toBe("Communication");
    expect(studentSections[2].weightBadge).toBe("20% weightage");

    expect(studentSections[3].title).toBe("Interview Craft");
    expect(studentSections[3].weightBadge).toBe("20% weightage");

    expect(studentSections[4].title).toBe("Work Readiness");
    expect(studentSections[4].weightBadge).toBe("10% weightage");

    expect(studentSections[5].title).toBe("Campus & Life");
  });

  it("ensures every student category is assigned to exactly one section with zero unassigned or duplicate categories", () => {
    const studentCategories = categorySummaries.filter((c) =>
      isCategoryInMode((c as any).audience, "student")
    );

    const allAssignedIds = STUDENT_SECTIONS.flatMap((s) => s.categoryIds || []);

    // Check no duplicates in configuration
    const uniqueIds = new Set(allAssignedIds);
    expect(uniqueIds.size).toBe(allAssignedIds.length);

    // Check every student category is in the assigned sections
    for (const cat of studentCategories) {
      expect(uniqueIds.has(cat.id)).toBe(true);
    }

    // Check count matches
    expect(allAssignedIds.length).toBe(studentCategories.length);
  });

  it("returns professional sections for professional mode", () => {
    const professionalSections = getModeSections("professional");
    expect(professionalSections).toHaveLength(2);
    expect(professionalSections[0].id).toBe("professional");
    expect(professionalSections[1].id).toBe("personal");
  });
});
