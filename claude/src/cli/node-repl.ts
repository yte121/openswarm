/**
 * Node.js Interactive REPL for Claude-Flow
 * Compatible implementation using Node.js readline and inquirer
 */

import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import colors from 'chalk';
import Table from 'cli-table3';
import inquirer from 'inquirer';

interface REPLCommand {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  examples?: string[];
  handler: (args: string[], context: REPLContext) => Promise<void>;
}

interface REPLContext {
  options: any;
  history: string[];
  workingDirectory: string;
  currentSession?: string;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  lastActivity: Date;
  rl: readline.Interface;
}

class CommandHistory {
  private history: string[] = [];
  private maxSize = 1000;
  private historyFile: string;

  constructor(historyFile?: string) {
    this.historyFile = historyFile || path.join(process.cwd(), '.claude-flow-history');
    this.loadHistory();
  }

  add(command: string): void {
    if (command.trim() && command !== this.history[this.history.length - 1]) {
      this.history.push(command);
      if (this.history.length > this.maxSize) {
        this.history = this.history.slice(-this.maxSize);
      }
      this.saveHistory();
    }
  }

  get(): string[] {
    return [...this.history];
  }

  search(query: string): string[] {
    return this.history.filter((cmd) => cmd.includes(query));
  }

  private async loadHistory(): Promise<void> {
    try {
      const content = await fs.readFile(this.historyFile, 'utf-8');
      this.history = content.split('\n').filter((line) => line.trim());
    } catch {
      // History file doesn't exist yet
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      await fs.writeFile(this.historyFile, this.history.join('\n'));
    } catch {
      // Ignore save errors
    }
  }
}

/**
 * Start the Node.js interactive REPL
 */
export async function startNodeREPL(options: any = {}): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '',
  });

  const context: REPLContext = {
    options,
    history: [],
    workingDirectory: process.cwd(),
    connectionStatus: 'disconnected',
    lastActivity: new Date(),
    rl,
  };

  const history = new CommandHistory(options.historyFile);

  const commands: REPLCommand[] = [
    {
      name: 'help',
      aliases: ['h', '?'],
      description: 'Show available commands or help for a specific command',
      usage: 'help [command]',
      examples: ['help', 'help agent', 'help task create'],
      handler: async (args) => {
        if (args.length === 0) {
          showHelp(commands);
        } else {
          showCommandHelp(commands, args[0]);
        }
      },
    },
    {
      name: 'status',
      aliases: ['st'],
      description: 'Show system status and connection info',
      usage: 'status [component]',
      examples: ['status', 'status orchestrator'],
      handler: async (args, ctx) => {
        await showSystemStatus(ctx, args[0]);
      },
    },
    {
      name: 'connect',
      aliases: ['conn'],
      description: 'Connect to Claude-Flow orchestrator',
      usage: 'connect [host:port]',
      examples: ['connect', 'connect localhost:3000'],
      handler: async (args, ctx) => {
        await connectToOrchestrator(ctx, args[0]);
      },
    },
    {
      name: 'agent',
      description: 'Agent management (spawn, list, terminate, info)',
      usage: 'agent <subcommand> [options]',
      examples: [
        'agent list',
        'agent spawn researcher --name "Research Agent"',
        'agent info agent-001',
        'agent terminate agent-001',
      ],
      handler: async (args, ctx) => {
        await handleAgentCommand(args, ctx);
      },
    },
    {
      name: 'task',
      description: 'Task management (create, list, status, cancel)',
      usage: 'task <subcommand> [options]',
      examples: [
        'task list',
        'task create research "Find quantum computing papers"',
        'task status task-001',
        'task cancel task-001',
      ],
      handler: async (args, ctx) => {
        await handleTaskCommand(args, ctx);
      },
    },
    {
      name: 'memory',
      description: 'Memory operations (query, stats, export)',
      usage: 'memory <subcommand> [options]',
      examples: ['memory stats', 'memory query --agent agent-001', 'memory export memory.json'],
      handler: async (args, ctx) => {
        await handleMemoryCommand(args, ctx);
      },
    },
    {
      name: 'session',
      description: 'Session management (save, restore, list)',
      usage: 'session <subcommand> [options]',
      examples: [
        'session list',
        'session save "Development Session"',
        'session restore session-001',
      ],
      handler: async (args, ctx) => {
        await handleSessionCommand(args, ctx);
      },
    },
    {
      name: 'workflow',
      description: 'Workflow operations (run, list, status)',
      usage: 'workflow <subcommand> [options]',
      examples: ['workflow list', 'workflow run workflow.json', 'workflow status workflow-001'],
      handler: async (args, ctx) => {
        await handleWorkflowCommand(args, ctx);
      },
    },
    {
      name: 'monitor',
      aliases: ['mon'],
      description: 'Start monitoring mode',
      usage: 'monitor [--interval seconds]',
      examples: ['monitor', 'monitor --interval 5'],
      handler: async (args) => {
        console.log(chalk.cyan('Starting monitor mode...'));
        console.log(chalk.gray('(This would start the live dashboard)'));
      },
    },
    {
      name: 'history',
      aliases: ['hist'],
      description: 'Show command history',
      usage: 'history [--search query]',
      examples: ['history', 'history --search agent'],
      handler: async (args) => {
        const searchQuery =
          args.indexOf('--search') >= 0 ? args[args.indexOf('--search') + 1] : null;
        const historyItems = searchQuery ? history.search(searchQuery) : history.get();

        console.log(
          chalk.cyan.bold(`Command History${searchQuery ? ` (search: ${searchQuery})` : ''}`),
        );
        console.log('─'.repeat(50));

        if (historyItems.length === 0) {
          console.log(chalk.gray('No commands in history'));
          return;
        }

        const recent = historyItems.slice(-20); // Show last 20
        recent.forEach((cmd, i) => {
          const lineNumber = historyItems.length - recent.length + i + 1;
          console.log(`${chalk.gray(lineNumber.toString().padStart(3))} ${cmd}`);
        });
      },
    },
    {
      name: 'clear',
      aliases: ['cls'],
      description: 'Clear the screen',
      handler: async () => {
        console.clear();
      },
    },
    {
      name: 'cd',
      description: 'Change working directory',
      usage: 'cd <directory>',
      examples: ['cd /path/to/project', 'cd ..'],
      handler: async (args, ctx) => {
        if (args.length === 0) {
          console.log(ctx.workingDirectory);
          return;
        }

        try {
          const newDir = args[0] === '~' ? process.env.HOME || '/' : args[0];
          process.chdir(newDir);
          ctx.workingDirectory = process.cwd();
          console.log(chalk.gray(`Changed to: ${ctx.workingDirectory}`));
        } catch (error) {
          console.error(
            chalk.red('Error:'),
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    },
    {
      name: 'pwd',
      description: 'Print working directory',
      handler: async (_, ctx) => {
        console.log(ctx.workingDirectory);
      },
    },
    {
      name: 'echo',
      description: 'Echo arguments',
      usage: 'echo <text>',
      examples: ['echo "Hello, world!"'],
      handler: async (args) => {
        console.log(args.join(' '));
      },
    },
    {
      name: 'exit',
      aliases: ['quit', 'q'],
      description: 'Exit the REPL',
      handler: async (_, ctx) => {
        console.log(chalk.gray('Goodbye!'));
        ctx.rl.close();
        process.exit(0);
      },
    },
  ];

  // Show initial status
  if (options.banner !== false) {
    displayBanner();
  }

  await showSystemStatus(context);
  console.log(chalk.gray('Type "help" for available commands or "exit" to quit.\n'));

  // Main REPL loop
  const processCommand = async (input: string) => {
    if (!input.trim()) {
      return;
    }

    // Add to history
    history.add(input);
    context.history.push(input);
    context.lastActivity = new Date();

    // Parse command
    const args = parseCommand(input);
    const [commandName, ...commandArgs] = args;

    // Find and execute command
    const command = commands.find(
      (c) => c.name === commandName || (c.aliases && c.aliases.includes(commandName)),
    );

    if (command) {
      try {
        await command.handler(commandArgs, context);
      } catch (error) {
        console.error(
          chalk.red('Command failed:'),
          error instanceof Error ? error.message : String(error),
        );
      }
    } else {
      console.log(chalk.red(`Unknown command: ${commandName}`));
      console.log(chalk.gray('Type "help" for available commands'));

      // Suggest similar commands
      const suggestions = findSimilarCommands(commandName, commands);
      if (suggestions.length > 0) {
        console.log(chalk.gray('Did you mean:'), suggestions.map((s) => chalk.cyan(s)).join(', '));
      }
    }
  };

  // Set up readline prompt
  const showPrompt = () => {
    const prompt = createPrompt(context);
    rl.setPrompt(prompt);
    rl.prompt();
  };

  rl.on('line', async (input) => {
    try {
      await processCommand(input);
    } catch (error) {
      console.error(
        chalk.red('REPL Error:'),
        error instanceof Error ? error.message : String(error),
      );
    }
    showPrompt();
  });

  rl.on('close', () => {
    console.log('\n' + chalk.gray('Goodbye!'));
    process.exit(0);
  });

  rl.on('SIGINT', () => {
    console.log('\n' + chalk.gray('Use "exit" to quit or Ctrl+D'));
    showPrompt();
  });

  // Start the REPL
  showPrompt();
}

function displayBanner(): void {
  const banner = `
${chalk.cyan.bold('╔══════════════════════════════════════════════════════════════╗')}
${chalk.cyan.bold('║')}             ${chalk.white.bold('🧠 Claude-Flow REPL')}                        ${chalk.cyan.bold('║')}
${chalk.cyan.bold('║')}          ${chalk.gray('Interactive AI Agent Orchestration')}             ${chalk.cyan.bold('║')}
${chalk.cyan.bold('╚══════════════════════════════════════════════════════════════╝')}
`;
  console.log(banner);
}

function createPrompt(context: REPLContext): string {
  const statusIcon = getConnectionStatusIcon(context.connectionStatus);
  const dir = path.basename(context.workingDirectory) || '/';

  return `${statusIcon} ${chalk.cyan('claude-flow')}:${chalk.yellow(dir)}${chalk.white('> ')}`;
}

function getConnectionStatusIcon(status: string): string {
  switch (status) {
    case 'connected':
      return chalk.green('●');
    case 'connecting':
      return chalk.yellow('◐');
    case 'disconnected':
      return chalk.red('○');
    default:
      return chalk.gray('?');
  }
}

function parseCommand(input: string): string[] {
  // Simple command parsing - handle quoted strings
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
      } else {
        current += char;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuotes = true;
        quoteChar = char;
      } else if (char === ' ' || char === '\t') {
        if (current.trim()) {
          args.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}

function showHelp(commands: REPLCommand[]): void {
  console.log(chalk.cyan.bold('Claude-Flow Interactive REPL'));
  console.log('─'.repeat(50));
  console.log();

  console.log(chalk.white.bold('Available Commands:'));
  console.log();

  const table = new Table({
    head: ['Command', 'Aliases', 'Description'],
    style: { head: ['cyan'] },
  });

  for (const cmd of commands) {
    table.push([
      chalk.cyan(cmd.name),
      cmd.aliases ? chalk.gray(cmd.aliases.join(', ')) : '',
      cmd.description,
    ]);
  }

  console.log(table.toString());
  console.log();

  console.log(chalk.gray('Tips:'));
  console.log(chalk.gray('• Use TAB for command completion'));
  console.log(chalk.gray('• Use "help <command>" for detailed help'));
  console.log(chalk.gray('• Use UP/DOWN arrows for command history'));
  console.log(chalk.gray('• Use Ctrl+C or "exit" to quit'));
}

function showCommandHelp(commands: REPLCommand[], commandName: string): void {
  const command = commands.find(
    (c) => c.name === commandName || (c.aliases && c.aliases.includes(commandName)),
  );

  if (!command) {
    console.log(chalk.red(`Unknown command: ${commandName}`));
    return;
  }

  console.log(chalk.cyan.bold(`Command: ${command.name}`));
  console.log('─'.repeat(30));
  console.log(`${chalk.white('Description:')} ${command.description}`);

  if (command.aliases) {
    console.log(`${chalk.white('Aliases:')} ${command.aliases.join(', ')}`);
  }

  if (command.usage) {
    console.log(`${chalk.white('Usage:')} ${command.usage}`);
  }

  if (command.examples) {
    console.log();
    console.log(chalk.white.bold('Examples:'));
    for (const example of command.examples) {
      console.log(`  ${chalk.gray('$')} ${chalk.cyan(example)}`);
    }
  }
}

async function showSystemStatus(context: REPLContext, component?: string): Promise<void> {
  console.log(chalk.cyan.bold('System Status'));
  console.log('─'.repeat(30));

  const statusIcon = context.connectionStatus === 'connected' ? chalk.green('✓') : chalk.red('✗');
  console.log(`${statusIcon} Connection: ${context.connectionStatus}`);
  console.log(`${chalk.white('Working Directory:')} ${context.workingDirectory}`);
  console.log(`${chalk.white('Last Activity:')} ${context.lastActivity.toLocaleTimeString()}`);

  if (context.currentSession) {
    console.log(`${chalk.white('Current Session:')} ${context.currentSession}`);
  }

  console.log(`${chalk.white('Commands in History:')} ${context.history.length}`);

  if (context.connectionStatus === 'disconnected') {
    console.log();
    console.log(chalk.yellow('⚠ Not connected to orchestrator'));
    console.log(chalk.gray('Use "connect" command to establish connection'));
  }
}

async function connectToOrchestrator(context: REPLContext, target?: string): Promise<void> {
  const host = target || 'localhost:3000';

  console.log(chalk.yellow(`Connecting to ${host}...`));
  context.connectionStatus = 'connecting';

  // Mock connection attempt
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if orchestrator is actually running by trying to execute status command
  try {
    const result = await executeCliCommand(['status']);
    if (result.success) {
      context.connectionStatus = 'connected';
      console.log(chalk.green('✓ Connected successfully'));
    } else {
      context.connectionStatus = 'disconnected';
      console.log(chalk.red('✗ Connection failed'));
      console.log(chalk.gray('Make sure Claude-Flow is running with: npx claude-flow start'));
    }
  } catch (error) {
    context.connectionStatus = 'disconnected';
    console.log(chalk.red('✗ Connection failed'));
    console.log(chalk.gray('Make sure Claude-Flow is running with: npx claude-flow start'));
  }
}

async function executeCliCommand(args: string[]): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', 'src/cli/simple-cli.ts', ...args], {
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    let output = '';
    let error = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      error += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output: output || error,
      });
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        output: err.message,
      });
    });
  });
}

async function handleAgentCommand(args: string[], context: REPLContext): Promise<void> {
  if (context.connectionStatus !== 'connected') {
    console.log(chalk.yellow('⚠ Not connected to orchestrator'));
    console.log(chalk.gray('Use "connect" to establish connection first'));
    return;
  }

  if (args.length === 0) {
    console.log(chalk.gray('Usage: agent <spawn|list|terminate|info> [options]'));
    return;
  }

  const subcommand = args[0];
  const cliArgs = ['agent', ...args];

  try {
    const result = await executeCliCommand(cliArgs);
    console.log(result.output);
  } catch (error) {
    console.error(
      chalk.red('Error executing agent command:'),
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function handleTaskCommand(args: string[], context: REPLContext): Promise<void> {
  if (context.connectionStatus !== 'connected') {
    console.log(chalk.yellow('⚠ Not connected to orchestrator'));
    return;
  }

  if (args.length === 0) {
    console.log(chalk.gray('Usage: task <create|list|status|cancel> [options]'));
    return;
  }

  const cliArgs = ['task', ...args];

  try {
    const result = await executeCliCommand(cliArgs);
    console.log(result.output);
  } catch (error) {
    console.error(
      chalk.red('Error executing task command:'),
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function handleMemoryCommand(args: string[], context: REPLContext): Promise<void> {
  if (args.length === 0) {
    console.log(chalk.gray('Usage: memory <query|stats|export> [options]'));
    return;
  }

  const cliArgs = ['memory', ...args];

  try {
    const result = await executeCliCommand(cliArgs);
    console.log(result.output);
  } catch (error) {
    console.error(
      chalk.red('Error executing memory command:'),
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function handleSessionCommand(args: string[], context: REPLContext): Promise<void> {
  if (args.length === 0) {
    console.log(chalk.gray('Usage: session <list|save|restore> [options]'));
    return;
  }

  const cliArgs = ['session', ...args];

  try {
    const result = await executeCliCommand(cliArgs);
    console.log(result.output);
  } catch (error) {
    console.error(
      chalk.red('Error executing session command:'),
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function handleWorkflowCommand(args: string[], context: REPLContext): Promise<void> {
  if (context.connectionStatus !== 'connected') {
    console.log(chalk.yellow('⚠ Not connected to orchestrator'));
    return;
  }

  if (args.length === 0) {
    console.log(chalk.gray('Usage: workflow <list|run|status> [options]'));
    return;
  }

  const cliArgs = ['workflow', ...args];

  try {
    const result = await executeCliCommand(cliArgs);
    console.log(result.output);
  } catch (error) {
    console.error(
      chalk.red('Error executing workflow command:'),
      error instanceof Error ? error.message : String(error),
    );
  }
}

function findSimilarCommands(input: string, commands: REPLCommand[]): string[] {
  const allNames = commands.flatMap((c) => [c.name, ...(c.aliases || [])]);

  return allNames
    .filter((name) => {
      // Simple similarity check - could use Levenshtein distance
      const commonChars = input.split('').filter((char) => name.includes(char)).length;
      return commonChars >= Math.min(2, input.length / 2);
    })
    .slice(0, 3); // Top 3 suggestions
}
