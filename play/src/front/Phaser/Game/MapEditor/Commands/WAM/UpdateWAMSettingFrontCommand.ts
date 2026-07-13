import {
    MegaphoneSettings,
    UpdateWAMSettingCommand,
    type UpdateWamSettingsCommandDto,
    type WAMFileFormat,
    WAMSettingsUtils,
} from "@workadventure/map-editor";

import type { FrontCommandInterface } from "../FrontCommandInterface";
import { localUserStore } from "../../../../../Connection/LocalUserStore";
import { megaphoneCanBeUsedStore, megaphoneSpaceSettingsStore } from "../../../../../Stores/MegaphoneStore";

export class UpdateWAMSettingFrontCommand extends UpdateWAMSettingCommand implements FrontCommandInterface {
    public constructor(
        wam: WAMFileFormat,
        updateWAMSettingsMessage: Omit<UpdateWamSettingsCommandDto, "type" | "commandId" | "sceneId">,
        private userTags: string[],
        private roomUrl: string,
        id?: string,
    ) {
        super(wam, updateWAMSettingsMessage, id);
    }

    public getUndoCommand(): UpdateWAMSettingFrontCommand {
        if (this.updateWAMSettingsMessage.message?.megaphone !== undefined) {
            const previousMegaphone = this.oldConfig?.megaphone;
            return new UpdateWAMSettingFrontCommand(
                this.wam,
                {
                    message: { megaphone: previousMegaphone ? { ...previousMegaphone } : undefined },
                },
                this.userTags,
                this.roomUrl,
            );
        }
        if (this.updateWAMSettingsMessage.message?.recording !== undefined) {
            const previousRecording = this.oldConfig?.recording;
            return new UpdateWAMSettingFrontCommand(
                this.wam,
                {
                    message: { recording: previousRecording ? { ...previousRecording } : undefined },
                },
                this.userTags,
                this.roomUrl,
            );
        }

        return this;
    }

    public async execute(): Promise<void> {
        await super.execute();

        const message = this.updateWAMSettingsMessage.message;
        if (message?.megaphone !== undefined || message?.recording !== undefined) {
            const megaphoneSettings = MegaphoneSettings.optional().parse(this.wam.settings?.megaphone);

            megaphoneCanBeUsedStore.set(WAMSettingsUtils.canUseMegaphone(this.wam.settings, this.userTags));

            const megaphoneSpaceName = WAMSettingsUtils.getMegaphoneUrl(
                this.wam.settings,
                new URL(this.roomUrl).host,
                this.roomUrl,
            );
            if (!megaphoneSpaceName || !megaphoneSettings) {
                megaphoneSpaceSettingsStore.set(undefined);
            } else {
                megaphoneSpaceSettingsStore.set({
                    spaceName: megaphoneSpaceName,
                    audienceVideoFeedbackActivated: megaphoneSettings.audienceVideoFeedbackActivated ?? false,
                    canRecord: WAMSettingsUtils.canStartRecordingMegaphone(
                        this.wam.settings,
                        this.userTags,
                        localUserStore.isLogged(),
                    ),
                });
            }
        }
    }

    public toDto(sceneId: string): UpdateWamSettingsCommandDto {
        return {
            type: "wam.settings.update",
            commandId: this.commandId,
            sceneId,
            message: this.updateWAMSettingsMessage.message,
        };
    }
}
