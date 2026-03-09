import { App, MarkdownView, TFile } from "obsidian";
import { TaskRepository } from "./TaskRepository";

export class SuggestionMode {

    private app: App;
    private repo: TaskRepository;
    private active = false;

    constructor(app: App, repo: TaskRepository) {
        this.app = app;
        this.repo = repo;
    }

    public async enable(file: TFile) {

        console.log("[TaskSuggestion] Rnd suggestions mode enabled");

        this.active = true;

        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);

        setTimeout(() => {
            this.attachDice();
            this.attachDoneButton();
        }, 150);
    }

    private attachDice() {

        if (!this.active) return;

        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        const container = view.containerEl;

        const links = container.querySelectorAll("[data-href*='#^']");

        let attached = 0;

        links.forEach(link => {

            const href = link.getAttribute("data-href");
            if (!href) return;

            const blockId = href.split("^")[1];
            if (!blockId) return;

            if (link.parentElement?.querySelector(".ts-dice")) return;

            const btn = document.createElement("button");

            btn.textContent = "🎲";
            btn.className = "ts-dice";
            btn.style.marginLeft = "6px";

            btn.onclick = () => this.roll(link as HTMLElement, blockId);

            link.after(btn);

            attached++;

        });

        console.log(`[TaskSuggestion] Dice buttons attached: ${attached}`);
    }

    private roll(link: HTMLElement, blockId: string) {

        console.log("[TaskSuggestion] Roll:", blockId);

        const original = this.repo.getAll().find(t => t.id === blockId);
        if (!original) return;

        const candidates = this.repo.getByTag(original.tags);

        if (!candidates.length) return;

        const random = candidates[Math.floor(Math.random() * candidates.length)];

        const href = link.getAttribute("data-href") || "";
        const notePath = href.split("#")[0];

        const newLink = `[[${notePath}#^${random.id}|${random.title}]]`;

        const li = link.closest("li");
        if (!li) return;

        const textNode = li.childNodes[0];

        if (textNode && textNode.textContent) {

            li.innerHTML = li.innerHTML.replace(/\[\[.*?#\^.*?\|.*?\]\]/, newLink);

        }

        console.log("[TaskSuggestion] Suggested:", random.id);

        setTimeout(() => this.attachDice(), 50);
    }

    private attachDoneButton() {

        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        const container = view.containerEl;

        if (container.querySelector(".ts-done-btn")) return;

        const btn = document.createElement("button");

        btn.textContent = "Done";
        btn.className = "ts-done-btn";

        btn.style.marginTop = "20px";
        btn.style.display = "block";

        btn.onclick = () => this.exit();

        container.appendChild(btn);

        console.log("[TaskSuggestion] Done button added");
    }

    private exit() {

        console.log("[TaskSuggestion] Exit random suggestion mode");

        this.active = false;

        document.querySelectorAll(".ts-dice").forEach(b => b.remove());
        document.querySelectorAll(".ts-done-btn").forEach(b => b.remove());
    }
}