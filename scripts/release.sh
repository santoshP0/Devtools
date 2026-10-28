#!/bin/sh
set -eu

VERSION=${1:-}
NOTES_FILE=${2:-WHATS_NEW.txt}

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version> [notes-file]" >&2
  echo "Example: $0 3.7.0 WHATS_NEW.txt" >&2
  exit 1
fi

case "$VERSION" in
  v*) VERSION=${VERSION#v} ;;
esac

if ! printf '%s\n' "$VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$'; then
  echo "Invalid semantic version: $VERSION" >&2
  exit 1
fi

if [ ! -s "$NOTES_FILE" ] || ! grep -q '[^[:space:]]' "$NOTES_FILE"; then
  echo "Release notes file is missing or empty: $NOTES_FILE" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree must be clean before releasing." >&2
  exit 1
fi

BRANCH=$(git branch --show-current)
if [ -z "$BRANCH" ]; then
  echo "Releases must be created from a branch, not detached HEAD." >&2
  exit 1
fi

TAG="v$VERSION"
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "Tag already exists: $TAG" >&2
  exit 1
fi

echo "Preparing DevToolbox $TAG from $BRANCH"
npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null
node -e "const fs=require('node:fs'); const p='src-tauri/tauri.conf.json'; const j=JSON.parse(fs.readFileSync(p,'utf8')); j.version=process.argv[1]; fs.writeFileSync(p, JSON.stringify(j,null,2)+'\\n')" "$VERSION"

npm run test:search
npm run test:notes
npm run build

# The production build refreshes sitemap dates. The release command starts from
# a clean tree, so discard that generated-only change instead of leaving it
# behind after publishing.
git restore public/sitemap.xml

git add package.json package-lock.json src-tauri/tauri.conf.json
git commit -m "chore: release $VERSION"
git tag -a "$TAG" -m "DevToolbox $TAG"

# Push the branch first, then the tag that starts the GitHub Actions release.
git push origin "$BRANCH"
git push origin "$TAG"

# Keep notes in the tagged commit for the workflow, then clear them for the
# next release only after the release tag was successfully published.
: > "$NOTES_FILE"
git add "$NOTES_FILE"
git commit -m "chore: clear release notes after $TAG"
git push origin "$BRANCH"

echo "Published $TAG. GitHub Actions is building the release artifacts."
