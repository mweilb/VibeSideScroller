# VibeSideScroller

This is just experiment to have some fun!


## Installing Visual Studio Code

Before you begin platform-specific steps, download the latest stable installer from the official VS Code download page:  
- **Download page:** https://code.visualstudio.com/download citeturn1search2

### Windows

1. Run the downloaded `VSCodeUserSetup-{version}.exe`.  
2. Follow the on-screen installer prompts to complete installation.  
3. By default, the installer adds the `code` command to your `%PATH%`, so you can open folders via `code .` in PowerShell or Command Prompt after restarting the shell citeturn1search1.

### macOS

1. Open the downloaded `.zip` or `.dmg` and drag **Visual Studio Code.app** into your **Applications** folder.  
2. Launch VS Code to verify the app opens correctly.  
3. To enable the `code` CLI, press `⌘ + Shift + P`, run **Shell Command: Install 'code' command in PATH**, and then restart your terminal citeturn1search4.

### Linux

1. **Debian/Ubuntu:**  
   ```bash
   sudo apt install ./<file>.deb
   ```  
2. **RHEL/Fedora/SUSE:**  
   ```bash
   sudo rpm -i <file>.rpm
   ```  
3. Alternatively, extract the `.tar.gz` archive and run the `code` binary directly.  
4. Ensure the installation path (e.g., `/usr/bin` or `/usr/local/bin`) is in your `PATH` citeturn1search3.

### VS Code for the Web

If you prefer a zero-install experience, open https://vscode.dev in any modern browser. This runs VS Code entirely in the cloud, ideal for quick edits and lightweight tasks citeturn1search9.

## Installing the Cline Extension

Cline is an autonomous AI coding agent that can create/edit files, run commands, and more, all within VS Code citeturn0search0. Choose one of the following methods:

### 1. Extensions View (Graphical)

1. Launch VS Code and click the **Extensions** icon in the Activity Bar (or press `Ctrl + Shift + X`).  
2. Search for **Cline**.  
3. Locate **Cline** by **cline.bot** (or `saoudrizwan.claude-dev`) and click **Install** citeturn0search0.

### 2. Command Palette

1. Open the Command Palette with `Ctrl + P`.  
2. Type:
   ```
   ext install saoudrizwan.claude-dev
   ```
3. Press **Enter** to install Cline citeturn0search0.

### 3. CLI (`code` Command)

If you have the `code` CLI set up in your shell, run:

```bash
code --install-extension saoudrizwan.claude-dev
```  
This will download and install the Cline extension directly citeturn0search0.

## Additional Resources

- **VS Code Setup Guide:** https://code.visualstudio.com/docs/setup/setup-overview citeturn1search0  
- **VS Code Download:** https://code.visualstudio.com/download citeturn1search2  
- **Cline Marketplace Page:** https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev citeturn0search0  
- **Cline GitHub Wiki:** https://github.com/cline/cline/wiki citeturn0search5  

