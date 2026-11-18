export const USER_HANDLE_ERROR = {
  IN_USE: 'HANDLE_IN_USE',
  CHANGE_COOLDOWN: 'HANDLE_CHANGE_COOLDOWN',
  INVALID: 'HANDLE_INVALID',
} as const;

export type UserHandleErrorCode =
  (typeof USER_HANDLE_ERROR)[keyof typeof USER_HANDLE_ERROR];