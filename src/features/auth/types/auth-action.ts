export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export type AuthServerAction = (
  previousState: AuthActionState,
  formData: FormData,
) => Promise<AuthActionState>;
