# OpenShift Notes

A documentation site for OpenShift notes, guides, and references built with [Material for MkDocs](https://squidfunk.github.io/mkdocs-material).

## Prerequisites

- Python 3.x

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Local Development

```bash
source .venv/bin/activate
mkdocs serve --livereload
```

The site will be available at [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Adding Content

Documentation pages are written in Markdown and stored in the `docs/` directory. To add a new page:

1. Create a `.md` file in the appropriate section folder under `docs/`.
2. Add the page to the `nav` section in `mkdocs.yaml`.

## Deployment

The site is automatically published to GitHub Pages via GitHub Actions on every push to `main`.
