import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../ScriptUtils")))
from Core.PromptContextCollector.PromptContextCollector import PromptContextCollector

PromptContextCollector(
    directories=["src"],  # Wildcards and folders
    includes=["*.ts", "*.md"],
    files=["readme.md", "esbuild.config.mjs", "manifest.json", "tsconfig.json"],
    ignores=[],
    template_path="UserScripts/TextTemplates/MakePromptAnalyzeScriptTemplate.txt",  # Relative to project root
    template_vars={},
    output_path="UserScripts/Outputs/AnalyzeTaskSuggestionPlugin.txt"
).run()
