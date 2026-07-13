import type { UserProviderInterface } from "../UserProvider/UserProviderInterface";

export class UserProviderMerger {
    public constructor(public readonly providers: UserProviderInterface[] = []) {}
}
