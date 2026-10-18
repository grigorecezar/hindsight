/** Something that went wrong for one company without failing the run. */
export interface RunProblem {
  ticker: string
  step: string
  message: string
}
