#!/bin/bash
# Fix Turbopack standalone build: create placeholder chunks for missing references
# Turbopack sometimes generates chunk references in SSR output that don't exist on disk
# This script scans the server-rendered HTML for chunk references and creates stubs

CHUNKS_DIR=".next/static/chunks"
STANDALONE_CHUNKS_DIR=".next/standalone/.next/static/chunks"

# Get all chunk hashes referenced in HTML from the running server or from RSC data
# Scan all JS files for chunk references and cross-reference with actual files
MISSING=0

for dir in "$CHUNKS_DIR" "$STANDALONE_CHUNKS_DIR"; do
  if [ ! -d "$dir" ]; then
    continue
  fi
  
  # Find chunk references in server-side RSC data
  for ref in $(grep -roh '[a-f0-9]\{16\}\.js' .next/server/ 2>/dev/null | sort -u); do
    if [ ! -f "$dir/$ref" ]; then
      echo "[Turbopack fix] Creating placeholder for missing chunk: $ref"
      echo '(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,64893,(e,t,r)=>{"use strict";},64893,(e,t,r)=>{"use strict";}]);' > "$dir/$ref"
      MISSING=$((MISSING+1))
    fi
  done
done

# Also check the running server's HTML for missing chunks
if command -v curl &>/dev/null; then
  HTML=$(curl -s http://localhost:3000/ 2>/dev/null || true)
  if [ -n "$HTML" ]; then
    for ref in $(echo "$HTML" | grep -o 'chunks/[a-f0-9]*\.js' | sed 's|chunks/||' | sort -u); do
      for dir in "$CHUNKS_DIR" "$STANDALONE_CHUNKS_DIR"; do
        if [ -d "$dir" ] && [ ! -f "$dir/$ref" ]; then
          echo "[Turbopack fix] Creating placeholder for missing chunk from HTML: $ref"
          echo '(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,64893,(e,t,r)=>{"use strict";},64893,(e,t,r)=>{"use strict";}]);' > "$dir/$ref"
          MISSING=$((MISSING+1))
        fi
      done
    done
  fi
fi

if [ $MISSING -gt 0 ]; then
  echo "[Turbopack fix] Created $MISSING placeholder chunk(s)"
else
  echo "[Turbopack fix] All chunks OK"
fi
