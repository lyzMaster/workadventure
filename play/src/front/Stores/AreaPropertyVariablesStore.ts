import { writable } from "svelte/store";

type AreaPropertyVariableChange = {
    areaId: string;
    key: string;
};

export type AreaPropertyVariablesController = {
    variableChanges: {
        subscribe(run: (value: AreaPropertyVariableChange | undefined) => void): () => void;
    };
    getVariable(areaId: string, propertyId: string, key: string): unknown;
    setVariable(areaId: string, propertyId: string, key: string, value: unknown): void;
};

/**
 * Store that holds the AreaPropertyVariablesManager instance.
 * Set when the GameScene is initialized.
 */
export const areaPropertyVariablesManagerStore = writable<AreaPropertyVariablesController | undefined>(undefined);

/**
 * Helper function to set an area property variable.
 * This is a convenience function that gets the manager from the store and calls setVariable.
 *
 * @param areaId - The area ID
 * @param propertyId - The property ID
 * @param key - The variable key
 * @param value - The value to set
 */
export function setAreaPropertyVariable(areaId: string, propertyId: string, key: string, value: unknown): void {
    const currentManager = getCurrentManager();
    if (!currentManager) {
        console.warn("AreaPropertyVariablesManager not initialized, cannot set variable");
        return;
    }
    currentManager.setVariable(areaId, propertyId, key, value);
}

/**
 * Helper function to set the lock state for a lockable area property.
 *
 * @param areaId - The area ID
 * @param propertyId - The lockable property ID
 * @param locked - Whether to lock (true) or unlock (false)
 */
export function setAreaPropertyLockState(areaId: string, propertyId: string, locked: boolean): void {
    setAreaPropertyVariable(areaId, propertyId, "lock", locked);
}

// Helper to get current manager value
function getCurrentManager(): AreaPropertyVariablesController | undefined {
    let manager: AreaPropertyVariablesController | undefined;
    const unsubscribe = areaPropertyVariablesManagerStore.subscribe((m) => {
        manager = m;
    });
    unsubscribe();
    return manager;
}
