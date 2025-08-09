import { getErrorMessage } from '../utils/error-handler.js';
/**
 * VSCode Extension Bridge for Terminal Integration
 *
 * This file provides the bridge between Claude-Flow and VSCode extension API
 * for terminal management and output capture.
 *
 * NOTE: This file is only used when Claude-Flow is packaged as a VS Code extension.
 * It is excluded from the main CLI build. If you need to use this in a VS Code
 * extension context, install @types/vscode as a devDependency.
 */

import * as vscode from 'vscode';

/**
 * Terminal output processors registry
 */
const terminalOutputProcessors = new Map<string, (data: string) => void>();

/**
 * Active terminals registry
 */
const activeTerminals = new Map<string, vscode.Terminal>();

/**
 * Terminal write emulators for output capture
 */
const terminalWriteEmulators = new Map<vscode.Terminal, vscode.EventEmitter<string>>();

/**
 * Initialize the VSCode terminal bridge
 */
export function initializeTerminalBridge(context: vscode.ExtensionContext): void {
  // Inject VSCode API into global scope for Claude-Flow
  (globalThis as any).vscode = vscode;

  // Register terminal output processor function
  (globalThis as any).registerTerminalOutputProcessor = (
    terminalId: string,
    processor: (data: string) => void,
  ) => {
    terminalOutputProcessors.set(terminalId, processor);
  };

  // Override terminal creation to capture output
  const originalCreateTerminal = vscode.window.createTerminal;
  (vscode.window as any).createTerminal = function (options: vscode.TerminalOptions) {
    const terminal = originalCreateTerminal.call(vscode.window, options) as vscode.Terminal;

    // Create write emulator for this terminal
    const writeEmulator = new vscode.EventEmitter<string>();
    terminalWriteEmulators.set(terminal, writeEmulator);

    // Find terminal ID from name
    const match = options.name?.match(/Claude-Flow Terminal ([\w-]+)/);
    if (match) {
      const terminalId = match[1];
      activeTerminals.set(terminalId, terminal);

      // Set up output capture
      captureTerminalOutput(terminal, terminalId);
    }

    return terminal;
  };

  // Clean up on terminal close
  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((terminal: vscode.Terminal) => {
      // Find and remove from registries
      for (const [id, term] of activeTerminals.entries()) {
        if (term === terminal) {
          activeTerminals.delete(id);
          terminalOutputProcessors.delete(id);
          break;
        }
      }

      // Clean up write emulator
      const emulator = terminalWriteEmulators.get(terminal);
      if (emulator) {
        emulator.dispose();
        terminalWriteEmulators.delete(terminal);
      }
    }),
  );
}

/**
 * Capture terminal output using various methods
 */
function captureTerminalOutput(terminal: vscode.Terminal, terminalId: string): void {
  // Method 1: Use terminal.sendText override to capture commands
  const originalSendText = terminal.sendText;
  (terminal as any).sendText = function (text: string, addNewLine?: boolean) {
    // Call original method
    originalSendText.call(terminal, text, addNewLine);

    // Process command
    const processor = terminalOutputProcessors.get(terminalId);
    if (processor && text) {
      // Simulate command echo
      processor(text + (addNewLine !== false ? '\n' : ''));
    }
  };

  // Method 2: Use proposed API if available
  if ('onDidWriteData' in terminal) {
    const writeDataEvent = (terminal as any).onDidWriteData;
    if (writeDataEvent) {
      writeDataEvent((data: string) => {
        const processor = terminalOutputProcessors.get(terminalId);
        if (processor) {
          processor(data);
        }
      });
    }
  }

  // Method 3: Use terminal renderer if available
  setupTerminalRenderer(terminal, terminalId);
}

/**
 * Set up terminal renderer for output capture
 */
function setupTerminalRenderer(terminal: vscode.Terminal, terminalId: string): void {
  // Check if terminal renderer API is available
  if (vscode.window.registerTerminalProfileProvider) {
    // This is a more advanced method that requires additional setup
    // It would involve creating a custom terminal profile that captures output

    // For now, we'll use a simpler approach with periodic output checking
    let lastOutput = '';
    const checkOutput = setInterval(() => {
      // This is a placeholder - actual implementation would depend on
      // available VSCode APIs for reading terminal content

      // Check if terminal is still active
      if (!activeTerminals.has(terminalId)) {
        clearInterval(checkOutput);
      }
    }, 100);
  }
}

/**
 * Create a terminal with output capture
 */
export async function createCapturedTerminal(
  name: string,
  shellPath?: string,
  shellArgs?: string[],
): Promise<{
  terminal: vscode.Terminal;
  onData: vscode.Event<string>;
}> {
  const writeEmulator = new vscode.EventEmitter<string>();

  const terminal = vscode.window.createTerminal({
    name,
    shellPath,
    shellArgs,
  });

  terminalWriteEmulators.set(terminal, writeEmulator);

  return {
    terminal,
    onData: writeEmulator.event,
  };
}

/**
 * Send command to terminal and capture output
 */
export async function executeTerminalCommand(
  terminal: vscode.Terminal,
  command: string,
  timeout: number = 30000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writeEmulator = terminalWriteEmulators.get(terminal);
    if (!writeEmulator) {
      reject(new Error('No write emulator for terminal'));
      return;
    }

    let output = '';
    const marker = `__COMMAND_COMPLETE_${Date.now()}__`;

    // Set up output listener
    const disposable = writeEmulator.event((data: string) => {
      output += data;

      if (output.includes(marker)) {
        // Command completed
        disposable.dispose();
        const result = output.substring(0, output.indexOf(marker));
        resolve(result);
      }
    });

    // Set timeout
    const timer = setTimeout(() => {
      disposable.dispose();
      reject(new Error('Command timeout'));
    }, timeout);

    // Execute command with marker
    terminal.sendText(`${command} && echo "${marker}"`);

    // Clear timeout on success
    writeEmulator.event(() => {
      if (output.includes(marker)) {
        clearTimeout(timer);
      }
    });
  });
}

/**
 * Get terminal by ID
 */
export function getTerminalById(terminalId: string): vscode.Terminal | undefined {
  return activeTerminals.get(terminalId);
}

/**
 * Dispose all terminal resources
 */
export function disposeTerminalBridge(): void {
  // Clean up all terminals
  for (const terminal of activeTerminals.values()) {
    terminal.dispose();
  }
  activeTerminals.clear();

  // Clean up processors
  terminalOutputProcessors.clear();

  // Clean up write emulators
  for (const emulator of terminalWriteEmulators.values()) {
    emulator.dispose();
  }
  terminalWriteEmulators.clear();
}
