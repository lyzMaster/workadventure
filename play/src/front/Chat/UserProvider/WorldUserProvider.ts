import { readable } from "svelte/store";
import type { UserProviderInterface } from "./UserProviderInterface";

export class WorldUserProvider implements UserProviderInterface {
    public readonly userCount = readable(0);

    public constructor(..._unused: unknown[]) {}
}
