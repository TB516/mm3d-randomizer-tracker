/**
 * Turns an unexpected error into text the page can show.
 *
 * @param defect - Whatever was thrown.
 * @returns The error's message, or the value as text if it isn't an `Error`.
 */
export const describeDefect = (defect: unknown) =>
  defect instanceof Error ? defect.message : String(defect);
