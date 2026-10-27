# Coming Soon module

This additive module intercepts only `#nav-ai` and `#nav-analytics` in the capture phase. It prevents the legacy AI/Analytics handlers and API calls from running, then renders a namespaced placeholder. It never intercepts or modifies Dashboard events, markup, tiles, links, registry or styles.