import { atomWithStorage } from "jotai/utils";

export const sidebarOpenAtom = atomWithStorage<boolean>(
  "realm_sidebar_open",
  true,
  undefined,
  { getOnInit: true },
);
