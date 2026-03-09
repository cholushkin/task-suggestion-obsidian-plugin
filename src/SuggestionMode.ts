import { App, TFile } from "obsidian";
import { TaskRepository } from "./TaskRepository";

export class SuggestionMode {

    private app: App;
    private repo: TaskRepository;
    private file!: TFile;
    private active = false;

    private originalOpenLink: any;

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

        this.hookHandler();
    }

    async exit() {

        console.log("[TaskSuggestion] Suggestion mode exit");

        const content = await this.app.vault.read(this.file);

        const cleaned = content
            .replace(/\s*\[\[ts-roll-[^\]]+\]\]/g, "")
            .replace(/\[\[ts-exit-suggestion-mode\|Exit suggestion mode\]\]/g, "");

        await this.app.vault.modify(this.file, cleaned);

        this.unhookHandler();

        this.active = false;
    }

    /* ------------------------------------------------ */
    /* LINK INTERCEPTION                               */
    /* ------------------------------------------------ */

    private hookHandler() {

        const workspace = this.app.workspace as any;

        this.originalOpenLink = workspace.openLinkText;

        workspace.openLinkText = async (
            linktext: string,
            sourcePath: string,
            newLeaf?: boolean
        ) => {

            if (!this.active) {

                return this.originalOpenLink.call(
                    workspace,
                    linktext,
                    sourcePath,
                    newLeaf
                );
            }

            /* ---------- EXIT SUGGESTION MODE ---------- */

            if (linktext === "ts-exit-suggestion-mode") {

                console.log("[TaskSuggestion] exit clicked");

                await this.exit();

                return;
            }

            /* ---------- ROLL TASK ---------- */

            if (linktext.startsWith("ts-roll-")) {

                const id = linktext.replace("ts-roll-", "");

                console.log("[TaskSuggestion] roll clicked:", id);

                await this.roll(id);

                return;
            }

            /* ---------- NORMAL LINKS ---------- */

            return this.originalOpenLink.call(
                workspace,
                linktext,
                sourcePath,
                newLeaf
            );
        };
    }

    private unhookHandler() {

        const workspace = this.app.workspace as any;

        if (this.originalOpenLink) {
            workspace.openLinkText = this.originalOpenLink;
        }
    }

    /* ------------------------------------------------ */
    /* TASK ROLL                                        */
    /* ------------------------------------------------ */

    private async roll(id: string) {

        const task = this.repo.getAll().find(t => t.id === id);
        if (!task) return;

        const candidates = this.repo.getByTag(task.tags);
        if (!candidates.length) return;

        const random =
            candidates[Math.floor(Math.random() * candidates.length)];

        await this.replaceLine(id, random.id, random.title);
    }

    /* ------------------------------------------------ */
    /* REPLACE TASK LINE                                */
    /* ------------------------------------------------ */

    private async replaceLine(
        oldId: string,
        newId: string,
        title: string
    ) {

        const content = await this.app.vault.read(this.file);
        const lines = content.split("\n");

        const updated = lines.map(line => {

            if (!line.includes(`#^${oldId}`)) return line;

            const newTask =
                `[[${title}#^${newId}|${title}]] [[ts-roll-${newId}|🎲]]`;

            return line.replace(/\[\[.*?#\^[^\]]+\|[^\]]+\]\].*/, newTask);
        });

        await this.app.vault.modify(this.file, updated.join("\n"));
    }

    /* ------------------------------------------------ */
    /* INSERT DICE LINKS                                */
    /* ------------------------------------------------ */

    private async injectDiceLinks() {

        const content = await this.app.vault.read(this.file);
        const lines = content.split("\n");

        const updated = lines.map(line => {

            const match = line.match(/\[\[.*?#\^([a-zA-Z0-9\-]+).*?\]\]/);
            if (!match) return line;

            const id = match[1];

            if (line.includes("ts-roll-")) return line;

            return `${line} [[ts-roll-${id}|🎲]]`;
        });

        if (!content.includes("ts-exit-suggestion-mode")) {

            updated.push("");
            updated.push("---");
            updated.push("[[ts-exit-suggestion-mode|Exit suggestion mode]]");
        }

        await this.app.vault.modify(this.file, updated.join("\n"));
    }
}