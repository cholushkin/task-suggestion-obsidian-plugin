import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../ScriptUtils")))
from Core.PromptContextCollector.PromptContextCollector import PromptContextCollector

PromptContextCollector(
    directories=["Unity/TargetOne/Assets/Libs/KritaImport"],  # Wildcards and folders
    includes=["*.cs", "*.md"],
    files=[],
    ignores=[],
    template_path="UserScriptsCoding/TextTemplates/DevelopTogetherTemplate.txt",  # Relative to project root
    template_vars={},
    output_path="UserScriptsCoding/Outputs/PromptDevelopKritaImport.txt"
).run()