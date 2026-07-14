export type PathfindingFailureCode = "path_not_found" | "cancelled" | "timeout" | "invalid_target";

export type PathfindingResult =
    | {
          ok: true;
          path: { x: number; y: number }[];
      }
    | {
          ok: false;
          code: PathfindingFailureCode;
          message: string;
      };
