import { stopTimer } from "./timer/stop";

// Stop Timer: stops the running timer and confirms with a HUD.
export default async function Command() {
  await stopTimer();
}
