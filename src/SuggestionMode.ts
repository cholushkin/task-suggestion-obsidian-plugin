import { App, MarkdownView, TFile } from "obsidian";
import { TaskRepository } from "./TaskRepository";

export class SuggestionMode {

    private app: App;
    private repo: TaskRepository;
    private file!: TFile;
    private active = false;
    private doneButton?: HTMLButtonElement;

    constructor(app: App, repo: TaskRepository) {
        this.app = app;
        this.repo = repo;
    }

    async enable(file: TFile) {

        console.log("[TaskSuggestion] Random suggestion mode enabled");

        this.file = file;
        this.active = true;

        await this.addDice();

        this.attachDoneButton();

        document.addEventListener("click", this.handleClick);
    }

    private async addDice() {

        const content = await this.app.vault.read(this.file);

        const lines = content.split("\n");

        const updated = lines.map(line => {

            if (line.includes("#^") && !line.includes("🎲")) {
                return line + " 🎲";
            }

            return line;
        });

        await this.app.vault.modify(this.file, updated.join("\n"));

        console.log("[TaskSuggestion] Dice added");
    }

    private attachDoneButton() {

        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        const container = view.contentEl;

        if (container.querySelector(".ts-done-btn")) return;

        const btn = document.createElement("button");

        btn.textContent = "Done";
        btn.className = "ts-done-btn";

        btn.style.display = "block";
        btn.style.marginTop = "24px";

        btn.onclick = () => this.exit();

        container.appendChild(btn);

        this.doneButton = btn;

        console.log("[TaskSuggestion] Done button added");
    }

    private handleClick = async () => {

        if (!this.active) return;

        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        const editor = view.editor;

        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);

        if (!line || !line.includes("🎲")) return;

        const match = line.match(/\[\[.*?#\^([a-zA-Z0-9\-]+).*?\]\]/);
        if (!match) return;

        const blockId = match[1];

        console.log("[TaskSuggestion] Roll:", blockId);

        const task = this.repo.getAll().find(t => t.id === blockId);
        if (!task) return;

        const candidates = this.repo.getByTag(task.tags);
        if (!candidates.length) return;

        const random =
            candidates[Math.floor(Math.random() * candidates.length)];

        const newLink =
            `[[${random.title}#^${random.id}|${random.title}]] 🎲`;

        editor.replaceRange(
            line.replace(/\[\[.*?\]\].*?🎲/, newLink),
            { line: cursor.line, ch: 0 },
            { line: cursor.line, ch: line.length }
        );

        console.log("[TaskSuggestion] Suggested:", random.id);
    };

    async exit() {

        console.log("[TaskSuggestion] Exit random suggestion mode");

        this.active = false;

        const content = await this.app.vault.read(this.file);

        const cleaned = content.replace(/ 🎲/g, "");

        await this.app.vault.modify(this.file, cleaned);

        if (this.doneButton) {
            this.doneButton.remove();
            this.doneButton = undefined;
        }

        document.removeEventListener("click", this.handleClick);
    }
}