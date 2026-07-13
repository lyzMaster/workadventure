export interface LocalUserSession {
    name: string;
    characterTextureIds: string[];
}

export class LocalUserSessionProvider {
    public getSession(): LocalUserSession {
        return {
            name: "Local Player",
            characterTextureIds: ["standalone-player"],
        };
    }
}
