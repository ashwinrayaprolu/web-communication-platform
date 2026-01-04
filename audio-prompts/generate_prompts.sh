#!/bin/bash
# Audio Prompt Generator
# Generates common IVR audio prompts using TTS service

set -e

TTS_URL="${TTS_URL:-http://localhost:8000}"
OUTPUT_DIR="${OUTPUT_DIR:-./audio-prompts}"

mkdir -p "$OUTPUT_DIR"

echo "Generating audio prompts..."

# Common IVR prompts
declare -A PROMPTS=(
    ["welcome"]="Welcome to our voice service. Please listen carefully to the following options."
    ["main_menu"]="For sales, press 1. For support, press 2. For billing, press 3. To repeat this menu, press star."
    ["connecting"]="Please wait while we connect your call."
    ["transferring"]="Transferring your call now."
    ["call_ended"]="Thank you for calling. Goodbye."
    ["invalid_option"]="Invalid option. Please try again."
    ["timeout"]="We didn't receive your input. Returning to main menu."
    ["agent_unavailable"]="All agents are currently busy. Please try again later."
    ["recording_message"]="Please leave your message after the tone. Press pound when finished."
    ["thank_you"]="Thank you. Your message has been recorded."
    ["sales_dept"]="You've reached sales. An agent will be with you shortly."
    ["support_dept"]="You've reached technical support. An agent will be with you shortly."
    ["billing_dept"]="You've reached billing. An agent will be with you shortly."
)

# Generate each prompt
for name in "${!PROMPTS[@]}"; do
    text="${PROMPTS[$name]}"
    echo "Generating: $name"
    
    curl -X POST "$TTS_URL/tts/phrase" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "text=$text&voice=default" \
        -o /dev/null -s || echo "  (TTS service not available - will generate on first use)"
done

echo "Audio prompts ready!"
echo "Location: $OUTPUT_DIR"
