import { get } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/game-model";
import type { LocalizedString } from "typesafe-i18n";
import LL from "../../i18n/i18n-svelte";

type RequestedStatus =
    | typeof AvailabilityStatus.DO_NOT_DISTURB
    | typeof AvailabilityStatus.BACK_IN_A_MOMENT
    | typeof AvailabilityStatus.BUSY;

type StatusInformation = {
    AvailabilityStatus: RequestedStatus | typeof AvailabilityStatus.ONLINE;
    label: LocalizedString | string;
    colorHex: string;
};

const COLORS: Record<AvailabilityStatus, { filling: number; outline: number }> = {
    [AvailabilityStatus.AWAY]: { filling: 0xe9c84e, outline: 0xd3873b },
    [AvailabilityStatus.ONLINE]: { filling: 0x68e97a, outline: 0x44d45a },
    [AvailabilityStatus.SPEAKER]: { filling: 0xe9c84e, outline: 0xd3873b },
    [AvailabilityStatus.SILENT]: { filling: 0xe74c3c, outline: 0xc0392b },
    [AvailabilityStatus.JITSI]: { filling: 0x68e97a, outline: 0x44d45a },
    [AvailabilityStatus.BBB]: { filling: 0x68e97a, outline: 0x44d45a },
    [AvailabilityStatus.DENY_PROXIMITY_MEETING]: { filling: 0xffffff, outline: 0x4156f6 },
    [AvailabilityStatus.UNRECOGNIZED]: { filling: 0xffffff, outline: 0xffffff },
    [AvailabilityStatus.UNCHANGED]: { filling: 0xffffff, outline: 0xffffff },
    [AvailabilityStatus.BACK_IN_A_MOMENT]: { filling: 0x7382e2, outline: 0x4156f6 },
    [AvailabilityStatus.DO_NOT_DISTURB]: { filling: 0xe96e53, outline: 0xcc5151 },
    [AvailabilityStatus.BUSY]: { filling: 0xe9c84e, outline: 0xd3873b },
    [AvailabilityStatus.LIVEKIT]: { filling: 0x68e97a, outline: 0x44d45a },
    [AvailabilityStatus.LISTENER]: { filling: 0x68e97a, outline: 0x44d45a },
};

export const getColorOfStatus = (status: AvailabilityStatus): { filling: number; outline: number } => {
    return COLORS[status];
};

export const getColorHexOfStatus = (status: AvailabilityStatus): string => {
    return `#${COLORS[status].filling.toString(16)}`;
};

export const getStatusLabel = (status: AvailabilityStatus): string => {
    const statusKey = Object.entries(AvailabilityStatus).find(([, value]) => value === status)?.[0];
    const statusLabels = get(LL).actionbar.status as Record<string, (() => string) | undefined>;
    const fn = statusKey ? statusLabels[statusKey] : undefined;
    return fn?.() || "Unknown";
};

export const getStatusInformation = (
    statusToShow: Array<RequestedStatus | typeof AvailabilityStatus.ONLINE>,
): Array<StatusInformation> => {
    const labelStatusMap: Map<RequestedStatus | typeof AvailabilityStatus.ONLINE, LocalizedString> = new Map([
        [AvailabilityStatus.BACK_IN_A_MOMENT, get(LL).actionbar.status.BACK_IN_A_MOMENT()],
        [AvailabilityStatus.BUSY, get(LL).actionbar.status.BUSY()],
        [AvailabilityStatus.DO_NOT_DISTURB, get(LL).actionbar.status.DO_NOT_DISTURB()],
        [AvailabilityStatus.ONLINE, get(LL).actionbar.status.ONLINE()],
    ]);

    return statusToShow.map((status: RequestedStatus | typeof AvailabilityStatus.ONLINE) => {
        return {
            AvailabilityStatus: status,
            label: labelStatusMap.get(status) || "",
            colorHex: getColorHexOfStatus(status),
        };
    });
};
