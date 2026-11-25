# MM3D Tracker

A live tracker for the Majora's Mask 3D Randomizer. It reads your game straight from the Azahar emulator while you play, so checks are marked the moment you get them, with no manual clicking and no need to save first.

Work in progress.

## Download

Get the latest version from the [Releases](https://github.com/TB516/mm3d-tracker/releases) page:

- **Linux:** the `.flatpak` file. Install it with `flatpak install --user <file>`.
- **Windows:** the `-portable.exe` file. It runs without installing. Windows may warn that it's from an unknown publisher; choose "More info", then "Run anyway".

## Requirements

- Azahar with the RPC server turned on in its settings. While it's on, other devices on your network can reach the emulator, so turn it off when you're done playing.
- A seed from MM3D Randomizer v1.5.1.

## Good to know

- Copying a file on the game's file select screen only copies the game's save, not the randomizer's record of which checks you've done. A copied file starts with no checks done, in the tracker and in the randomizer itself, so play on the original file.
