import HiHat from "./hiHat";
import { equalPower } from "helpers";

export const openHat = (audioCtx, destination, time, { level, decay }) => {
  // parameters
  const outputLevel = equalPower(level);
  const decayValue = decay * 3.6 + 90;
  return HiHat(audioCtx, destination, time, outputLevel, decayValue);
};
