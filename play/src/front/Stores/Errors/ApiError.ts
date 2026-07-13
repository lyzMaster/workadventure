import type { ErrorScreenMessage } from "../ErrorScreenStore";

export type ErrorApiData = ErrorScreenMessage & { status?: number };

export class ApiError extends Error {
    static NAME = "ApiError";

    constructor(public readonly errorApiData: ErrorApiData) {
        super("The API returned an error");
        this.name = ApiError.NAME;
    }
}
