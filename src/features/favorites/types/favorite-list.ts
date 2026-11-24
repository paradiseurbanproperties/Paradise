export type FavoriteListActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const EMPTY_FAVORITE_LIST_ACTION_STATE: FavoriteListActionState = {
  status: "idle",
  message: "",
};
