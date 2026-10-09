import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  pickOrganization,
  rememberedOrganization,
  rememberedProject,
  rememberOrganization,
  rememberStart,
} from "./organization";

const store = vi.hoisted(() => new Map<string, string>());
vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => store.get(key),
    setItem: async (key: string, value: string) => void store.set(key, value),
    removeItem: async (key: string) => void store.delete(key),
  },
}));

const harbor = { id: "org-harbor", name: "Harbor Consulting" };
const northwind = { id: "org-northwind", name: "Northwind Studio" };
const website = { id: "project-website" };
const mobile = { id: "project-mobile" };

beforeEach(() => store.clear());

describe("the organization", () => {
  test("falls back to the first by name without a remembered one", async () => {
    expect(await rememberedOrganization([harbor, northwind])).toBe(harbor);
  });

  test("is the remembered one while the user belongs to it", async () => {
    await rememberOrganization(northwind.id);
    expect(await rememberedOrganization([harbor, northwind])).toBe(northwind);
  });

  test("falls back to the first when the user has left the remembered one", async () => {
    await rememberOrganization("org-left");
    expect(await rememberedOrganization([harbor, northwind])).toBe(harbor);
  });

  test("is undefined without organizations", () => {
    expect(pickOrganization([], harbor.id)).toBeUndefined();
  });
});

describe("the project", () => {
  test("is the last started timer's", async () => {
    await rememberStart(northwind.id, website.id);
    expect(await rememberedOrganization([harbor, northwind])).toBe(northwind);
    expect(await rememberedProject(northwind.id, [mobile, website])).toBe(website);
  });

  test("is cleared when the organization changes", async () => {
    await rememberStart(northwind.id, website.id);
    await rememberOrganization(harbor.id);
    await rememberOrganization(northwind.id);
    expect(await rememberedProject(northwind.id, [website])).toBeUndefined();
  });

  test("stays when the same organization is chosen again", async () => {
    await rememberStart(northwind.id, website.id);
    await rememberOrganization(northwind.id);
    expect(await rememberedProject(northwind.id, [website])).toBe(website);
  });

  test("is cleared by a timer started without one", async () => {
    await rememberStart(northwind.id, website.id);
    await rememberStart(northwind.id, null);
    expect(await rememberedProject(northwind.id, [website])).toBeUndefined();
  });

  test("belongs only to its organization", async () => {
    await rememberStart(northwind.id, website.id);
    expect(await rememberedProject(harbor.id, [website])).toBeUndefined();
  });

  test("falls back to none when the organization no longer lists it", async () => {
    await rememberStart(northwind.id, website.id);
    expect(await rememberedProject(northwind.id, [mobile])).toBeUndefined();
  });
});
