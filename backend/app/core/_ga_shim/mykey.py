"""Placeholder `mykey` module consumed by GenericAgent's llmcore.reload_mykeys().

DO NOT EDIT at runtime.

This file exists so that `import mykey` succeeds inside GenericAgent without
requiring a real `mykey.py` at the submodule root. Its directory is inserted
onto sys.path by `app.core.ga_integration` before GA is imported.

Once GA is loaded, `llmcore.mykeys` is overwritten with the dict produced
from the user's configured providers (stored in SQLite). The mtime of this
file stays stable, so `reload_mykeys()` returns early on every subsequent
call and preserves our injected dict.
"""

_placeholder_api = {
    "apikey": "sk-placeholder",
    "api_base": "https://api.openai.com/v1",
    "model": "gpt-4o-mini",
    "provider": "openai",
    "stream": True,
    "max_retries": 3,
}
