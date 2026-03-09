import { Notice, Plugin, TFile, TAbstractFile } from "obsidian";
import { CloneProcessor } from "./CloneProcessor";
import { TaskRepository } from "./TaskRepository";
import { SuggestionMode } from "./SuggestionMode";

const FOLDER_PREFIX = "!WeekPlans/";
const TASK_FOLDER = "prj-task-suggestion-obsidian-plugin/Data";

export default class TaskSuggestionPlugin extends Plugin {

    private repo!: TaskRepository;
    private suggestionMode!: SuggestionMode;

    async onload() {

        console.log("[TaskSuggestion] Plugin loaded");

        this.repo = new TaskRepository(this.app, TASK_FOLDER);
        this.suggestionMode = new SuggestionMode(this.app, this.repo);

        this.app.workspace.onLayoutReady(async () => {
            await this.repo.load();
        });

        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {

                if (
                    file instanceof TFile &&
                    file.extension === "md" &&
                    file.path.startsWith(FOLDER_PREFIX)
                ) {

                    menu.addItem((item) => {
                        item
                            .setTitle("Clone and clean")
                            .setIcon("copy")
                            .onClick(() => this.cloneAndClean(file));
                    });

                    menu.addItem((item) => {
                        item
                            .setTitle("Rnd suggestions")
                            .setIcon("dice")
                            .onClick(() => {
                                this.suggestionMode.enable(file);
                            });
                    });

                }

            })
        );
    }

    onunload() {
        console.log("[TaskSuggestion] Plugin unloaded");
    }

    private async cloneAndClean(srcFile: TFile) {

        try {

            const vault = this.app.vault;
            const srcContent = await vault.read(srcFile);

            const nextMonday = this.getNextMonday();
            const nextMondayFileDate = this.formatDateYYYYMMDD(nextMonday);

            const { folderPath, baseName } = this.splitPath(srcFile.path);

            const firstSpace = baseName.indexOf(" ");
            const restOfTitle =
                firstSpace > 0
                    ? baseName.substring(firstSpace + 1).trim()
                    : "Week Plan";

            const targetBase = `${nextMondayFileDate} ${restOfTitle}`;

            const targetFilePath = await this.getUniqueFilePath(
                folderPath,
                targetBase,
                "md"
            );

            const processed = new CloneProcessor().process(srcContent, nextMonday);

            const created = await vault.create(targetFilePath, processed);

            new Notice(`✨ Created next week plan: "${created.basename}"`);

            const leaf = this.app.workspace.getLeaf(true);
            await leaf.openFile(created);

        } catch (err) {

            console.error(err);
            new Notice("⚠️ Failed to clone the plan.");

        }
    }

    private getNextMonday(): Date {

        const today = new Date();
        const day = today.getDay();
        const monday = 1;

        const daysUntilNextMonday = ((monday - day + 7) % 7);

        const next = new Date(today);
        next.setDate(today.getDate() + daysUntilNextMonday);
        next.setHours(0, 0, 0, 0);

        return next;
    }

    private formatDateYYYYMMDD(d: Date): string {

        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");

        return `${y}-${m}-${day}`;
    }

    private splitPath(path: string): { folderPath: string; baseName: string } {

        const lastSlash = path.lastIndexOf("/");

        const folderPath = lastSlash >= 0 ? path.substring(0, lastSlash) : "";
        const fileName = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;

        const baseName = fileName.replace(/\.md$/i, "");

        return { folderPath, baseName };
    }

    private async getUniqueFilePath(
        folderPath: string,
        baseName: string,
        ext: string
    ): Promise<string> {

        const makePath = (n?: number) =>
            (folderPath ? folderPath + "/" : "") +
            (n && n > 1 ? `${baseName} ${n}.${ext}` : `${baseName}.${ext}`);

        let n = 1;
        let candidate = makePath();

        while (this.exists(candidate)) {
            n++;
            candidate = makePath(n);
        }

        return candidate;
    }

    private exists(path: string): boolean {

        const f: TAbstractFile | null =
            this.app.vault.getAbstractFileByPath(path);

        return f !== null;
    }
}