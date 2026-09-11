#!/bin/bash

OUTPUT_LOG=$(mktemp)

echo "delete all json file..."
rm *.json

echo "begin to generate a new wallet..."

if solana-keygen grind --starts-with un:1 > "$OUTPUT_LOG" 2>&1; then
  GENERATED_FILE=$(grep -o '/tmp/.*\.json\|[^ ]*\.json' "$OUTPUT_LOG" | tail -1)

  if [ -z "$GENERATED_FILE" ] || [ ! -f "$GENERATED_FILE" ]; then
    GENERATED_FILE=$(ls un*.json 2>/dev/null | head -1)
  fi

  if [ -f "$GENERATED_FILE" ]; then
    echo "found: $GENERATED_FILE"

    cp "$GENERATED_FILE" "ons-keypair.json"
    echo "copied: ons-keypair.json"

    ADDRESS=$(solana-keygen pubkey "$GENERATED_FILE")
    echo "new address: $ADDRESS"
  else
    echo "error"
    exit 1
  fi
else
  echo "error"
  cat "$OUTPUT_LOG"
  exit 1
fi

rm -f "$OUTPUT_LOG"