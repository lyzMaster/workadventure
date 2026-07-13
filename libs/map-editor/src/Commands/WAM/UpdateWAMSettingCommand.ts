import type { WAMFileFormat, WAMSettings } from "../../types";
import { Command } from "../Command";
import type { UpdateWamSettingsCommandDto } from "../Dto/WamCommandDto";

export class UpdateWAMSettingCommand extends Command {
    protected readonly oldConfig: WAMSettings | undefined;
    constructor(
        protected wam: WAMFileFormat,
        protected updateWAMSettingsMessage: Omit<UpdateWamSettingsCommandDto, "type" | "commandId" | "sceneId">,
        id?: string,
    ) {
        super(id);
        this.oldConfig = structuredClone(this.wam.settings);
    }

    execute(): Promise<void> {
        if (this.wam.settings === undefined) {
            this.wam.settings = {};
        }

        const message = this.updateWAMSettingsMessage.message;
        if (message === undefined) {
            console.warn("Empty settings message received");
            return Promise.resolve();
        }
        this.wam.settings = {
            ...this.wam.settings,
            ...message,
        };
        return Promise.resolve();
    }

    /*undo(): Promise<void> {
        if (this.wam.settings === undefined) {
            this.wam.settings = {};
        }
        if (this.name === "megaphone") {
            this.wam.settings.megaphone = this.oldConfig;
        }
        return Promise.resolve();
    }*/
}
