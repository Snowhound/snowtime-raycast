import { v7 } from "uuid";

// A new entry's id. The client chooses it, so a retried start can't start a second timer.
export function newEntryId() {
  return v7();
}
