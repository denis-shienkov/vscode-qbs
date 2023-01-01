export type QbsOk<T> = { success: true; message: T };
export type QbsError<E> = { success: false; message: E };
export type QbsResult<T, E> = QbsOk<T> | QbsError<E>;
export const QbsResult = Object.freeze({
  Ok: <T, E>(message: T): QbsResult<T, E> => ({ success: true, message }),
  Error: <T, E>(message: E): QbsResult<T, E> => ({ success: false, message }),
});
