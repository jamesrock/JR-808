import HiHat from "synth/drumModules/hiHat";
import { equalPower } from "helpers";

export const clsdHat = (audioCtx, destination, time, { level }) => {
  // parameters
  const outputLevel = equalPower(level);
  const decay = 50;

  return HiHat(audioCtx, destination, time, outputLevel, decay);
};
