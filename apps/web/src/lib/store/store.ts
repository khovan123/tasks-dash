import { configureStore } from "@reduxjs/toolkit";
import {
  realtimeReducer,
  type RealtimeRootState,
} from "@/lib/store/realtime-slice";

export function makeStore() {
  return configureStore({
    reducer: {
      realtime: realtimeReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

export type { RealtimeRootState };
