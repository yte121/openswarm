#!/usr/bin/env node

/**
 * Enhanced Swarm UI with real-time monitoring and control
 * Uses blessed for terminal UI
 */

const blessed = require('blessed');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class SwarmUI {
  constructor() {
    this.screen = null;
    this.swarmData = {
      objectives: [],
      agents: [],
      tasks: [],
      status: 'idle',
    };
    this.selectedObjective = null;
    this.updateInterval = null;
    this.logBuffer = [];
    this.maxLogLines = 100;
    this.activeProcesses = new Map(); // Track active processes for cross-platform termination
  }

  async init() {
    // Create blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Claude Flow - Swarm Control Center',
    });

    this.createLayout();
    this.bindEvents();
    this.startMonitoring();

    this.screen.render();
  }

  createLayout() {
    // Main container
    const mainBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'cyan',
        },
      },
    });

    // Header
    this.headerBox = blessed.box({
      parent: mainBox,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '{center}🐝 Claude Flow Swarm Control Center{/center}',
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue',
      },
    });

    // Status bar
    this.statusBox = blessed.box({
      parent: mainBox,
      top: 2,
      left: 0,
      width: '100%',
      height: 1,
      content: 'Status: Initializing...',
      style: {
        fg: 'yellow',
      },
    });

    // Left panel - Objectives and Agents
    const leftPanel = blessed.box({
      parent: mainBox,
      top: 3,
      left: 0,
      width: '30%',
      height: '70%',
      border: {
        type: 'line',
      },
      label: ' Objectives & Agents ',
      style: {
        border: {
          fg: 'green',
        },
      },
    });

    // Objectives list
    this.objectivesList = blessed.list({
      parent: leftPanel,
      top: 0,
      left: 0,
      width: '100%',
      height: '50%',
      label: ' Objectives ',
      items: ['No objectives'],
      keys: true,
      vi: true,
      mouse: true,
      style: {
        selected: {
          bg: 'blue',
        },
        item: {
          fg: 'white',
        },
      },
    });

    // Agents list
    this.agentsList = blessed.list({
      parent: leftPanel,
      top: '50%',
      left: 0,
      width: '100%',
      height: '50%',
      label: ' Agents ',
      items: ['No agents'],
      keys: true,
      vi: true,
      mouse: true,
      style: {
        selected: {
          bg: 'green',
        },
        item: {
          fg: 'white',
        },
      },
    });

    // Center panel - Tasks and Details
    const centerPanel = blessed.box({
      parent: mainBox,
      top: 3,
      left: '30%',
      width: '40%',
      height: '70%',
      border: {
        type: 'line',
      },
      label: ' Tasks & Details ',
      style: {
        border: {
          fg: 'yellow',
        },
      },
    });

    // Tasks list
    this.tasksList = blessed.list({
      parent: centerPanel,
      top: 0,
      left: 0,
      width: '100%',
      height: '50%',
      label: ' Tasks ',
      items: ['No tasks'],
      keys: true,
      vi: true,
      mouse: true,
      style: {
        selected: {
          bg: 'yellow',
          fg: 'black',
        },
        item: {
          fg: 'white',
        },
      },
    });

    // Task details
    this.taskDetails = blessed.box({
      parent: centerPanel,
      top: '50%',
      left: 0,
      width: '100%',
      height: '50%',
      label: ' Task Details ',
      content: 'Select a task to view details',
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      style: {
        fg: 'white',
      },
    });

    // Right panel - Logs and Controls
    const rightPanel = blessed.box({
      parent: mainBox,
      top: 3,
      left: '70%',
      width: '30%',
      height: '70%',
      border: {
        type: 'line',
      },
      label: ' Logs & Controls ',
      style: {
        border: {
          fg: 'magenta',
        },
      },
    });

    // Activity logs
    this.logBox = blessed.log({
      parent: rightPanel,
      top: 0,
      left: 0,
      width: '100%',
      height: '60%',
      label: ' Activity Log ',
      tags: true,
      mouse: true,
      scrollable: true,
      alwaysScroll: true,
      style: {
        fg: 'white',
      },
    });

    // Control buttons
    this.controlBox = blessed.box({
      parent: rightPanel,
      top: '60%',
      left: 0,
      width: '100%',
      height: '40%',
      label: ' Controls ',
    });

    // Create objective button
    this.createButton = blessed.button({
      parent: this.controlBox,
      top: 1,
      left: 1,
      width: '90%',
      height: 3,
      content: 'Create Objective',
      align: 'center',
      style: {
        bg: 'blue',
        fg: 'white',
        focus: {
          bg: 'red',
        },
      },
    });

    // Stop swarm button
    this.stopButton = blessed.button({
      parent: this.controlBox,
      top: 5,
      left: 1,
      width: '90%',
      height: 3,
      content: 'Stop Swarm',
      align: 'center',
      style: {
        bg: 'red',
        fg: 'white',
        focus: {
          bg: 'yellow',
          fg: 'black',
        },
      },
    });

    // Bottom panel - Command input
    this.commandBox = blessed.textbox({
      parent: mainBox,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      label: ' Command Input (Press Enter to execute) ',
      keys: true,
      mouse: true,
      inputOnFocus: true,
      style: {
        border: {
          fg: 'cyan',
        },
        fg: 'white',
      },
    });
  }

  bindEvents() {
    // Screen events
    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.cleanup();
      process.exit(0);
    });

    // Objective selection
    this.objectivesList.on('select', (item, index) => {
      this.selectedObjective = this.swarmData.objectives[index];
      this.updateTasksList();
      this.log(`Selected objective: ${this.selectedObjective?.description || 'Unknown'}`);
    });

    // Task selection
    this.tasksList.on('select', (item, index) => {
      const task = this.swarmData.tasks[index];
      if (task) {
        this.updateTaskDetails(task);
      }
    });

    // Create objective button
    this.createButton.on('press', () => {
      this.promptCreateObjective();
    });

    // Stop swarm button
    this.stopButton.on('press', () => {
      this.stopSwarm();
    });

    // Command input
    this.commandBox.on('submit', (value) => {
      this.executeCommand(value);
      this.commandBox.clearValue();
      this.screen.render();
    });

    // Focus management
    this.screen.key(['tab'], () => {
      this.screen.focusNext();
    });

    this.screen.key(['S-tab'], () => {
      this.screen.focusPrevious();
    });
  }

  async startMonitoring() {
    this.log('Starting swarm monitoring...');

    // Update interval
    this.updateInterval = setInterval(() => {
      this.updateSwarmData();
    }, 2000);

    // Initial update
    await this.updateSwarmData();
  }

  async updateSwarmData() {
    try {
      // Load swarm data from file system
      const swarmRunsDir = './swarm-runs';

      try {
        const runs = await fs.readdir(swarmRunsDir);
        this.swarmData.objectives = [];
        this.swarmData.agents = [];
        this.swarmData.tasks = [];

        for (const runDir of runs) {
          const configPath = path.join(swarmRunsDir, runDir, 'config.json');
          try {
            const configData = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configData);

            this.swarmData.objectives.push({
              id: config.swarmId,
              description: config.objective,
              status: 'running',
              startTime: config.startTime,
            });

            // Load agents
            const agentsDir = path.join(swarmRunsDir, runDir, 'agents');
            try {
              const agents = await fs.readdir(agentsDir);
              for (const agentDir of agents) {
                const taskPath = path.join(agentsDir, agentDir, 'task.json');
                try {
                  const taskData = await fs.readFile(taskPath, 'utf-8');
                  const task = JSON.parse(taskData);

                  this.swarmData.agents.push({
                    id: task.agentId,
                    swarmId: config.swarmId,
                    status: task.status || 'active',
                    task: task.task,
                  });

                  this.swarmData.tasks.push(task);
                } catch (e) {
                  // Skip invalid task files
                }
              }
            } catch (e) {
              // No agents directory
            }
          } catch (e) {
            // Skip invalid config files
          }
        }

        this.updateDisplay();
      } catch (e) {
        // No swarm runs directory
        this.swarmData.status = 'idle';
      }
    } catch (error) {
      this.log(`Error updating swarm data: ${error.message}`, 'error');
    }
  }

  updateDisplay() {
    // Update status
    const activeObjectives = this.swarmData.objectives.filter((o) => o.status === 'running').length;
    const activeAgents = this.swarmData.agents.filter((a) => a.status === 'active').length;

    this.statusBox.setContent(
      `Status: ${this.swarmData.status} | ` +
        `Objectives: ${activeObjectives} | ` +
        `Agents: ${activeAgents} | ` +
        `Tasks: ${this.swarmData.tasks.length}`,
    );

    // Update objectives list
    const objectiveItems = this.swarmData.objectives.map(
      (obj) => `${obj.status === 'running' ? '🟢' : '🔴'} ${obj.description.substring(0, 25)}...`,
    );
    this.objectivesList.setItems(objectiveItems.length > 0 ? objectiveItems : ['No objectives']);

    // Update agents list
    const agentItems = this.swarmData.agents.map(
      (agent) => `${agent.status === 'active' ? '🤖' : '💤'} ${agent.id.substring(0, 15)}...`,
    );
    this.agentsList.setItems(agentItems.length > 0 ? agentItems : ['No agents']);

    // Update tasks list if objective is selected
    if (this.selectedObjective) {
      this.updateTasksList();
    }

    this.screen.render();
  }

  updateTasksList() {
    if (!this.selectedObjective) return;

    const objectiveTasks = this.swarmData.tasks.filter(
      (task) => task.swarmId === this.selectedObjective.id,
    );

    const taskItems = objectiveTasks.map((task) => {
      const statusIcon =
        {
          active: '🔄',
          completed: '✅',
          failed: '❌',
          pending: '⏳',
        }[task.status] || '❓';

      return `${statusIcon} ${task.task?.type || 'Unknown'}: ${task.task?.description?.substring(0, 20) || 'No description'}...`;
    });

    this.tasksList.setItems(taskItems.length > 0 ? taskItems : ['No tasks']);
    this.screen.render();
  }

  updateTaskDetails(task) {
    const details = [
      `Task ID: ${task.agentId}`,
      `Swarm ID: ${task.swarmId}`,
      `Type: ${task.task?.type || 'Unknown'}`,
      `Description: ${task.task?.description || 'No description'}`,
      `Status: ${task.status || 'Unknown'}`,
      `Start Time: ${task.startTime || 'Not started'}`,
      '',
      'Task Data:',
      JSON.stringify(task.task, null, 2),
    ].join('\n');

    this.taskDetails.setContent(details);
    this.screen.render();
  }

  promptCreateObjective() {
    // Create a prompt box
    const promptBox = blessed.prompt({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 60,
      height: 10,
      label: ' Create New Objective ',
      content: 'Enter objective description:',
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'cyan',
        },
      },
    });

    promptBox.input('Enter objective:', '', (err, value) => {
      if (!err && value) {
        this.createObjective(value);
      }
      promptBox.destroy();
      this.screen.render();
    });

    this.screen.render();
  }

  async createObjective(description) {
    try {
      this.log(`Creating objective: ${description}`);

      // Execute swarm command
      const args = ['swarm', description, '--ui', '--monitor'];
      const process = spawn('claude-flow', args, {
        detached: true,
        stdio: 'ignore',
      });

      process.unref();

      // Track the process for later termination
      const processId = `swarm-${Date.now()}`;
      this.activeProcesses.set(processId, process);

      this.log(`Launched swarm with PID: ${process.pid} (ID: ${processId})`);

      // Update data after a delay
      setTimeout(() => {
        this.updateSwarmData();
      }, 2000);
    } catch (error) {
      this.log(`Error creating objective: ${error.message}`, 'error');
    }
  }

  async stopSwarm() {
    this.log('Stopping all swarm operations...');

    try {
      // Cross-platform process termination
      let stoppedCount = 0;

      // First, try to stop tracked processes
      for (const [processId, process] of this.activeProcesses) {
        try {
          // Use process.kill() for cross-platform compatibility
          if (process.pid && !process.killed) {
            process.kill('SIGTERM');
            stoppedCount++;
            this.log(`Stopped process ${processId} (PID: ${process.pid})`);
          }
        } catch (err) {
          // Process might already be dead
          this.log(`Process ${processId} already terminated`, 'warn');
        }
      }

      // Clear the tracked processes
      this.activeProcesses.clear();

      // Also find and stop any orphaned processes
      await this.stopOrphanedProcesses();

      this.log(`Swarm operations stopped (${stoppedCount} processes terminated)`);

      // Update display
      this.swarmData.status = 'stopped';
      this.updateDisplay();
    } catch (error) {
      this.log(`Error stopping swarm: ${error.message}`, 'error');
    }
  }

  async stopOrphanedProcesses() {
    // Cross-platform approach to find and stop orphaned processes
    const { exec } = require('child_process');
    const os = require('os');

    if (os.platform() === 'win32') {
      // Windows: Use wmic to find and kill processes
      exec(
        'wmic process where "commandline like \'%claude-flow swarm%\'" get processid',
        (error, stdout) => {
          if (!error && stdout) {
            const pids = stdout
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => /^\d+$/.test(line));

            pids.forEach((pid) => {
              exec(`taskkill /F /PID ${pid}`, (killError) => {
                if (!killError) {
                  this.log(`Stopped orphaned process PID: ${pid}`);
                }
              });
            });
          }
        },
      );
    } else {
      // Unix-like systems: Use ps and grep
      exec('ps aux | grep "claude-flow swarm" | grep -v grep', (error, stdout) => {
        if (!error && stdout) {
          const lines = stdout.split('\n').filter((line) => line.trim());
          lines.forEach((line) => {
            const parts = line.split(/\s+/);
            const pid = parts[1];
            if (pid && /^\d+$/.test(pid)) {
              try {
                process.kill(parseInt(pid), 'SIGTERM');
                this.log(`Stopped orphaned process PID: ${pid}`);
              } catch (killError) {
                // Process might not exist or no permission
              }
            }
          });
        }
      });
    }
  }

  async executeCommand(command) {
    this.log(`Executing command: ${command}`);

    try {
      const { exec } = require('child_process');
      exec(command, (error, stdout, stderr) => {
        if (error) {
          this.log(`Command error: ${error.message}`, 'error');
        } else {
          if (stdout) this.log(`Output: ${stdout.trim()}`);
          if (stderr) this.log(`Error: ${stderr.trim()}`, 'warn');
        }
      });
    } catch (error) {
      this.log(`Failed to execute command: ${error.message}`, 'error');
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const levelColors = {
      info: 'white',
      warn: 'yellow',
      error: 'red',
      success: 'green',
    };

    const coloredMessage = `{${levelColors[level] || 'white'}-fg}[${timestamp}] ${message}{/}`;

    this.logBuffer.push(coloredMessage);
    if (this.logBuffer.length > this.maxLogLines) {
      this.logBuffer.shift();
    }

    if (this.logBox) {
      this.logBox.log(coloredMessage);
      this.screen.render();
    }
  }

  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Clean up any remaining processes
    for (const [processId, process] of this.activeProcesses) {
      try {
        if (process.pid && !process.killed) {
          process.kill('SIGTERM');
        }
      } catch (err) {
        // Ignore errors during cleanup
      }
    }
    this.activeProcesses.clear();
  }
}

// Main execution
async function main() {
  const ui = new SwarmUI();

  try {
    await ui.init();
  } catch (error) {
    console.error('Failed to initialize Swarm UI:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = SwarmUI;
