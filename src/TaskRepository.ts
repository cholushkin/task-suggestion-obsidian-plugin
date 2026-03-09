import { App, TFile } from "obsidian";

export interface Task {
    id: string;
    title: string;
    tags: string[];
    priority?: number;
    aiPrompt?: string;
    googlePrompt?: string;
}

export class TaskRepository {

    private app: App;
    private tasks: Map<string, Task> = new Map();
    private folder: string;

    constructor(app: App, folder: string) {
        this.app = app;
        this.folder = folder;
    }

    public async load(): Promise<void> {

        console.log("[TaskSuggestion] Loading tasks");

        const files = this.app.vault
            .getMarkdownFiles()
            .filter(f => f.path.startsWith(this.folder));

        console.log(`[TaskSuggestion] Scanning ${files.length} task files`);

        for (const file of files) {
            await this.scanFile(file);
        }

        console.log(`[TaskSuggestion] Loaded ${this.tasks.size} tasks`);
    }

    public getAll(): Task[] {
        return Array.from(this.tasks.values());
    }

    public getByTag(tags: string[]): Task[] {

        return this.getAll().filter(task =>
            task.tags.some(t => tags.includes(t))
        );
    }

    private async scanFile(file: TFile): Promise<void> {

        const content = await this.app.vault.read(file);

        const lines = content.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {

            const line = lines[i];

            const taskMatch = line.match(/^- (.+?)\s+\^([a-zA-Z0-9\-]+)/);

            if (!taskMatch) continue;

            const title = taskMatch[1].trim();
            const id = taskMatch[2];

            const task: Task = {
                id,
                title,
                tags: []
            };

            let j = i + 1;

            while (j < lines.length && lines[j].startsWith("\t")) {

                const metaLine = lines[j].trim();

                if (metaLine.startsWith("- Tags:")) {

                    const tagStr = metaLine.replace("- Tags:", "").trim();

                    task.tags = tagStr
                        .split(",")
                        .map(t => t.trim());

                }

                j++;
            }

            this.tasks.set(id, task);

            console.log(`[TaskSuggestion] Task loaded: ${id}`);

        }
    }
}