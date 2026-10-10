// A stand-in for @raycast/api in tests (vitest.config.mts aliases it), so the commands render
// outside Raycast. Components draw plain HTML that Testing Library can query: a list row is a
// `listitem` named by its title, an action a `button`, a form field a control named by its
// title. Everything the extension tells Raycast to do (HUDs, toasts, launches, opened URLs) is
// recorded in `raycast` for the tests to read.

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

type Props = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface RecordedToast {
  style: string;
  title: string;
  message?: string;
  primaryAction?: { title: string; onAction: () => void };
  hidden: boolean;
  hide(): Promise<void>;
  show(): Promise<void>;
}

// What the extension did, and the state Raycast keeps for it. `resetRaycast` starts it over.
export const raycast = {
  preferences: {} as Record<string, unknown>,
  huds: [] as string[],
  toasts: [] as RecordedToast[],
  launched: [] as { name: string; type: string; context?: unknown }[],
  opened: [] as string[],
  copied: [] as string[],
  preferencesOpened: 0,
  // Whether a HUD closed the window, as `popToRootType: Immediate` does.
  closed: false,
  localStorage: new Map<string, string>(),
  cache: new Map<string, string>(),
  // What the actions run so far returned, for `runAction` to wait on.
  running: [] as unknown[],
  // Set by `renderCommand`: shows a pushed view.
  push: ((view: ReactElement) => void view) as (view: ReactElement) => void,
};

export const environment = {
  commandName: "",
  commandMode: "view" as "view" | "no-view" | "menu-bar",
  launchType: "userInitiated",
  appearance: "dark",
  extensionName: "snowtime",
  isDevelopment: false,
  supportPath: "/tmp/snowtime-test-support",
  assetsPath: "/tmp/snowtime-test-assets",
  raycastVersion: "1.100.0",
  textSize: "medium",
  theme: "dark",
};

export function resetRaycast(preferences: Record<string, unknown> = {}) {
  raycast.preferences = preferences;
  raycast.huds = [];
  raycast.toasts = [];
  raycast.launched = [];
  raycast.opened = [];
  raycast.copied = [];
  raycast.preferencesOpened = 0;
  raycast.closed = false;
  raycast.running = [];
  raycast.localStorage.clear();
  raycast.cache.clear();
  Object.assign(environment, { commandName: "", commandMode: "view", launchType: "userInitiated" });
}

// Enums and names. Icons and colors are their names, which is all a test needs.
const names = new Proxy({}, { get: (_, name) => name }) as Record<string, string>;
export const Icon = names;
export const Color = names;
export const Image = {};
export const LaunchType = { UserInitiated: "userInitiated", Background: "background" };
export const PopToRootType = { Default: "default", Immediate: "immediate", Suspended: "suspended" };
export const Keyboard = {
  Shortcut: {
    Common: {
      New: { modifiers: ["cmd"], key: "n" },
      Save: { modifiers: ["cmd"], key: "s" },
      Open: { modifiers: ["cmd"], key: "o" },
      Refresh: { modifiers: ["cmd"], key: "r" },
      Edit: { modifiers: ["cmd"], key: "e" },
      Copy: { modifiers: ["cmd", "shift"], key: "c" },
      Remove: { modifiers: ["ctrl"], key: "x" },
    },
  },
};
export const Toast = { Style: { Animated: "ANIMATED", Success: "SUCCESS", Failure: "FAILURE" } };

export function getPreferenceValues() {
  return raycast.preferences;
}

export async function showHUD(title: string, options?: { popToRootType?: string }) {
  raycast.huds.push(title);
  if (options?.popToRootType === PopToRootType.Immediate) raycast.closed = true;
}

export async function showToast(options: Partial<RecordedToast>) {
  const toast: RecordedToast = {
    style: options.style ?? Toast.Style.Success,
    title: options.title ?? "",
    message: options.message,
    primaryAction: options.primaryAction,
    hidden: false,
    async hide() {
      toast.hidden = true;
    },
    async show() {
      toast.hidden = false;
    },
  };
  raycast.toasts.push(toast);
  return toast;
}

export async function open(url: string) {
  raycast.opened.push(url);
}

export async function openExtensionPreferences() {
  raycast.preferencesOpened += 1;
}

export async function launchCommand(options: { name: string; type: string; context?: unknown }) {
  raycast.launched.push(options);
}

export const Clipboard = {
  async copy(content: string) {
    raycast.copied.push(content);
  },
};

export const LocalStorage = {
  async getItem(key: string) {
    return raycast.localStorage.get(key);
  },
  async setItem(key: string, value: string | number | boolean) {
    raycast.localStorage.set(key, String(value));
  },
  async removeItem(key: string) {
    raycast.localStorage.delete(key);
  },
  async allItems() {
    return Object.fromEntries(raycast.localStorage);
  },
  async clear() {
    raycast.localStorage.clear();
  },
};

// Caches share one store, with a namespace's keys prefixed as `<namespace>/<key>`, so the
// extension's own Cache, which has none, keeps plain keys. Methods are bound, since
// @raycast/utils passes `subscribe` on its own.
export class Cache {
  private listeners = new Set<(key: string | undefined, data: string | undefined) => void>();
  private prefix: string;
  constructor(options?: { namespace?: string }) {
    this.prefix = options?.namespace ? `${options.namespace}/` : "";
  }
  get = (key: string) => raycast.cache.get(this.prefix + key);
  has = (key: string) => raycast.cache.has(this.prefix + key);
  get isEmpty() {
    return ![...raycast.cache.keys()].some((key) => key.startsWith(this.prefix));
  }
  set = (key: string, data: string) => {
    raycast.cache.set(this.prefix + key, data);
    this.listeners.forEach((listener) => listener(key, data));
  };
  remove = (key: string) => {
    const had = raycast.cache.delete(this.prefix + key);
    this.listeners.forEach((listener) => listener(key, undefined));
    return had;
  };
  clear = () => {
    for (const key of [...raycast.cache.keys()]) if (key.startsWith(this.prefix)) raycast.cache.delete(key);
    this.listeners.forEach((listener) => listener(undefined, undefined));
  };
  subscribe = (listener: (key: string | undefined, data: string | undefined) => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };
}

export const AI = { ask: async () => "" };
export const OAuth = {};

// Actions: buttons named by their title, with the shortcut in `data-shortcut`.

function shortcutOf(shortcut?: { modifiers: string[]; key: string }) {
  return shortcut ? [...shortcut.modifiers, shortcut.key].join("+") : undefined;
}

function ActionButton({ title, shortcut, onClick }: { title: string; shortcut?: Props; onClick: () => unknown }) {
  return (
    <button type="button" data-shortcut={shortcutOf(shortcut as never)} onClick={() => raycast.running.push(onClick())}>
      {title}
    </button>
  );
}

export function Action({ title, shortcut, onAction }: Props) {
  return <ActionButton title={title} shortcut={shortcut} onClick={() => onAction?.()} />;
}
Action.Push = function Push({ title, shortcut, target }: Props) {
  return <ActionButton title={title} shortcut={shortcut} onClick={() => raycast.push(target)} />;
};
Action.CopyToClipboard = function CopyToClipboard({ title = "Copy to Clipboard", shortcut, content }: Props) {
  return <ActionButton title={title} shortcut={shortcut} onClick={() => raycast.copied.push(String(content))} />;
};
Action.OpenInBrowser = function OpenInBrowser({ title = "Open in Browser", shortcut, url }: Props) {
  return <ActionButton title={title} shortcut={shortcut} onClick={() => raycast.opened.push(url)} />;
};
Action.SubmitForm = function SubmitForm({ title = "Submit", shortcut, onSubmit }: Props) {
  const form = useContext(FormContext);
  return <ActionButton title={title} shortcut={shortcut} onClick={() => onSubmit?.({ ...form.values })} />;
};

export function ActionPanel({ children }: Props) {
  return <>{children}</>;
}
ActionPanel.Section = function Section({ title, children }: Props) {
  return (
    <div role="group" aria-label={title}>
      {children}
    </div>
  );
};

function Actions({ actions }: { actions?: ReactNode }) {
  if (!actions) return null;
  return (
    <div role="group" aria-label="Actions">
      {actions}
    </div>
  );
}

// List. Raycast shows the empty view only when the list has no rows, so rows count
// themselves.

const ListContext = createContext({ rows: 0, add: () => () => {} });

export function List({
  children,
  searchBarPlaceholder,
  searchText,
  onSearchTextChange,
  isLoading,
  searchBarAccessory,
}: Props) {
  const [rows, setRows] = useState(0);
  const add = useCallback(() => {
    setRows((n) => n + 1);
    return () => setRows((n) => n - 1);
  }, []);
  return (
    <div data-view="list" aria-busy={!!isLoading}>
      <input
        role="searchbox"
        aria-label="Search"
        placeholder={searchBarPlaceholder}
        // Controlled when the command sets `searchText`, as Raycast's search bar is.
        {...(searchText === undefined ? {} : { value: searchText })}
        onChange={(event) => onSearchTextChange?.(event.target.value)}
      />
      {searchBarAccessory}
      <ListContext.Provider value={{ rows, add }}>
        <ul>{children}</ul>
      </ListContext.Provider>
    </div>
  );
}
List.Section = function Section({ title, subtitle, children }: Props) {
  return (
    <li role="group" aria-label={title ?? "Untitled section"} data-subtitle={subtitle}>
      <ul>{children}</ul>
    </li>
  );
};
List.Item = function Item({ title, subtitle, accessories, actions }: Props) {
  const list = useContext(ListContext);
  useLayoutEffect(() => list.add(), [list.add]);
  const accessoryTexts = (accessories ?? []).map((a: Props) =>
    typeof a.tag === "string" ? a.tag : (a.tag?.value ?? a.text),
  );
  return (
    <li aria-label={title} data-subtitle={subtitle} data-accessories={accessoryTexts.join(" | ")}>
      {title}
      <Actions actions={actions} />
    </li>
  );
};
List.EmptyView = function EmptyView({ title, description, actions }: Props) {
  const list = useContext(ListContext);
  if (list.rows > 0) return null;
  return (
    <li role="status" aria-label={title} data-description={description}>
      {title}
      <Actions actions={actions} />
    </li>
  );
};
function ListDropdown({ tooltip, value, onChange, children }: Props) {
  return (
    <select aria-label={tooltip} value={value} onChange={(event) => onChange?.(event.target.value)}>
      {children}
    </select>
  );
}
ListDropdown.Item = function DropdownItem({ value, title }: Props) {
  return <option value={value}>{title}</option>;
};
List.Dropdown = ListDropdown;

// Form. Fields report their values, so Submit hands the form's values to `onSubmit` as
// Raycast does.

const FormContext = createContext<{ values: Record<string, unknown> }>({ values: {} });

export function Form({ children, actions, isLoading, navigationTitle }: Props) {
  const values = useRef<Record<string, unknown>>({});
  return (
    <FormContext.Provider value={{ values: values.current }}>
      <div role="form" aria-label={navigationTitle} aria-busy={!!isLoading}>
        {children}
        <Actions actions={actions} />
      </div>
    </FormContext.Provider>
  );
}

function useFieldValue(id: string | undefined, value: unknown) {
  const form = useContext(FormContext);
  if (id) form.values[id] = value;
}

function FieldError({ error }: { error?: string }) {
  return error ? <span role="alert">{error}</span> : null;
}

Form.TextField = function TextField({ id, title, value, placeholder, onChange, error, autoFocus }: Props) {
  useFieldValue(id, value ?? "");
  return (
    <>
      <input
        aria-label={title}
        placeholder={placeholder}
        value={value ?? ""}
        data-autofocus={autoFocus ? "true" : undefined}
        onChange={(event) => onChange?.(event.target.value)}
      />
      <FieldError error={error} />
    </>
  );
};
function FormDropdown({ id, title, value, onChange, children, error }: Props) {
  useFieldValue(id, value);
  return (
    <>
      <select aria-label={title} value={value ?? ""} onChange={(event) => onChange?.(event.target.value)}>
        {children}
      </select>
      <FieldError error={error} />
    </>
  );
}
FormDropdown.Item = function DropdownItem({ value, title }: Props) {
  return <option value={value}>{title}</option>;
};
Form.Dropdown = FormDropdown;
Form.Separator = function Separator() {
  return <hr />;
};
Form.Description = function Description({ text }: Props) {
  return <p>{text}</p>;
};

// The menu bar: its title in `data-title`, and its items as buttons, or text when they have
// no action.

export function MenuBarExtra({ title, tooltip, isLoading, children }: Props) {
  return (
    <div data-view="menu-bar" data-title={title ?? ""} title={tooltip} aria-busy={!!isLoading}>
      {children}
    </div>
  );
}
MenuBarExtra.Section = function Section({ title, children }: Props) {
  return (
    <div role="group" aria-label={title ?? "Untitled section"}>
      {children}
    </div>
  );
};
MenuBarExtra.Item = function Item({ title, subtitle, shortcut, onAction }: Props) {
  if (!onAction) return <p data-subtitle={subtitle}>{title}</p>;
  return (
    <button
      type="button"
      data-subtitle={subtitle}
      data-shortcut={shortcutOf(shortcut)}
      onClick={() => raycast.running.push(onAction())}
    >
      {title}
    </button>
  );
};
