from typing import Dict, Any

class TranslationAgent:
    def __init__(self):
        self.name = "Translation Agent"

    def translate_message(self, text: str, target_lang: str) -> Dict[str, Any]:
        why = f"Translating input text to {target_lang} for localized fan experience."
        confidence = "99%"
        
        return {
            "translated_text": text,  # Return original in demo mode, or mock translation
            "target_language": target_lang,
            "why": why,
            "confidence": confidence,
            "confidence_factors": {
                "dictionary_match": True,
                "latency_ms": 1.2
            },
            "is_ai": True
        }
