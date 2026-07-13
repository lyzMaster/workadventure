import { readable, writable } from "svelte/store";
import { isAxiosError } from "axios";
import { z } from "zod";

import logoImg from "../Components/images/logo-min-white.png";
import errorGif from "../Components/UI/images/error.gif";
import { ApiError } from "./Errors/ApiError";

export type ErrorScreenMessage = {
    type?: "error" | "retry" | "unauthorized" | "redirect" | "reconnecting";
    code?: string;
    title?: string;
    subtitle?: string;
    details?: string;
    image?: string;
    imageLogo?: string;
    timeToRetry?: number;
    buttonTitle?: string;
    canRetryManual?: boolean;
    urlToRedirect?: string;
};

export type ErrorApiErrorData = ErrorScreenMessage & { type: "error"; status?: number };
export type ErrorApiRetryData = ErrorScreenMessage & { type: "retry"; status?: number };
export type ErrorApiUnauthorizedData = ErrorScreenMessage & { type: "unauthorized"; status?: number };

const ErrorApiBaseData = z.object({
    status: z.number().optional(),
    code: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    details: z.string().optional(),
    image: z.string().optional(),
    imageLogo: z.string().optional(),
    timeToRetry: z.number().optional(),
    buttonTitle: z.string().optional().nullable(),
    canRetryManual: z.boolean().optional(),
    urlToRedirect: z.string().optional(),
});

const isErrorApiErrorData = ErrorApiBaseData.extend({ type: z.literal("error") });
const isErrorApiRetryData = ErrorApiBaseData.extend({ type: z.literal("retry") });
const isErrorApiUnauthorizedData = ErrorApiBaseData.extend({ type: z.literal("unauthorized") });

export function createErrorScreenMessage(message: ErrorScreenMessage): ErrorScreenMessage {
    return message;
}

const errorLogo = new Image();
errorLogo.src = logoImg;
export const errorLogoStore = readable<HTMLImageElement>(errorLogo);

const errorImage = new Image();
errorImage.src = errorGif;
export const errorImageStore = readable<HTMLImageElement>(errorImage);

/**
 * A store that contains one error of type WAError to be displayed.
 */
function createErrorScreenStore() {
    const { subscribe, set } = writable<ErrorScreenMessage | undefined>(undefined);

    return {
        subscribe,
        setError: (e: ErrorScreenMessage): void => {
            set(e);
        },
        setErrorFromApi: (e: ErrorApiErrorData | ErrorApiRetryData | ErrorApiUnauthorizedData): void => {
            const errorApiErrorData = isErrorApiErrorData.safeParse(e);
            if (errorApiErrorData.success) {
                const error = errorApiErrorData.data;

                set({
                    type: "error",
                    code: error.code,
                    title: error.title,
                    subtitle: error.subtitle,
                    details: error.details,
                    image: error.image,
                    imageLogo: error.imageLogo,
                    timeToRetry: undefined,
                    buttonTitle: undefined,
                    canRetryManual: undefined,
                    urlToRedirect: undefined,
                });
                return;
            }
            const errorApiRetryData = isErrorApiRetryData.safeParse(e);
            if (errorApiRetryData.success) {
                const error = errorApiRetryData.data;
                set({
                    type: "retry",
                    code: error.code,
                    title: error.title,
                    subtitle: error.subtitle,
                    details: error.details,
                    image: error.image,
                    imageLogo: error.imageLogo,
                    timeToRetry: error.timeToRetry,
                    buttonTitle: error.buttonTitle ?? undefined,
                    canRetryManual: error.canRetryManual,
                    urlToRedirect: undefined,
                });
                return;
            }
            const errorApiUnauthorizedData = isErrorApiUnauthorizedData.safeParse(e);
            if (errorApiUnauthorizedData.success) {
                const error = errorApiUnauthorizedData.data;
                set({
                    type: "unauthorized",
                    code: error.code,
                    title: error.title,
                    subtitle: error.subtitle,
                    details: error.details,
                    image: error.image,
                    imageLogo: error.imageLogo,
                    timeToRetry: undefined,
                    buttonTitle: error.buttonTitle ?? undefined,
                    canRetryManual: undefined,
                    urlToRedirect: undefined,
                });
                return;
            }
            throw new Error("This should never happen.");
        },
        /**
         * Turns an exception into an error.
         */
        setException: (error: unknown): void => {
            console.error(error);
            if (error instanceof Error) {
                console.error("Stacktrace: ", error.stack);
            }

            if (typeof error === "string" || error instanceof String) {
                set(
                    createErrorScreenMessage({
                        image: "/resources/icons/new_version.png",
                        imageLogo: "/static/images/logo.png",
                        type: "error",
                        code: "INTERNAL_ERROR",
                        title: "An error occurred",
                        details: error.toString(),
                    }),
                );
                return;
            }
            if (isAxiosError(error) && error.response) {
                // Axios HTTP error
                // client received an error response (5xx, 4xx)
                console.error("Axios error. Request:", error.request, " - Response: ", error.response);

                set(
                    createErrorScreenMessage({
                        type: "error",
                        code: "HTTP_ERROR",
                        title:
                            "HTTP " +
                            error.response.status +
                            " - " +
                            (error.response.data ? error.response.data : error.response.statusText),
                        details: "An error occurred while accessing URL: " + error.config?.url,
                    }),
                );
                return;
            }
            if (isAxiosError(error)) {
                // Axios HTTP error
                // client never received a response, or request never left
                console.error("Axios error. No full HTTP response received. Request to URL:", error.config?.url);
                set(
                    createErrorScreenMessage({
                        type: "error",
                        code: "NETWORK_ERROR",
                        title: "Network error",
                        subtitle: error.message,
                    }),
                );
                return;
            }
            if (error instanceof ApiError) {
                const errorApi = error.errorApiData;
                const { status: _exhaustiveCheck, ...errorApiWithoutStatus } = errorApi;

                switch (errorApiWithoutStatus.type) {
                    case "error":
                    case "redirect": {
                        set(createErrorScreenMessage(errorApiWithoutStatus));
                        return;
                    }
                    case "retry":
                    case "unauthorized": {
                        set(
                            createErrorScreenMessage({
                                ...errorApiWithoutStatus,
                                buttonTitle: errorApiWithoutStatus.buttonTitle ?? undefined,
                            }),
                        );
                        return;
                    }
                    default: {
                        // @ts-ignore Typescript compiler is lost because of the removal of the status field.
                        const _exhaustiveCheck: never = errorApi;
                        throw new Error("This should never happen.");
                    }
                }
                return;
            }
            if (error instanceof Error) {
                // Error
                set(
                    createErrorScreenMessage({
                        type: "error",
                        code: "INTERNAL_ERROR",
                        title: "An error occurred",
                        subtitle: error.name,
                        details: error.message,
                    }),
                );
                return;
            }
            throw error;
        },
        delete: () => {
            set(undefined);
        },
    };
}

export const errorScreenStore = createErrorScreenStore();
