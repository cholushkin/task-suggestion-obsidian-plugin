import { App, TFile } from "obsidian";
import { TaskRepository } from "./TaskRepository";

export class SuggestionMode {

    private app: App;
    private repo: TaskRepository;
    private file!: TFile;
    private active = false;

    constructor(app: App, repo: TaskRepository) {
        this.app = app;
        this.repo = repo;
    }

    async enable(file: TFile) {

        if (this.active) {
            console.log("[TaskSuggestion] already in suggestion mode");
            return;
        }

        console.log("[TaskSuggestion] Suggestion mode enabled");

        this.file = file;
        this.active = true;

        await this.injectDiceLinks();
    }

    async exit() {

        console.log("[TaskSuggestion] Suggestion mode exit");

        const content = await this.app.vault.read(this.file);

        const cleaned = content
            .replace(/\s*\[\[#ts-roll-[^\]]+\]\]/g, "")
            .replace(/\[\[#ts-exit-suggestion-mode\|Exit suggestion mode\]\]/g, "");

        await this.app.vault.modify(this.file, cleaned);

        this.active = false;
    }

    private async injectDiceLinks() {

        const content = await this.app.vault.read(this.file);
        const lines = content.split("\n");

        const updated = lines.map(line => {

            const match = line.match(/\[\[.*?#\^([a-zA-Z0-9\-]+).*?\]\]/);
            if (!match) return line;

            const id = match[1];

            if (line.includes("#ts-roll-")) return line;

            return `${line} [[#ts-roll-${id}|🎲]]`;
        });

        if (!content.includes("#ts-exit-suggestion-mode")) {
            updated.push("");
            updated.push("---");
            updated.push("[[#ts-exit-suggestion-mode|Exit suggestion mode]]");
        }

        await this.app.vault.modify(this.file, updated.join("\n"));
    }
}