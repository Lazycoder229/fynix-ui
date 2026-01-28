"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
const ts = __importStar(require("typescript/lib/tsserverlibrary"));
function init(modules) {
    const typescript = modules.typescript;
    function create(info) {
        const config = info.config || {};
        const log = config.debug
            ? info.project.projectService.logger
            : { info: () => { }, msg: () => { } };
        log.info?.("[Fynix Plugin] Initializing...");
        // Store original methods
        const proxy = Object.create(null);
        for (let k of Object.keys(info.languageService)) {
            const x = info.languageService[k];
            proxy[k] = (...args) => Function.prototype.apply.call(x, info.languageService, args);
        }
        // Transform .fnx files to virtual .tsx for TypeScript
        function getVirtualFileName(fileName) {
            if (fileName.endsWith(".fnx")) {
                return fileName.replace(/\.fnx$/, ".virtual.tsx");
            }
            return fileName;
        }
        // Parse .fnx file and extract TypeScript code
        function parseFnxFile(content) {
            const lines = [];
            // Add Fynix import with all common exports
            lines.push(`import { Fynix, nixState, nixStore, nixAsync, nixEffect, nixComputed, nixForm, type NixState, type NixStore, type NixAsyncResult, type NixFormState } from '@fynixorg/ui';`);
            lines.push("");
            // Extract logic block
            const logicMatch = content.match(/<logic\s+setup\s*=\s*["']?(ts|js)["']?\s*>([\s\S]*?)<\/logic>/i);
            if (logicMatch && logicMatch[2]) {
                const logicContent = logicMatch[2].trim();
                const logicLines = logicContent.split("\n");
                // Add imports
                logicLines.forEach((line) => {
                    if (line.trim().startsWith("import ")) {
                        lines.push(line);
                    }
                });
                lines.push("");
                lines.push("export default function FynixComponent(props: any = {}) {");
                // Add logic
                logicLines.forEach((line) => {
                    if (!line.trim().startsWith("import ") &&
                        !line.trim().startsWith("export ")) {
                        lines.push(`  ${line}`);
                    }
                });
            }
            else {
                lines.push("export default function FynixComponent(props: any = {}) {");
            }
            // Extract view block
            const viewMatch = content.match(/<view\s*>([\s\S]*?)<\/view>/i);
            if (viewMatch && viewMatch[1]) {
                lines.push("");
                lines.push("  return (");
                const viewLines = viewMatch[1].trim().split("\n");
                viewLines.forEach((line) => {
                    lines.push(`    ${line}`);
                });
                lines.push("  );");
            }
            else {
                lines.push("  return null;");
            }
            lines.push("}");
            return lines.join("\n");
        }
        // Override getScriptFileNames to include virtual files
        const originalGetScriptFileNames = info.languageServiceHost.getScriptFileNames.bind(info.languageServiceHost);
        info.languageServiceHost.getScriptFileNames = () => {
            const fileNames = originalGetScriptFileNames();
            const virtualFileNames = fileNames
                .filter((fn) => fn.endsWith(".fnx"))
                .map((fn) => getVirtualFileName(fn));
            return [...fileNames, ...virtualFileNames];
        };
        // Override getScriptSnapshot to provide content for virtual files
        const originalGetScriptSnapshot = info.languageServiceHost.getScriptSnapshot.bind(info.languageServiceHost);
        info.languageServiceHost.getScriptSnapshot = (fileName) => {
            if (fileName.endsWith(".virtual.tsx")) {
                const fnxFileName = fileName.replace(/\.virtual\.tsx$/, ".fnx");
                const fnxSnapshot = originalGetScriptSnapshot(fnxFileName);
                if (fnxSnapshot) {
                    const fnxContent = fnxSnapshot.getText(0, fnxSnapshot.getLength());
                    const transformedContent = parseFnxFile(fnxContent);
                    return typescript.ScriptSnapshot.fromString(transformedContent);
                }
            }
            return originalGetScriptSnapshot(fileName);
        };
        // Enhanced completion support with auto-import
        proxy.getCompletionsAtPosition = (fileName, position, options) => {
            const prior = info.languageService.getCompletionsAtPosition(fileName, position, options);
            if (!fileName.endsWith(".fnx")) {
                return prior;
            }
            const fynixCompletions = [
                {
                    name: "nixState",
                    kind: typescript.ScriptElementKind.functionElement,
                    kindModifiers: "declare",
                    sortText: "0",
                    source: "@fynixorg/ui",
                    hasAction: true,
                    data: {
                        exportName: "nixState",
                        moduleSpecifier: "@fynixorg/ui",
                    },
                },
                {
                    name: "nixStore",
                    kind: typescript.ScriptElementKind.functionElement,
                    kindModifiers: "declare",
                    sortText: "0",
                    source: "@fynixorg/ui",
                    hasAction: true,
                    data: {
                        exportName: "nixStore",
                        moduleSpecifier: "@fynixorg/ui",
                    },
                },
                {
                    name: "nixAsync",
                    kind: typescript.ScriptElementKind.functionElement,
                    kindModifiers: "declare",
                    sortText: "0",
                    source: "@fynixorg/ui",
                    hasAction: true,
                    data: {
                        exportName: "nixAsync",
                        moduleSpecifier: "@fynixorg/ui",
                    },
                },
                {
                    name: "nixEffect",
                    kind: typescript.ScriptElementKind.functionElement,
                    kindModifiers: "declare",
                    sortText: "0",
                    source: "@fynixorg/ui",
                    hasAction: true,
                    data: {
                        exportName: "nixEffect",
                        moduleSpecifier: "@fynixorg/ui",
                    },
                },
                {
                    name: "nixComputed",
                    kind: typescript.ScriptElementKind.functionElement,
                    kindModifiers: "declare",
                    sortText: "0",
                    source: "@fynixorg/ui",
                    hasAction: true,
                    data: {
                        exportName: "nixComputed",
                        moduleSpecifier: "@fynixorg/ui",
                    },
                },
                {
                    name: "nixForm",
                    kind: typescript.ScriptElementKind.functionElement,
                    kindModifiers: "declare",
                    sortText: "0",
                    source: "@fynixorg/ui",
                    hasAction: true,
                    data: {
                        exportName: "nixForm",
                        moduleSpecifier: "@fynixorg/ui",
                    },
                },
            ];
            if (prior) {
                return {
                    ...prior,
                    entries: [...fynixCompletions, ...prior.entries],
                };
            }
            return {
                isGlobalCompletion: false,
                isMemberCompletion: false,
                isNewIdentifierLocation: false,
                entries: fynixCompletions,
            };
        };
        // Add code actions for auto-import
        proxy.getCompletionEntryDetails = (fileName, position, entryName, formatOptions, source, preferences, data) => {
            const prior = info.languageService.getCompletionEntryDetails(fileName, position, entryName, formatOptions, source, preferences, data);
            if (!fileName.endsWith(".fnx")) {
                return prior;
            }
            const fynixFunctions = [
                "nixState",
                "nixStore",
                "nixAsync",
                "nixEffect",
                "nixComputed",
                "nixForm",
            ];
            if (fynixFunctions.includes(entryName)) {
                const fynixInfo = {
                    nixState: {
                        displayParts: [
                            { text: "function ", kind: "keyword" },
                            { text: "nixState", kind: "functionName" },
                            { text: "<T>(initialValue: T): NixState<T>", kind: "text" },
                        ],
                        documentation: [
                            {
                                text: "Creates a reactive state that automatically updates the UI when changed.",
                                kind: "text",
                            },
                        ],
                        codeActions: [
                            {
                                description: `Import 'nixState' from "@fynixorg/ui"`,
                                changes: [],
                            },
                        ],
                    },
                    nixStore: {
                        displayParts: [
                            { text: "function ", kind: "keyword" },
                            { text: "nixStore", kind: "functionName" },
                            { text: "<T>(initialState: T): NixStore<T>", kind: "text" },
                        ],
                        documentation: [
                            {
                                text: "Creates a reactive store for managing multiple related state values.",
                                kind: "text",
                            },
                        ],
                        codeActions: [
                            {
                                description: `Import 'nixStore' from "@fynixorg/ui"`,
                                changes: [],
                            },
                        ],
                    },
                };
                return {
                    name: entryName,
                    kind: typescript.ScriptElementKind.functionElement,
                    kindModifiers: "declare",
                    ...(fynixInfo[entryName] || {}),
                };
            }
            return prior;
        };
        // Enhanced hover information
        proxy.getQuickInfoAtPosition = (fileName, position) => {
            const program = info.languageService.getProgram();
            const sourceFile = program?.getSourceFile(fileName);
            if (!sourceFile || !fileName.endsWith(".fnx")) {
                return info.languageService.getQuickInfoAtPosition(fileName, position);
            }
            const node = findNodeAtPosition(sourceFile, position);
            if (!node) {
                return info.languageService.getQuickInfoAtPosition(fileName, position);
            }
            const text = node.getText(sourceFile);
            // Hover for r-* event handlers
            if (text.startsWith("r-")) {
                const eventName = text.substring(2);
                return {
                    kind: typescript.ScriptElementKind.memberVariableElement,
                    kindModifiers: "declare",
                    textSpan: {
                        start: node.getStart(sourceFile),
                        length: node.getWidth(sourceFile),
                    },
                    displayParts: [
                        { text: "(property) ", kind: "text" },
                        { text: text, kind: "parameterName" },
                        { text: ": ", kind: "punctuation" },
                        {
                            text: `(event: ${getEventType(eventName)}) => void`,
                            kind: "text",
                        },
                    ],
                    documentation: [
                        {
                            text: `Fynix event handler for ${eventName} events`,
                            kind: "text",
                        },
                    ],
                };
            }
            // Hover for Fynix functions
            const fynixFunctionInfo = {
                nixState: {
                    displayParts: [
                        { text: "function ", kind: "keyword" },
                        { text: "nixState", kind: "functionName" },
                        { text: "<", kind: "punctuation" },
                        { text: "T", kind: "typeParameterName" },
                        { text: ">", kind: "punctuation" },
                        { text: "(", kind: "punctuation" },
                        { text: "initialValue", kind: "parameterName" },
                        { text: ": ", kind: "punctuation" },
                        { text: "T", kind: "typeParameterName" },
                        { text: ")", kind: "punctuation" },
                        { text: ": ", kind: "punctuation" },
                        { text: "NixState<T>", kind: "interfaceName" },
                    ],
                    documentation: [
                        {
                            text: "Creates a reactive state that automatically updates the UI when changed.",
                            kind: "text",
                        },
                        { text: "\n\n", kind: "lineBreak" },
                        { text: "Returns an object with:", kind: "text" },
                        { text: "\n", kind: "lineBreak" },
                        { text: "• value: The current state value", kind: "text" },
                        { text: "\n", kind: "lineBreak" },
                        { text: "• subscribe(fn): Subscribe to changes", kind: "text" },
                        { text: "\n", kind: "lineBreak" },
                        { text: "• cleanup(): Clean up subscriptions", kind: "text" },
                    ],
                },
                nixStore: {
                    displayParts: [
                        { text: "function ", kind: "keyword" },
                        { text: "nixStore", kind: "functionName" },
                        { text: "<", kind: "punctuation" },
                        {
                            text: "T extends Record<string, any>",
                            kind: "typeParameterName",
                        },
                        { text: ">", kind: "punctuation" },
                        { text: "(", kind: "punctuation" },
                        { text: "initialState", kind: "parameterName" },
                        { text: ": ", kind: "punctuation" },
                        { text: "T", kind: "typeParameterName" },
                        { text: ")", kind: "punctuation" },
                        { text: ": ", kind: "punctuation" },
                        { text: "NixStore<T>", kind: "interfaceName" },
                    ],
                    documentation: [
                        {
                            text: "Creates a reactive store for managing multiple related state values.",
                            kind: "text",
                        },
                        { text: "\n\n", kind: "lineBreak" },
                        {
                            text: "All properties are directly accessible and reactive.",
                            kind: "text",
                        },
                    ],
                },
                nixAsync: {
                    displayParts: [
                        { text: "function ", kind: "keyword" },
                        { text: "nixAsync", kind: "functionName" },
                        { text: "<", kind: "punctuation" },
                        { text: "T", kind: "typeParameterName" },
                        { text: ">", kind: "punctuation" },
                        { text: "(", kind: "punctuation" },
                        { text: "fn", kind: "parameterName" },
                        { text: ": ", kind: "punctuation" },
                        { text: "() => Promise<T>", kind: "text" },
                        { text: ")", kind: "punctuation" },
                        { text: ": ", kind: "punctuation" },
                        { text: "NixAsyncResult<T>", kind: "interfaceName" },
                    ],
                    documentation: [
                        {
                            text: "Manages async operations with loading and error states.",
                            kind: "text",
                        },
                        { text: "\n\n", kind: "lineBreak" },
                        {
                            text: "Returns: { data, loading, error, refetch }",
                            kind: "text",
                        },
                    ],
                },
                nixEffect: {
                    displayParts: [
                        { text: "function ", kind: "keyword" },
                        { text: "nixEffect", kind: "functionName" },
                        { text: "(", kind: "punctuation" },
                        { text: "fn", kind: "parameterName" },
                        { text: ": ", kind: "punctuation" },
                        { text: "() => void | (() => void)", kind: "text" },
                        { text: ", ", kind: "punctuation" },
                        { text: "deps?", kind: "parameterName" },
                        { text: ": ", kind: "punctuation" },
                        { text: "any[]", kind: "text" },
                        { text: ")", kind: "punctuation" },
                        { text: ": ", kind: "punctuation" },
                        { text: "void", kind: "keyword" },
                    ],
                    documentation: [
                        {
                            text: "Runs side effects when dependencies change.",
                            kind: "text",
                        },
                        { text: "\n\n", kind: "lineBreak" },
                        { text: "Can return a cleanup function.", kind: "text" },
                    ],
                },
                nixComputed: {
                    displayParts: [
                        { text: "function ", kind: "keyword" },
                        { text: "nixComputed", kind: "functionName" },
                        { text: "<", kind: "punctuation" },
                        { text: "T", kind: "typeParameterName" },
                        { text: ">", kind: "punctuation" },
                        { text: "(", kind: "punctuation" },
                        { text: "fn", kind: "parameterName" },
                        { text: ": ", kind: "punctuation" },
                        { text: "() => T", kind: "text" },
                        { text: ", ", kind: "punctuation" },
                        { text: "deps", kind: "parameterName" },
                        { text: ": ", kind: "punctuation" },
                        { text: "any[]", kind: "text" },
                        { text: ")", kind: "punctuation" },
                        { text: ": ", kind: "punctuation" },
                        { text: "NixState<T>", kind: "interfaceName" },
                    ],
                    documentation: [
                        {
                            text: "Creates a computed value that updates when dependencies change.",
                            kind: "text",
                        },
                    ],
                },
                nixForm: {
                    displayParts: [
                        { text: "function ", kind: "keyword" },
                        { text: "nixForm", kind: "functionName" },
                        { text: "<", kind: "punctuation" },
                        {
                            text: "T extends Record<string, any>",
                            kind: "typeParameterName",
                        },
                        { text: ">", kind: "punctuation" },
                        { text: "(", kind: "punctuation" },
                        { text: "config", kind: "parameterName" },
                        { text: ")", kind: "punctuation" },
                        { text: ": ", kind: "punctuation" },
                        { text: "NixFormState<T>", kind: "interfaceName" },
                    ],
                    documentation: [
                        {
                            text: "Creates a form state manager with validation.",
                            kind: "text",
                        },
                    ],
                },
            };
            if (fynixFunctionInfo[text]) {
                return {
                    kind: typescript.ScriptElementKind.functionElement,
                    kindModifiers: "declare",
                    textSpan: {
                        start: node.getStart(sourceFile),
                        length: node.getWidth(sourceFile),
                    },
                    ...fynixFunctionInfo[text],
                };
            }
            return info.languageService.getQuickInfoAtPosition(fileName, position);
        };
        return proxy;
    }
    return { create };
}
function findNodeAtPosition(sourceFile, position) {
    function find(node) {
        if (position >= node.getStart() && position < node.getEnd()) {
            return ts.forEachChild(node, find) || node;
        }
        return undefined;
    }
    return find(sourceFile);
}
function getEventType(eventName) {
    const eventTypeMap = {
        click: "MouseEvent",
        dblclick: "MouseEvent",
        mouseenter: "MouseEvent",
        mouseleave: "MouseEvent",
        mouseover: "MouseEvent",
        mouseout: "MouseEvent",
        mousedown: "MouseEvent",
        mouseup: "MouseEvent",
        mousemove: "MouseEvent",
        keydown: "KeyboardEvent",
        keyup: "KeyboardEvent",
        keypress: "KeyboardEvent",
        input: "InputEvent",
        change: "Event",
        submit: "SubmitEvent",
        focus: "FocusEvent",
        blur: "FocusEvent",
        scroll: "Event",
    };
    return eventTypeMap[eventName] || "Event";
}
module.exports = init;
//# sourceMappingURL=index.js.map