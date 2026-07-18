export type ControllerChangeDecision = {
  hadController: true;
  promptForUpdate: boolean;
};

/** A first controller claim is installation; only replacement is an update. */
export function decideControllerChange(hadController: boolean): ControllerChangeDecision {
  return { hadController: true, promptForUpdate: hadController };
}
