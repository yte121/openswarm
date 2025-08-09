/**
 * Standardized help system for Claude-Flow CLI
 * Follows Unix/Linux conventions for help output
 */

import { Command } from 'commander';
import { HelpFormatter, CommandInfo, CommandItem, OptionItem } from '../help-formatter.js';
import chalk from 'chalk';
import Table from 'cli-table3';
import inquirer from 'inquirer';

export const helpCommand = new Command()
  .name('help')
  .description('Show help information')
  .argument('[command]', 'Command to show help for')
  .option('--all', 'Show all available commands')
  .action(async (command?: string, options?: any) => {
    if (command) {
      showCommandHelp(command);
    } else {
      showMainHelp();
    }
  });

// Command-specific help definitions will be added here as needed
const HELP_TOPICS = [
  {
    name: 'getting-started',
    description: 'Basic introduction to Claude-Flow',
    category: 'basic',
    tutorial: [
      'Welcome to Claude-Flow! This tutorial will get you started.',
      '1. First, initialize a configuration file:',
      '   claude-flow config init',
      '',
      '2. Start the orchestration system:',
      '   claude-flow start',
      '',
      '3. In another terminal, spawn your first agent:',
      '   claude-flow agent spawn researcher --name "My Research Agent"',
      '',
      '4. Create a task for the agent:',
      '   claude-flow task create research "Find information about AI trends"',
      '',
      '5. Monitor progress:',
      '   claude-flow status',
      '',
      'You can also use the interactive REPL mode:',
      '   claude-flow repl',
      '',
      'For more help, try: claude-flow help <topic>',
    ],
    related: ['agents', 'tasks', 'configuration'],
  },
  {
    name: 'agents',
    description: 'Working with Claude-Flow agents',
    category: 'basic',
    examples: [
      {
        description: 'Spawn a research agent',
        command: 'claude-flow agent spawn researcher --name "Research Assistant"',
        explanation:
          'Creates a new research agent with specialized capabilities for information gathering',
      },
      {
        description: 'List all active agents',
        command: 'claude-flow agent list',
        explanation: 'Shows all currently running agents with their status and task counts',
      },
      {
        description: 'Get detailed agent information',
        command: 'claude-flow agent info agent-001',
        explanation: 'Displays comprehensive information about a specific agent',
      },
      {
        description: 'Terminate an agent',
        command: 'claude-flow agent terminate agent-001',
        explanation: 'Safely shuts down an agent and reassigns its tasks',
      },
    ],
    tutorial: [
      'Agents are the core workers in Claude-Flow. Each agent has:',
      '• A unique ID (automatically generated)',
      '• A name (for easy identification)',
      '• A type (coordinator, researcher, implementer, analyst, custom)',
      '• Capabilities (what the agent can do)',
      '• A system prompt (instructions for the agent)',
      '',
      'Agent Types:',
      '• coordinator: Plans and delegates tasks',
      '• researcher: Gathers and analyzes information',
      '• implementer: Writes code and creates solutions',
      '• analyst: Identifies patterns and generates insights',
      '• custom: User-defined behavior',
      '',
      'Best Practices:',
      '• Use descriptive names for your agents',
      '• Match agent types to your workflow needs',
      '• Monitor agent performance with "claude-flow status"',
      '• Terminate idle agents to free resources',
    ],
    related: ['tasks', 'workflows', 'coordination'],
  },
  {
    name: 'tasks',
    description: 'Creating and managing tasks',
    category: 'basic',
    examples: [
      {
        description: 'Create a research task',
        command: 'claude-flow task create research "Find papers on quantum computing" --priority 5',
        explanation: 'Creates a high-priority research task with specific instructions',
      },
      {
        description: 'Create a task with dependencies',
        command:
          'claude-flow task create analysis "Analyze research results" --dependencies task-001',
        explanation: 'Creates a task that waits for task-001 to complete before starting',
      },
      {
        description: 'Assign task to specific agent',
        command: 'claude-flow task create implementation "Write API client" --assign agent-003',
        explanation: 'Directly assigns a task to a specific agent',
      },
      {
        description: 'Monitor task progress',
        command: 'claude-flow task status task-001',
        explanation: 'Shows detailed status and progress information for a task',
      },
      {
        description: 'Cancel a running task',
        command: 'claude-flow task cancel task-001 --reason "Requirements changed"',
        explanation: 'Stops a task and provides a reason for cancellation',
      },
    ],
    tutorial: [
      'Tasks are units of work that agents execute. Key concepts:',
      '',
      'Task Properties:',
      '• ID: Unique identifier',
      '• Type: Category of work (research, implementation, analysis, etc.)',
      '• Description: What needs to be done',
      '• Priority: Execution order (0-10, higher = more urgent)',
      '• Dependencies: Tasks that must complete first',
      '• Input: Data needed by the task',
      '• Status: Current state (pending, running, completed, failed)',
      '',
      'Task Lifecycle:',
      '1. Created (pending status)',
      '2. Queued (waiting for agent)',
      '3. Assigned (agent selected)',
      '4. Running (actively being worked on)',
      '5. Completed/Failed (final state)',
      '',
      'Task Dependencies:',
      '• Tasks can depend on other tasks',
      '• Dependencies must complete before task starts',
      '• Use for sequential workflows',
      '• Circular dependencies are not allowed',
    ],
    related: ['agents', 'workflows', 'coordination'],
  },
  {
    name: 'claude',
    description: 'Spawning Claude instances with specific configurations',
    category: 'basic',
    examples: [
      {
        description: 'Spawn Claude with web research capabilities',
        command: 'claude-flow claude spawn "implement user authentication" --research --parallel',
        explanation:
          'Creates a Claude instance with WebFetchTool and BatchTool for parallel web research',
      },
      {
        description: 'Spawn Claude without permission prompts',
        command: 'claude-flow claude spawn "fix payment bug" --no-permissions',
        explanation: 'Runs Claude with --dangerously-skip-permissions flag to avoid interruptions',
      },
      {
        description: 'Spawn Claude with custom tools',
        command: 'claude-flow claude spawn "analyze codebase" --tools "View,Edit,GrepTool,LS"',
        explanation: 'Specifies exactly which tools Claude can use for the task',
      },
      {
        description: 'Spawn Claude with test coverage target',
        command: 'claude-flow claude spawn "write unit tests" --coverage 95 --commit feature',
        explanation: 'Sets test coverage goal to 95% and commits after each feature',
      },
      {
        description: 'Dry run to preview command',
        command: 'claude-flow claude spawn "build API" --mode backend-only --dry-run',
        explanation: 'Shows what would be executed without actually running Claude',
      },
    ],
    tutorial: [
      'The claude spawn command launches Claude instances with specific configurations.',
      '',
      'Available Options:',
      '• --tools, -t: Specify allowed tools (default: View,Edit,Replace,GlobTool,GrepTool,LS,Bash)',
      '• --no-permissions: Skip permission prompts with --dangerously-skip-permissions',
      '• --config, -c: Path to MCP configuration file',
      '• --mode, -m: Development mode (full, backend-only, frontend-only, api-only)',
      '• --parallel: Enable BatchTool and dispatch_agent for parallel execution',
      '• --research: Enable WebFetchTool for web research capabilities',
      '• --coverage: Test coverage target percentage (default: 80)',
      '• --commit: Commit frequency (phase, feature, manual)',
      '• --verbose, -v: Enable verbose output',
      '• --dry-run, -d: Preview what would be executed',
      '',
      'Environment Variables Set:',
      '• CLAUDE_INSTANCE_ID: Unique identifier for the Claude instance',
      '• CLAUDE_FLOW_MODE: Development mode setting',
      '• CLAUDE_FLOW_COVERAGE: Target test coverage percentage',
      '• CLAUDE_FLOW_COMMIT: Commit frequency setting',
      '',
      'Common Use Cases:',
      '• Full-stack development: --mode full --parallel',
      '• API development: --mode backend-only --coverage 90',
      '• Bug fixing: --no-permissions --verbose',
      '• Research tasks: --research --parallel',
      '• Test writing: --coverage 95 --commit feature',
    ],
    related: ['agents', 'tasks', 'workflows'],
  },
  {
    name: 'workflows',
    description: 'Building complex multi-step workflows',
    category: 'workflow',
    examples: [
      {
        description: 'Run a workflow from file',
        command: 'claude-flow workflow run research-pipeline.json --watch',
        explanation: 'Executes a workflow definition and monitors progress in real-time',
      },
      {
        description: 'Validate workflow before running',
        command: 'claude-flow workflow validate my-workflow.json --strict',
        explanation: 'Checks workflow syntax and dependencies without executing',
      },
      {
        description: 'Generate workflow template',
        command: 'claude-flow workflow template research --output research-workflow.json',
        explanation: 'Creates a pre-configured workflow template for research tasks',
      },
      {
        description: 'Monitor running workflows',
        command: 'claude-flow workflow list --all',
        explanation: 'Shows all workflows including completed ones',
      },
      {
        description: 'Stop a running workflow',
        command: 'claude-flow workflow stop workflow-001 --force',
        explanation: 'Immediately stops all tasks in a workflow',
      },
    ],
    tutorial: [
      'Workflows orchestrate multiple tasks and agents. Structure:',
      '',
      'Workflow Definition (JSON):',
      '{',
      '  "name": "Research and Analysis",',
      '  "description": "Multi-stage research workflow",',
      '  "agents": [',
      '    {"id": "researcher", "type": "researcher"},',
      '    {"id": "analyzer", "type": "analyst"}',
      '  ],',
      '  "tasks": [',
      '    {',
      '      "id": "research-task",',
      '      "type": "research",',
      '      "description": "Gather information",',
      '      "assignTo": "researcher"',
      '    },',
      '    {',
      '      "id": "analyze-task",',
      '      "type": "analysis",',
      '      "description": "Analyze findings",',
      '      "assignTo": "analyzer",',
      '      "depends": ["research-task"]',
      '    }',
      '  ]',
      '}',
      '',
      'Workflow Features:',
      '• Variable substitution: ${variable}',
      '• Conditional execution',
      '• Parallel task execution',
      '• Error handling and retries',
      '• Progress monitoring',
      '',
      'Best Practices:',
      '• Start with simple workflows',
      '• Use descriptive task names',
      '• Plan dependencies carefully',
      '• Test with --dry-run first',
    ],
    related: ['tasks', 'agents', 'templates'],
  },
  {
    name: 'configuration',
    description: 'Configuring Claude-Flow settings',
    category: 'configuration',
    examples: [
      {
        description: 'Initialize default configuration',
        command: 'claude-flow config init --template development',
        explanation: 'Creates a configuration file optimized for development',
      },
      {
        description: 'View current configuration',
        command: 'claude-flow config show --diff',
        explanation: 'Shows only settings that differ from defaults',
      },
      {
        description: 'Update a setting',
        command: 'claude-flow config set orchestrator.maxConcurrentAgents 20',
        explanation: 'Changes the maximum number of concurrent agents',
      },
      {
        description: 'Save configuration profile',
        command: 'claude-flow config profile save production',
        explanation: 'Saves current settings as a named profile',
      },
      {
        description: 'Load configuration profile',
        command: 'claude-flow config profile load development',
        explanation: 'Switches to a previously saved configuration profile',
      },
    ],
    tutorial: [
      'Configuration controls all aspects of Claude-Flow behavior.',
      '',
      'Main Configuration Sections:',
      '',
      '• orchestrator: Core system settings',
      '  - maxConcurrentAgents: How many agents can run simultaneously',
      '  - taskQueueSize: Maximum pending tasks',
      '  - healthCheckInterval: How often to check system health',
      '',
      '• terminal: Terminal integration settings',
      '  - type: Terminal type (auto, vscode, native)',
      '  - poolSize: Number of terminal sessions to maintain',
      '',
      '• memory: Memory management settings',
      '  - backend: Storage type (sqlite, markdown, hybrid)',
      '  - cacheSizeMB: Memory cache size',
      '  - retentionDays: How long to keep data',
      '',
      '• mcp: Model Context Protocol settings',
      '  - transport: Communication method (stdio, http)',
      '  - port: Network port for HTTP transport',
      '',
      'Configuration Files:',
      '• Global: ~/.claude-flow/config.json',
      '• Project: ./claude-flow.config.json',
      '• Profiles: ~/.claude-flow/profiles/',
      '',
      'Environment Variables:',
      '• CLAUDE_FLOW_LOG_LEVEL: Override log level',
      '• CLAUDE_FLOW_MAX_AGENTS: Override agent limit',
      '• CLAUDE_FLOW_MCP_PORT: Override MCP port',
    ],
    related: ['profiles', 'environment', 'troubleshooting'],
  },
  {
    name: 'monitoring',
    description: 'Monitoring system health and performance',
    category: 'advanced',
    examples: [
      {
        description: 'Check system status',
        command: 'claude-flow status --watch',
        explanation: 'Continuously monitors system health and updates every few seconds',
      },
      {
        description: 'Start monitoring dashboard',
        command: 'claude-flow monitor --interval 5',
        explanation: 'Opens a live dashboard with real-time metrics and graphs',
      },
      {
        description: 'View component-specific status',
        command: 'claude-flow status --component orchestrator',
        explanation: 'Shows detailed status for a specific system component',
      },
      {
        description: 'Monitor in compact mode',
        command: 'claude-flow monitor --compact --no-graphs',
        explanation: 'Simplified monitoring view without visual graphs',
      },
    ],
    tutorial: [
      'Claude-Flow provides comprehensive monitoring capabilities.',
      '',
      'Monitoring Commands:',
      '• status: Point-in-time system status',
      '• monitor: Live dashboard with continuous updates',
      '',
      'Key Metrics:',
      '• System Health: Overall status (healthy/degraded/unhealthy)',
      '• Resource Usage: CPU, memory, agent count',
      '• Component Status: Individual system components',
      '• Agent Activity: Active agents and their tasks',
      '• Task Queue: Pending and completed tasks',
      '• Performance Graphs: Historical trends',
      '',
      'Monitoring Best Practices:',
      '• Check status before starting large workflows',
      '• Monitor during heavy usage',
      '• Watch for resource exhaustion',
      '• Track task completion rates',
      '• Set up alerts for critical issues',
      '',
      'Troubleshooting with Monitoring:',
      '• High CPU: Too many concurrent tasks',
      '• High Memory: Large cache or memory leaks',
      '• Failed Tasks: Agent or system issues',
      '• Slow Performance: Resource constraints',
    ],
    related: ['status', 'performance', 'troubleshooting'],
  },
  {
    name: 'sessions',
    description: 'Managing sessions and state persistence',
    category: 'advanced',
    examples: [
      {
        description: 'Save current session',
        command:
          'claude-flow session save "Development Session" --description "Working on API integration"',
        explanation: 'Saves all current agents, tasks, and memory state',
      },
      {
        description: 'List saved sessions',
        command: 'claude-flow session list',
        explanation: 'Shows all saved sessions with creation dates and metadata',
      },
      {
        description: 'Restore a session',
        command: 'claude-flow session restore session-001 --merge',
        explanation: 'Restores session state, merging with current state',
      },
      {
        description: 'Export session to file',
        command: 'claude-flow session export session-001 backup.json --include-memory',
        explanation: 'Creates a portable backup including agent memory',
      },
      {
        description: 'Clean up old sessions',
        command: 'claude-flow session clean --older-than 30 --dry-run',
        explanation: 'Shows what sessions would be deleted (older than 30 days)',
      },
    ],
    tutorial: [
      'Sessions capture the complete state of your Claude-Flow environment.',
      '',
      'What Sessions Include:',
      '• All active agents and their configurations',
      '• Current task queue and status',
      '• Agent memory and conversation history',
      '• System configuration snapshot',
      '',
      'Session Use Cases:',
      '• Save work-in-progress',
      '• Share team configurations',
      '• Backup before major changes',
      '• Reproduce issues for debugging',
      '• Switch between projects',
      '',
      'Session Management:',
      '• Automatic checksums for integrity',
      '• Compression for large sessions',
      '• Selective restore (agents only, tasks only)',
      '• Version compatibility checking',
      '',
      'Best Practices:',
      '• Save sessions before major changes',
      '• Use descriptive names and tags',
      '• Regular cleanup of old sessions',
      '• Export important sessions as backups',
      '• Test restore before relying on sessions',
    ],
    related: ['backup', 'state', 'persistence'],
  },
  {
    name: 'repl',
    description: 'Using the interactive REPL mode',
    category: 'basic',
    examples: [
      {
        description: 'Start REPL mode',
        command: 'claude-flow repl',
        explanation: 'Opens interactive command line with tab completion',
      },
      {
        description: 'REPL with custom history file',
        command: 'claude-flow repl --history-file .my-history',
        explanation: 'Uses a specific file for command history',
      },
      {
        description: 'Skip welcome banner',
        command: 'claude-flow repl --no-banner',
        explanation: 'Starts REPL in minimal mode',
      },
    ],
    tutorial: [
      'The REPL (Read-Eval-Print Loop) provides an interactive interface.',
      '',
      'REPL Features:',
      '• Tab completion for commands and arguments',
      '• Command history (up/down arrows)',
      '• Real-time connection status',
      '• Built-in help system',
      '• Command aliases and shortcuts',
      '',
      'Special REPL Commands:',
      '• help: Show available commands',
      '• status: Check system status',
      '• connect: Connect to orchestrator',
      '• history: View command history',
      '• clear: Clear screen',
      '• cd/pwd: Navigate directories',
      '',
      'REPL Tips:',
      '• Use tab completion extensively',
      '• Check connection status regularly',
      '• Use "help <command>" for detailed help',
      '• History is saved between sessions',
      '• Ctrl+C or "exit" to quit',
    ],
    related: ['completion', 'interactive', 'commands'],
  },
  {
    name: 'troubleshooting',
    description: 'Diagnosing and fixing common issues',
    category: 'troubleshooting',
    examples: [
      {
        description: 'Check system health',
        command: 'claude-flow status --component all',
        explanation: 'Comprehensive health check of all components',
      },
      {
        description: 'Enable debug logging',
        command: 'claude-flow start --log-level debug',
        explanation: 'Start with verbose logging for debugging',
      },
      {
        description: 'Validate configuration',
        command: 'claude-flow config validate claude-flow.config.json --strict',
        explanation: 'Check configuration file for errors',
      },
      {
        description: 'Reset to defaults',
        command: 'claude-flow config reset --confirm',
        explanation: 'Restore default configuration settings',
      },
    ],
    tutorial: [
      'Common issues and solutions:',
      '',
      'Connection Issues:',
      '• Problem: "Connection refused" errors',
      '• Solution: Ensure Claude-Flow is started with "claude-flow start"',
      '• Check: MCP transport settings match between client and server',
      '',
      'Agent Issues:',
      '• Problem: Agents not spawning',
      '• Solution: Check agent limits in configuration',
      '• Check: Available system resources',
      '',
      'Task Issues:',
      '• Problem: Tasks stuck in pending state',
      '• Solution: Verify agent availability and task dependencies',
      '• Check: Task queue size limits',
      '',
      'Performance Issues:',
      '• Problem: Slow response times',
      '• Solution: Reduce concurrent agents or increase resources',
      '• Check: Memory usage and cache settings',
      '',
      'Configuration Issues:',
      '• Problem: Settings not taking effect',
      '• Solution: Validate configuration file syntax',
      '• Check: Environment variable overrides',
      '',
      'Debug Commands:',
      '• claude-flow status: System health check',
      '• claude-flow config validate: Configuration check',
      '• claude-flow --verbose: Enable detailed logging',
      '• claude-flow monitor: Real-time diagnostics',
    ],
    related: ['monitoring', 'configuration', 'debugging'],
  },
];

function showMainHelp(): void {
  const mainHelp: CommandInfo = {
    name: 'claude-flow',
    description: 'Advanced AI agent orchestration system',
    usage: `claude-flow <command> [<args>] [options]
    claude-flow <command> --help
    claude-flow --version`,
    commands: [
      {
        name: 'hive-mind',
        description: 'Manage hive mind swarm intelligence',
      },
      {
        name: 'init',
        description: 'Initialize Claude Flow configuration',
      },
      {
        name: 'start',
        description: 'Start orchestration system',
      },
      {
        name: 'swarm',
        description: 'Execute multi-agent swarm coordination',
      },
      {
        name: 'agent',
        description: 'Manage individual agents',
      },
      {
        name: 'sparc',
        description: 'Execute SPARC development modes',
      },
      {
        name: 'memory',
        description: 'Manage persistent memory operations',
      },
      {
        name: 'github',
        description: 'Automate GitHub workflows',
      },
      {
        name: 'status',
        description: 'Show system status and health',
      },
      {
        name: 'config',
        description: 'Manage configuration settings',
      },
      {
        name: 'session',
        description: 'Manage sessions and state persistence',
      },
      {
        name: 'help',
        description: 'Show help information',
      },
    ],
    globalOptions: [
      {
        flags: '--config <path>',
        description: 'Configuration file path',
        defaultValue: '.claude/config.json',
      },
      {
        flags: '--verbose',
        description: 'Enable verbose output',
      },
      {
        flags: '--quiet',
        description: 'Suppress non-error output',
      },
      {
        flags: '--json',
        description: 'Output in JSON format',
      },
      {
        flags: '--help',
        description: 'Show help information',
      },
      {
        flags: '--version',
        description: 'Show version information',
      },
    ],
    examples: [
      'claude-flow init --sparc',
      'claude-flow hive-mind wizard',
      'claude-flow swarm "Build REST API"',
      'claude-flow status --json',
    ],
  };

  console.log(HelpFormatter.formatHelp(mainHelp));
}

function showCommandHelp(command: string): void {
  const commandHelp = getCommandHelp(command);
  if (commandHelp) {
    console.log(HelpFormatter.formatHelp(commandHelp));
  } else {
    console.error(
      HelpFormatter.formatError(
        `Unknown command: ${command}`,
        'claude-flow help',
        'claude-flow help [command]',
      ),
    );
  }
}

function getCommandHelp(command: string): CommandInfo | null {
  const commandHelpMap: Record<string, CommandInfo> = {
    'hive-mind': {
      name: 'claude-flow hive-mind',
      description: 'Manage hive mind swarm intelligence',
      usage: 'claude-flow hive-mind <subcommand> [options]',
      commands: [
        { name: 'init', description: 'Initialize hive mind system' },
        { name: 'spawn', description: 'Create intelligent swarm with objective' },
        { name: 'status', description: 'View active swarms and metrics' },
        { name: 'stop', description: 'Stop a running swarm' },
        { name: 'ps', description: 'List all running processes' },
        { name: 'resume', description: 'Resume a paused swarm' },
        { name: 'wizard', description: 'Interactive setup wizard' },
      ],
      options: [
        {
          flags: '--queen-type <type>',
          description: 'Queen coordination type',
          defaultValue: 'adaptive',
          validValues: ['strategic', 'tactical', 'adaptive'],
        },
        {
          flags: '--workers <count>',
          description: 'Number of worker agents',
          defaultValue: '5',
        },
        {
          flags: '--timeout <seconds>',
          description: 'Operation timeout',
          defaultValue: '300',
        },
        {
          flags: '--no-consensus',
          description: 'Disable consensus requirements',
        },
        {
          flags: '--help',
          description: 'Show this help message',
        },
      ],
      examples: [
        'claude-flow hive-mind spawn "Build REST API" --queen-type strategic',
        'claude-flow hive-mind status --json',
        'claude-flow hive-mind stop swarm-123',
      ],
    },
    agent: {
      name: 'claude-flow agent',
      description: 'Manage individual agents',
      usage: 'claude-flow agent <action> [options]',
      commands: [
        { name: 'spawn', description: 'Create a new agent' },
        { name: 'list', description: 'List all active agents' },
        { name: 'info', description: 'Show agent details' },
        { name: 'terminate', description: 'Stop an agent' },
      ],
      options: [
        {
          flags: '--type <type>',
          description: 'Agent type',
          validValues: ['coordinator', 'researcher', 'coder', 'analyst', 'tester'],
        },
        {
          flags: '--name <name>',
          description: 'Agent name',
        },
        {
          flags: '--json',
          description: 'Output in JSON format',
        },
        {
          flags: '--help',
          description: 'Show this help message',
        },
      ],
      examples: [
        'claude-flow agent spawn researcher --name "Research Bot"',
        'claude-flow agent list --json',
        'claude-flow agent terminate agent-123',
      ],
    },
  };

  return commandHelpMap[command] || null;
}

function showAllTopics(): void {
  console.log(chalk.cyan.bold('All Help Topics'));
  console.log('─'.repeat(50));

  const table = new (Table as any)({
    head: ['Topic', 'Category', 'Description'],
    style: { head: ['cyan'] },
  });

  for (const topic of HELP_TOPICS) {
    table.push([chalk.cyan(topic.name), chalk.yellow(topic.category), topic.description]);
  }

  console.log(table.toString());

  console.log();
  console.log(chalk.gray('Use "claude-flow help <topic>" for detailed information.'));
}

async function showTopicHelp(topicName: string, options: any): Promise<void> {
  const topic = HELP_TOPICS.find((t) => t.name === topicName);

  if (!topic) {
    console.log(chalk.red(`Help topic '${topicName}' not found.`));
    console.log();

    // Suggest similar topics
    const similar = HELP_TOPICS.filter(
      (t) =>
        t.name.includes(topicName) || t.description.toLowerCase().includes(topicName.toLowerCase()),
    );

    if (similar.length > 0) {
      console.log(chalk.gray('Did you mean:'));
      for (const suggestion of similar) {
        console.log(chalk.cyan(`  ${suggestion.name}`));
      }
    } else {
      console.log(chalk.gray('Use "claude-flow help --all" to see all topics.'));
    }
    return;
  }

  console.log(chalk.cyan.bold(`Help: ${topic.name}`));
  console.log('─'.repeat(50));
  console.log(chalk.white(topic.description));
  console.log();

  if (options.tutorial && topic.tutorial) {
    console.log(chalk.yellow.bold('Tutorial:'));
    console.log('─'.repeat(20));
    for (const line of topic.tutorial) {
      if (line.trim().startsWith('claude-flow')) {
        console.log(chalk.cyan(`  ${line}`));
      } else if (line.trim() === '') {
        console.log();
      } else {
        console.log(chalk.white(line));
      }
    }
    console.log();
  }

  if (options.examples && topic.examples) {
    console.log(chalk.yellow.bold('Examples:'));
    console.log('─'.repeat(20));
    for (const example of topic.examples) {
      console.log(chalk.white.bold(`${example.description}:`));
      console.log(chalk.cyan(`  ${example.command}`));
      if (example.explanation) {
        console.log(chalk.gray(`  ${example.explanation}`));
      }
      console.log();
    }
  }

  if (!options.examples && !options.tutorial) {
    // Show both by default
    if (topic.tutorial) {
      console.log(chalk.yellow.bold('Overview:'));
      console.log('─'.repeat(20));
      const overview = topic.tutorial.slice(0, 5);
      for (const line of overview) {
        if (line.trim() === '') {
          console.log();
        } else {
          console.log(chalk.white(line));
        }
      }
      console.log();
      console.log(chalk.gray('Use --tutorial for complete tutorial.'));
      console.log();
    }

    if (topic.examples) {
      console.log(chalk.yellow.bold('Common Examples:'));
      console.log('─'.repeat(20));
      const commonExamples = topic.examples.slice(0, 3);
      for (const example of commonExamples) {
        console.log(chalk.cyan(`  ${example.command}`));
        console.log(chalk.gray(`    ${example.description}`));
      }
      if (topic.examples.length > 3) {
        console.log(chalk.gray(`    ... and ${topic.examples.length - 3} more`));
      }
      console.log();
      console.log(chalk.gray('Use --examples for all examples.'));
      console.log();
    }
  }

  if (topic.related && topic.related.length > 0) {
    console.log(chalk.yellow.bold('Related Topics:'));
    console.log('─'.repeat(20));
    for (const related of topic.related) {
      console.log(chalk.cyan(`  claude-flow help ${related}`));
    }
    console.log();
  }
}

async function startInteractiveHelp(): Promise<void> {
  console.log(chalk.cyan.bold('Interactive Help Mode'));
  console.log('─'.repeat(30));
  console.log();

  while (true) {
    const categories = [
      { name: 'Getting Started', value: 'getting-started' },
      { name: 'Agents', value: 'agents' },
      { name: 'Tasks', value: 'tasks' },
      { name: 'Workflows', value: 'workflows' },
      { name: 'Configuration', value: 'configuration' },
      { name: 'Monitoring', value: 'monitoring' },
      { name: 'Sessions', value: 'sessions' },
      { name: 'REPL Mode', value: 'repl' },
      { name: 'Troubleshooting', value: 'troubleshooting' },
      { name: 'Browse All Topics', value: 'all' },
      { name: 'Exit', value: 'exit' },
    ];

    const result = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'What would you like help with?',
        choices: categories,
      },
    ]);

    const choice = result.choice;

    if (choice === 'exit') {
      console.log(chalk.gray('Goodbye!'));
      break;
    }

    console.log();

    if (choice === 'all') {
      showAllTopics();
    } else {
      await showTopicHelp(choice, { tutorial: true, examples: true });
    }

    console.log();
    console.log(chalk.gray('Press Enter to continue...'));
    await new Promise((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve(undefined);
      });
    });

    console.clear();
  }
}
