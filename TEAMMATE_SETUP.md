# Teammate Setup

This repository now includes click-to-run setup helpers for new Windows and macOS machines.

## Windows

Double-click:

```text
SETUP_WINDOWS.bat
```

What it does:

- Checks for Git, Java 21, Node.js LTS, npm, and Docker.
- Uses `winget` to install missing tools when available.
- Runs `npm install` for the frontend.
- Pulls Docker images when Docker Desktop is already running.

Manual steps Windows may still need:

- Open Docker Desktop from the Start menu and finish its first-run setup.
- Restart the terminal after installing Java or Node so `PATH` updates are visible.
- Use Git Bash or WSL to start the project:

```bash
bash scripts/dev.sh
```

## macOS

Double-click:

```text
SETUP_MAC.command
```

What it does:

- Checks for Git, Java 21, Node.js, npm, and Docker.
- Uses Homebrew to install missing tools.
- Runs `npm install` for the frontend.
- Pulls Docker images when Docker Desktop is already running.

Manual steps macOS may still need:

- Install Homebrew from https://brew.sh if the script says it is missing.
- Open Docker Desktop from Applications and finish its first-run setup.
- Rerun `SETUP_MAC.command` after Docker Desktop is running.

## Starting The App

After setup, run this from the repository root:

```bash
bash scripts/dev.sh
```

That starts PostgreSQL, both IPFS nodes, Fabric when needed, the Spring Boot backend, and the Vite frontend in one terminal.

For a faster DB/IPFS-only development run:

```bash
PANGOCHAIN_WITH_FABRIC=0 bash scripts/dev.sh
```

Open http://localhost:3000 after the script says the app is ready.
