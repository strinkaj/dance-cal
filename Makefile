.PHONY: help setup install dev build preview clean

help:
	@echo "dance-cal — available targets:"
	@echo "  make setup    install deps + configure git skip-worktree for attendance.json"
	@echo "  make install  install npm dependencies"
	@echo "  make dev      start Vite dev server (http://localhost:5173)"
	@echo "  make build    production build → dist/"
	@echo "  make preview  serve the production build locally"
	@echo "  make clean    remove dist/ and .vite/"

setup: install
	git update-index --skip-worktree attendance.json
	@echo "Setup complete. attendance.json is now excluded from git tracking."

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

clean:
	rm -rf dist/ .vite/
