## graphify

Monorepo: each app (`apps/app`, `apps/db`) has its own knowledge graph at `apps/<app>/graphify-out/`. Run graphify commands from the app dir and pick the graph for the app you're working in.

RULES:
- For codebase questions, first run `graphify query "<question>"` when the app's `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If the app's `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read the app's `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` in that app dir to keep its graph current (AST-only, no API cost).