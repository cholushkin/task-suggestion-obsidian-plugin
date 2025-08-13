import { Notice, Plugin, TFile } from "obsidian";

const FOLDER_PREFIX = "Projects/"; // Change this to your target folder

export default class TaskSuggestionPlugin extends Plugin {
  onload() {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (
          file instanceof TFile &&
          file.extension === "md" &&
          file.path.startsWith(FOLDER_PREFIX)
        ) {
          menu.addItem((item) => {
            item
              .setTitle("Special Folder Action")
              .setIcon("star")
              .onClick(() => {
                new Notice(`Action for "${file.basename}" in ${FOLDER_PREFIX}`);
              });
          });
        }
      })
    );

    console.log("TaskSuggestionPlugin loaded");
  }

  onunload() {
    console.log("TaskSuggestionPlugin unloaded");
  }
}
