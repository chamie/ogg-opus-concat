export type DebugCategory = 'parser' | 'disassembler' | 'assembler' | 'index';

const exported: {
    isDebug: boolean;
    customLogger: ((...args: any[]) => void) | null;
    /** Empty set means all categories enabled */
    enabledCategories: Set<DebugCategory>;
    debugLog: (...args: any[]) => void;
} = {
    isDebug: false,
    customLogger: null,
    enabledCategories: new Set<DebugCategory>([]),
    debugLog: (category: DebugCategory, ...args: any[]) => {
        if (!exported.isDebug) return;

        if (exported.enabledCategories.size && !exported.enabledCategories.has(category)) return;

        if (exported.customLogger) {
            exported.customLogger(category, ...args);
        } else {
            console.debug(`Category: ${category}`, ...args);
        }
    }
}

export default exported;