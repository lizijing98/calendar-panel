# Calendar Panel

[中文](./README.md) | [**English**](./README_EN.md)

> This project follows Obsidian's official [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) as a reference for its engineering and release conventions. Its calendar functionality is inspired by Liam Cain's [obsidian-calendar-plugin](https://github.com/liamcain/obsidian-calendar-plugin).

Calendar Panel is an Obsidian plugin that provides a simple calendar view for visualizing and navigating daily notes.

## Features

- Navigate to any **daily note**.
- Create a daily note for any date that does not have one, using your current **daily note** template.
- Display a monthly calendar in the right sidebar, with controls for the previous month, next month, and today, plus month and year pickers for quick navigation.
- Show today's content by default. Selecting a date displays its daily note or a note creation entry below the calendar.
- In the calendar panel, a solid dot indicates that a daily note exists, while a hollow dot indicates that the note contains incomplete tasks.
- Optionally display week numbers. Click a week number to open or create its weekly note.
- Hold `Ctrl` or `Command` while clicking to open a daily or weekly note in a new split.
- Hold `Ctrl` or `Command` while hovering to preview an existing note using Obsidian's native link preview.

![screenshot-full-1.png](./images/screenshot-full-1.png)

## Language and Dates

- The "Interface language" setting controls buttons, settings, commands, notices, and accessibility text. It can follow Obsidian or be set to Chinese or English.
- When following Obsidian, Chinese locales use the Chinese interface; all other locales fall back to English.
- "Override date locale" only controls month and weekday names and locale-specific week-number rules. It is independent of the interface language.
- All complete dates shown to users use `YYYY-MM-DD`. Month headings, weekday names, and note filenames continue to follow their respective locale or periodic-note settings.

![screenshot-setting](./images/screenshot-setting.png)

## Configuration Sources

### Daily Notes

The plugin reads daily note settings in the following order:

1. Settings from Obsidian's core Daily Notes plugin.
2. The default `YYYY-MM-DD` format and the vault root directory.

When creating a daily note, the plugin uses the filename format, directory, and template from the selected configuration source.

### Weekly Notes

After "Show week numbers" is enabled, the plugin reads weekly note settings from:

1. The weekly note format, directory, and template configured in Calendar Panel.

## Commands

The plugin registers the following commands and displays their names in the selected interface language:

- **Calendar Panel: 打开日历视图 / Open calendar view**
- **Calendar Panel: 打开本周周记 / Open current weekly note**
- **Calendar Panel: 在日历中定位当前笔记 / Reveal active note in calendar**

After the plugin is enabled, it also adds a calendar icon to the left ribbon and automatically creates the calendar view in the right sidebar once the Obsidian workspace layout is ready.

## Manual Installation

Calendar Panel requires Obsidian `1.13.0` or later.

1. Download `main.js`, `manifest.json`, and `styles.css` from a release, or generate them locally by running `npm run build`.
2. Create the plugin directory inside your Obsidian vault:

   ```text
   <Vault>/.obsidian/plugins/calendar-panel/
   ```

3. Copy the following files into that directory:

   ```text
   main.js
   manifest.json
   styles.css
   ```

4. Restart Obsidian or reload the plugin.
5. Go to **Settings → Community plugins** and enable **Calendar Panel**.

## Privacy and Network Access

Calendar Panel runs entirely locally:

- It does not collect analytics.
- It does not transmit vault contents, filenames, or plugin settings.
- It does not call external network services.
- It only reads and creates Markdown files in the vault through the Obsidian API.

## License

This project is licensed under the [MIT License](./LICENSE).
