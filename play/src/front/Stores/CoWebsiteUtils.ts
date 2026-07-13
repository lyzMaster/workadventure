import { get } from "svelte/store";
import { iframeListener } from "../Api/IframeListener";
import type { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";
import { SimpleCoWebsite } from "../WebRtc/CoWebsite/SimpleCoWebsite";
import { coWebsites } from "./CoWebsiteStore";

export type OpenCoWebsiteObject = {
    url: string;
    allowApi?: boolean;
    allowPolicy?: string;
    widthPercent?: number;
    closable?: boolean;
    hideUrl?: boolean;
};

export const openCoWebSite = (
    { url, allowApi, allowPolicy, widthPercent, closable }: OpenCoWebsiteObject,
    source: MessageEventSource | null,
) => {
    if (!url || !source) {
        throw new Error("Unknown query source");
    }

    return openSimpleCowebsite(
        new SimpleCoWebsite(
            new URL(url, iframeListener.getBaseUrlFromSource(source)),
            allowApi,
            allowPolicy,
            widthPercent,
            closable,
        ),
    );
};

export const openCoWebSiteWithoutSource = ({
    url,
    allowApi,
    allowPolicy,
    widthPercent,
    closable,
    hideUrl,
}: OpenCoWebsiteObject) => {
    if (!url) {
        throw new Error("Unknown query source");
    }

    return openSimpleCowebsite(
        new SimpleCoWebsite(new URL(url), allowApi, allowPolicy, widthPercent, closable, hideUrl),
    );
};

export const getCoWebSite = () => {
    return get(coWebsites).map((coWebsite: CoWebsite) => {
        return {
            id: coWebsite.getId(),
        };
    });
};

export const closeCoWebsite = (coWebsiteId: string) => {
    const coWebsite = coWebsites.findById(coWebsiteId);

    if (!coWebsite) {
        console.warn("Unknown co-website, probably already closed", coWebsiteId);
        return;
    }

    coWebsites.remove(coWebsite);
};

const openSimpleCowebsite = (coWebsite: SimpleCoWebsite) => {
    coWebsites.add(coWebsite);

    return {
        id: coWebsite.getId(),
    };
};
