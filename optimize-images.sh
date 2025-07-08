#!/bin/bash
set -e

echo "🖼️  OTTIMIZZAZIONE IMMAGINI PER WEB"
echo "=================================="

SOURCE_DIR="$HOME/Downloads/img"
TARGET_DIR="frontend/public/images/alloggi"
TARGET_SIZE="500000"  # 500KB in bytes

# Verifica ImageMagick
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick non installato!"
    exit 1
fi

# Crea directory target se non esiste
mkdir -p "$TARGET_DIR"

# Funzione per ottimizzare singola immagine
optimize_image() {
    local input="$1"
    local filename=$(basename "$input")
    local name_only="${filename%.*}"
    local output="$TARGET_DIR/${name_only}.jpg"
    
    echo "🔧 Processando: $filename"
    
    # Ottimizza: mantieni qualità ma riduci peso
    convert "$input" \
        -resize 1024x1024^ \
        -gravity center \
        -extent 1024x1024 \
        -quality 85 \
        -strip \
        "$output"
    
    # Verifica dimensione finale
    local final_size=$(stat -f%z "$output" 2>/dev/null || stat -c%s "$output")
    local final_mb=$((final_size / 1024))
    
    if [ $final_size -gt $TARGET_SIZE ]; then
        echo "⚠️  File ancora grande (${final_mb}KB), riprovo con qualità 75"
        convert "$input" \
            -resize 1024x1024^ \
            -gravity center \
            -extent 1024x1024 \
            -quality 75 \
            -strip \
            "$output"
        final_size=$(stat -f%z "$output" 2>/dev/null || stat -c%s "$output")
        final_mb=$((final_size / 1024))
    fi
    
    echo "✅ Salvato: $output (${final_mb}KB)"
}

# Elabora tutte le immagini PNG
echo "�� Scansione cartella: $SOURCE_DIR"
echo ""

for image in "$SOURCE_DIR"/*.png; do
    if [ -f "$image" ]; then
        optimize_image "$image"
    fi
done

echo ""
echo "🎉 OTTIMIZZAZIONE COMPLETATA!"
echo "📊 Risultato:"
ls -lh "$TARGET_DIR"
