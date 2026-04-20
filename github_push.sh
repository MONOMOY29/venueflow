#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# VenueFlow — GitHub Setup & Push Script
# Run this inside the venueflow/ folder after creating your GitHub repo
# Usage: bash github_push.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🐙  VenueFlow → GitHub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -rp "Enter your GitHub username: " GH_USER
read -rp "Enter repo name (e.g. venueflow): " REPO_NAME

REPO_URL="https://github.com/${GH_USER}/${REPO_NAME}.git"

# Verify repo size will be under 10 MB
REPO_SIZE=$(du -sm . --exclude=node_modules --exclude=.git 2>/dev/null | cut -f1)
echo "📦 Repo size (excl. node_modules): ~${REPO_SIZE} MB"

if [ "$REPO_SIZE" -gt 9 ]; then
  echo "⚠️  WARNING: repo may exceed 10 MB limit. Check for large files."
fi

# Init git if needed
if [ ! -d .git ]; then
  git init
  echo "✅ Git initialised"
fi

# Configure .gitignore safety
if ! grep -q "node_modules" .gitignore 2>/dev/null; then
  echo "node_modules/" >> .gitignore
fi

git add .
git commit -m "feat: VenueFlow v1.0 — AI-powered venue crowd manager (PromptWars)" || true

# Set remote
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# Push
git branch -M main
git push -u origin main

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Pushed to GitHub"
echo "  🔗  ${REPO_URL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Copy this for Hack2Skill submission: ${REPO_URL}"
