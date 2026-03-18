#!/usr/bin/env sh

COVERAGE_FILE="coverage/coverage-summary.json"
PASS=true

echo "🔍 Checking coverage for changed files..."

# Get staged source files (ts, tsx) — skip tests, configs, types
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM \
  | grep -E '\.(ts|tsx)$' \
  | grep -v '\.test\.' \
  | grep -v '\.spec\.' \
  | grep -v '\.config\.' \
  | grep -v '^types/')

if [ -z "$CHANGED_FILES" ]; then
  echo "✅ No source files changed — skipping diff coverage check."
  exit 0
fi

if [ ! -f "$COVERAGE_FILE" ]; then
  echo "❌ Coverage report not found at $COVERAGE_FILE"
  echo "   Run 'npm test' to generate it first."
  exit 1
fi

for FILE in $CHANGED_FILES; do
  ABS_KEY=$(node -e "
    const fs = require('fs');
    const summary = JSON.parse(fs.readFileSync('$COVERAGE_FILE', 'utf8'));
    const key = Object.keys(summary).find(k => k.endsWith('/$FILE') || k.endsWith('/$FILE'.replace(/\//g, require('path').sep)));
    console.log(key || '');
  ")

  if [ -z "$ABS_KEY" ]; then
    echo "⚠️  Not in coverage report: $FILE"
    echo "   Add at least one test that imports or exercises this file."
    PASS=false
    continue
  fi

  LINE_PCT=$(node -e "
    const fs = require('fs');
    const summary = JSON.parse(fs.readFileSync('$COVERAGE_FILE', 'utf8'));
    const entry = summary['$ABS_KEY'];
    console.log(entry ? entry.lines.pct : 0);
  ")

  if [ "$LINE_PCT" = "0" ] || [ "$LINE_PCT" = "0.00" ]; then
    echo "❌ No coverage: $FILE (0% lines covered)"
    PASS=false
  else
    echo "✅ $FILE — ${LINE_PCT}% lines covered"
  fi
done

if [ "$PASS" = false ]; then
  echo ""
  echo "❌ Coverage diff check failed."
  echo "   Write tests for the files listed above before committing."
  exit 1
fi

echo ""
echo "✅ All changed files have coverage."
exit 0
