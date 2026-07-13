import { writable } from "svelte/store";

export const matrixSecurity = {
    isEncryptionRequiredAndNotSet: writable(false),
    setupNewKeyStorage: () => Promise.resolve(),
    openAutomaticChooseDeviceVerificationMethodModal: () => Promise.resolve(),
};
