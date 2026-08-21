import momentFactory from "moment";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  getLanguage: () => "en",
  moment: momentFactory,
  Plugin: class {
    app: unknown;

    constructor(app: unknown) {
      this.app = app;
    }
  },
  WorkspaceLeaf: class {},
  setTooltip: vi.fn(),
}));

vi.mock("../src/CalendarView", () => ({
  CalendarView: class {
    constructor(readonly leaf: unknown) {}
  },
}));

vi.mock("../src/settings", () => ({
  DEFAULT_SETTINGS: {
    localeOverride: "system-default",
    uiLanguage: "system-default",
    weekStart: "locale",
  },
  CalendarSettingTab: class {},
}));

import { CalendarView } from "../src/CalendarView";
import { VIEW_TYPE_CALENDAR } from "../src/constants";
import CalendarPlugin from "../src/main";

type TestLeaf = {
  view: unknown;
  loadIfDeferred: ReturnType<typeof vi.fn>;
  detach: ReturnType<typeof vi.fn>;
};

type TestWorkspace = {
  getLeavesOfType: ReturnType<typeof vi.fn>;
  ensureSideLeaf: ReturnType<typeof vi.fn>;
};

function createLeaf(view: unknown): TestLeaf {
  return {
    view,
    loadIfDeferred: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn(),
  };
}

function createPlugin(workspace: TestWorkspace): CalendarPlugin {
  return new CalendarPlugin({ workspace } as never, {} as never);
}

function getOrCreateView(plugin: CalendarPlugin): Promise<CalendarView> {
  return (
    plugin as unknown as {
      getOrCreateView(): Promise<CalendarView>;
    }
  ).getOrCreateView();
}

describe("日历侧边栏视图", () => {
  let workspace: TestWorkspace;

  beforeEach(() => {
    workspace = {
      getLeavesOfType: vi.fn(),
      ensureSideLeaf: vi.fn(),
    };
  });

  it("加载并复用 Obsidian 延迟恢复的已有视图", async () => {
    const leaf = createLeaf({ type: "deferred" });
    const view = new CalendarView(leaf as never, {} as never);
    leaf.loadIfDeferred.mockImplementation(() => {
      leaf.view = view;
    });
    workspace.getLeavesOfType.mockReturnValue([leaf]);

    await expect(getOrCreateView(createPlugin(workspace))).resolves.toBe(view);
    expect(leaf.loadIfDeferred).toHaveBeenCalledOnce();
    expect(workspace.ensureSideLeaf).not.toHaveBeenCalled();
  });

  it("清理工作区中历史遗留的重复日历视图", async () => {
    const primary = createLeaf(null);
    primary.view = new CalendarView(primary as never, {} as never);
    const duplicate = createLeaf(
      new CalendarView({} as never, {} as never),
    );
    workspace.getLeavesOfType.mockReturnValue([primary, duplicate]);

    await expect(getOrCreateView(createPlugin(workspace))).resolves.toBe(
      primary.view,
    );
    expect(primary.detach).not.toHaveBeenCalled();
    expect(duplicate.detach).toHaveBeenCalledOnce();
  });

  it("多个入口并发请求时只创建一个右侧栏视图", async () => {
    workspace.getLeavesOfType.mockReturnValue([]);
    let resolveLeaf: ((leaf: TestLeaf) => void) | undefined;
    workspace.ensureSideLeaf.mockReturnValue(
      new Promise<TestLeaf>((resolve) => {
        resolveLeaf = resolve;
      }),
    );
    const plugin = createPlugin(workspace);

    const first = getOrCreateView(plugin);
    const second = getOrCreateView(plugin);
    const leaf = createLeaf(null);
    leaf.view = new CalendarView(leaf as never, {} as never);
    resolveLeaf?.(leaf);

    await expect(Promise.all([first, second])).resolves.toEqual([
      leaf.view,
      leaf.view,
    ]);
    expect(workspace.ensureSideLeaf).toHaveBeenCalledOnce();
    expect(workspace.ensureSideLeaf).toHaveBeenCalledWith(
      VIEW_TYPE_CALENDAR,
      "right",
      { active: true },
    );
  });

  it("初始化失败后允许下一次请求重试", async () => {
    const invalidLeaf = createLeaf({ type: "unexpected" });
    const validLeaf = createLeaf(null);
    validLeaf.view = new CalendarView(validLeaf as never, {} as never);
    workspace.getLeavesOfType.mockReturnValue([]);
    workspace.ensureSideLeaf
      .mockResolvedValueOnce(invalidLeaf)
      .mockResolvedValueOnce(validLeaf);
    const plugin = createPlugin(workspace);

    await expect(getOrCreateView(plugin)).rejects.toThrow(
      "Calendar view failed to initialize",
    );
    await expect(getOrCreateView(plugin)).resolves.toBe(validLeaf.view);
    expect(workspace.ensureSideLeaf).toHaveBeenCalledTimes(2);
  });
});
