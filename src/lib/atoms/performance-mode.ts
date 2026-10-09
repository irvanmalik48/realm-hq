import { atomWithStorage } from "jotai/utils";

export const performanceModeAtom = atomWithStorage<boolean>(
  "performanceMode",
  false,
);

export default performanceModeAtom;
