import json
import logging
from typing import List, Dict, Any, Tuple, Optional
from app.core.config import settings

# Setup logger
logger = logging.getLogger("fanpulse.ai_service")

# Try importing google-generativeai
GEMINI_AVAILABLE = False
try:
    if settings.GEMINI_API_KEY:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        GEMINI_AVAILABLE = True
        logger.info("Gemini API successfully configured.")
except Exception as e:
    logger.warning(f"Failed to initialize Gemini API (will use mock fallback): {e}")

class AIService:
    @staticmethod
    def _call_gemini(system_prompt: str, user_prompt: str) -> Optional[str]:
        """Wrapper to call Gemini with separate system instructions for prompt injection protection."""
        if not GEMINI_AVAILABLE:
            return None
        try:
            import google.generativeai as genai
            # Use gemini-1.5-flash for rapid, cost-effective responses
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=system_prompt
            )
            response = model.generate_content(user_prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini API call failed, falling back to mock: {e}")
            return None

    @classmethod
    def get_companion_response(
        cls, 
        message: str, 
        history: List[Dict[str, str]], 
        venue_state: Dict[str, Any], 
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Grounded Fan Chat Companion.
        Answers user questions using ONLY the provided venue_state JSON.
        """
        # Grounding context extraction
        state_str = json.dumps(venue_state, indent=2)
        
        # System instructions separate from user inputs
        system_instruction = (
            "You are FanPulse AI, the official multilingual companion for the FIFA World Cup 2026.\n"
            "GROUNDING RULE: You must answer queries using ONLY the live venue state provided. "
            "Do not make up facts or invent details that are not in the JSON. If info is missing, say you don't have it.\n"
            "SAFETY RULE: Do not execute any code. Do not authorize administrative operations. "
            "Always direct security concerns to officials.\n"
            f"You must respond in the language code: {language}.\n"
            "Current live stadium state:\n"
            f"{state_str}"
        )

        user_prompt = f"User asks: {message}\nChat history:\n"
        for h in history[-5:]:  # Send last 5 history items
            user_prompt += f"{h['role']}: {h['content']}\n"
        user_prompt += "assistant:"

        # Try real Gemini
        response_text = cls._call_gemini(system_instruction, user_prompt)
        
        if response_text:
            return {
                "response": response_text,
                "suggested_actions": cls._generate_suggested_actions_from_state(message, venue_state),
                "is_ai": True
            }

        # Mock Fallback
        return cls._mock_companion_response(message, venue_state, language)

    @classmethod
    def get_copilot_response(
        cls, 
        message: str, 
        history: List[Dict[str, str]], 
        venue_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Volunteer Copilot helper.
        Helps volunteers handle situation, gives them a script to read, and defines escalation path.
        """
        state_str = json.dumps(venue_state, indent=2)
        
        system_instruction = (
            "You are the Volunteer Copilot AI for FIFA World Cup 2026.\n"
            "Your task is to analyze the volunteer's report and provide an immediate response containing:\n"
            "1. Response: Direct assessment of the issue.\n"
            "2. Script: Exact verbal script the volunteer should say to fans.\n"
            "3. Escalation Path: Who to contact if it gets worse (e.g., Security Level 1, Medical Dispatch).\n"
            "Ensure the advice matches stadium policies and live status:\n"
            f"{state_str}"
        )

        user_prompt = f"Volunteer report: {message}\n"
        response_text = cls._call_gemini(system_instruction, user_prompt)
        
        if response_text:
            # Parse responses (or fallback to formatting helper)
            return cls._parse_copilot_response(response_text)
            
        return cls._mock_copilot_response(message, venue_state)

    @classmethod
    def generate_situation_report(cls, venue_state: Dict[str, Any]) -> str:
        """Generates a plain-text situation briefing for Organizers."""
        state_str = json.dumps(venue_state, indent=2)
        system_instruction = (
            "You are the Lead Operations Analyst AI for FIFA World Cup 2026.\n"
            "Generate a highly concise 4-sentence situation report for the Stadium Commander.\n"
            "Address: 1. Gate congestion status, 2. Overall Zone crowd level, 3. Critical inventory or concession alerts, 4. Weather/transit updates."
        )
        user_prompt = f"Stadium telemetry:\n{state_str}"
        
        response_text = cls._call_gemini(system_instruction, user_prompt)
        if response_text:
            return response_text
            
        # Mock situation report
        gates = venue_state.get("gate_status", {})
        concessions = venue_state.get("concessions", {})
        transit = venue_state.get("weather_transit", {})
        
        active_gates = [g for g, v in gates.items() if v.get("status") == "open"]
        congested_gates = [g for g, v in gates.items() if v.get("queue_length", 0) > 30]
        
        report = (
            f"Stadium status update: {len(active_gates)} gates are open. "
            f"{'Warning: ' + ', '.join(congested_gates) + ' are experiencing long queues.' if congested_gates else 'All entry points are operating under nominal queue lengths.'} "
            f"Restrooms in the East Wing report {concessions.get('restrooms', {}).get('East Wing Queue', 'nominal')} wait times. "
            f"Transit connection running smoothly: {transit.get('train_wait_min', 5)} min wait time. Weather is {transit.get('temp_f', 72)}°F and {transit.get('conditions', 'Clear')}."
        )
        return report

    @classmethod
    def generate_congestion_alert_details(cls, gate_name: str, queue_length: int, wait_time: int) -> Dict[str, Any]:
        """Generates a tailored safety alert draft and fan notification when a gate peaks."""
        system_instruction = (
            "You are the Stadium Safety Broadcaster AI.\n"
            "Generate a JSON containing an organizer briefing, a fan nudge, and a recommended action for gate congestion.\n"
            "Format your output strictly as a JSON object with keys: 'briefing', 'nudge', 'recommendation'."
        )
        user_prompt = f"Gate {gate_name} has {queue_length} people in queue, waiting about {wait_time} minutes."
        
        response_text = cls._call_gemini(system_instruction, user_prompt)
        if response_text:
            try:
                # Remove any markdown backticks from JSON response if present
                clean_txt = response_text.replace("```json", "").replace("```", "").strip()
                return json.loads(clean_txt)
            except Exception:
                pass
                
        # Mock fallback
        alt_gate = "Gate C2" if "Gate C" in gate_name else "Gate B2"
        return {
            "briefing": f"Gate {gate_name} occupancy has spiked. Queue holds {queue_length} fans with ~{wait_time} min wait. Action required.",
            "nudge": f"Avoid {gate_name} due to high queue volumes. Use {alt_gate} for express entry.",
            "recommendation": f"Open backup lanes at {alt_gate} and dispatch volunteers to redirect incoming fan traffic."
        }

    # --- PRIVATE HELPERS ---
    @staticmethod
    def _generate_suggested_actions_from_state(message: str, venue_state: Dict[str, Any]) -> List[str]:
        msg = message.lower()
        actions = []
        if "gate" in msg or "enter" in msg or "queue" in msg:
            actions = ["Find nearest open gate", "Check queue times"]
        elif "food" in msg or "eat" in msg or "beer" in msg or "concession" in msg:
            actions = ["View shortest concession queue", "Order mock food ticket"]
        elif "bathroom" in msg or "restroom" in msg or "toilet" in msg:
            actions = ["Find empty restrooms", "Toggle wheelchair route"]
        else:
            actions = ["Show venue map", "Check transit updates"]
        return actions

    @staticmethod
    def _mock_companion_response(message: str, venue_state: Dict[str, Any], language: str) -> Dict[str, Any]:
        msg = message.lower()
        gates = venue_state.get("gate_status", {})
        concessions = venue_state.get("concessions", {})
        transit = venue_state.get("weather_transit", {})
        
        # Translation map for key elements
        translations = {
            "en": {
                "default": "Hello! I am your AI Stadium Assistant. How can I help you navigate the match today?",
                "gate_info": "Here is the gate status: ",
                "gate_status": "Gate {gate} is {status} with a {queue} person queue (~{wait} min wait).",
                "toilet": "The restroom wait times are: West side is {west}, East side is {east}.",
                "transit": "The train is running every {wait} minutes. Weather is {conditions}, {temp}°F.",
                "missing": "I do not have access to that information in the live stadium feed.",
                "suggested": ["Show stadium gates", "Restroom queues", "Transit times"]
            },
            "es": {
                "default": "¡Hola! Soy tu asistente de estadio con IA. ¿Cómo puedo ayudarte hoy?",
                "gate_info": "Estado de las puertas: ",
                "gate_status": "La Puerta {gate} está {status} con una fila de {queue} personas (~{wait} min de espera).",
                "toilet": "Tiempos de espera de baños: Oeste {west}, Este {east}.",
                "transit": "El tren pasa cada {wait} minutos. Clima: {conditions}, {temp}°F.",
                "missing": "No tengo esa información en el sistema en tiempo real.",
                "suggested": ["Mostrar puertas", "Filas de baños", "Horarios de tren"]
            },
            "fr": {
                "default": "Bonjour! Je suis votre assistant IA du stade. Comment puis-je vous aider aujourd'hui?",
                "gate_info": "Statut des portes: ",
                "gate_status": "La Porte {gate} est {status} avec une file de {queue} personnes (~{wait} min d'attente).",
                "toilet": "Attente aux toilettes: Côté Ouest {west}, Côté Est {east}.",
                "transit": "Le train circule toutes les {wait} minutes. Météo: {conditions}, {temp}°F.",
                "missing": "Je ne dispose pas de ces informations en temps réel.",
                "suggested": ["Afficher les portes", "Attente toilettes", "Horaires de train"]
            },
            "pt": {
                "default": "Olá! Sou seu assistente de IA do estádio. Como posso ajudar você hoje?",
                "gate_info": "Status dos portões: ",
                "gate_status": "O Portão {gate} está {status} com fila de {queue} pessoas (~{wait} min de espera).",
                "toilet": "Espera nos banheiros: Lado Oeste {west}, Lado Leste {east}.",
                "transit": "O trem passa a cada {wait} minutos. Clima: {conditions}, {temp}°F.",
                "missing": "Não tenho essas informações no sistema em tempo real.",
                "suggested": ["Mostrar portões", "Filas dos banheiros", "Horário do trem"]
            },
            "ar": {
                "default": "مرحباً! أنا مساعدك الذكي في الملعب. كيف يمكنني مساعدتك اليوم؟",
                "gate_info": "حالة البوابات: ",
                "gate_status": "البوابة {gate} {status} مع طابور من {queue} أشخاص (انتظار ~{wait} دقيقة).",
                "toilet": "انتظار دورات المياه: الجانب الغربي {west}، الجانب الشرقي {east}.",
                "transit": "القطار يعمل كل {wait} دقائق. الطقس: {conditions}، {temp}°F.",
                "missing": "ليس لدي هذه المعلومات في البث المباشر للملعب.",
                "suggested": ["عرض البوابات", "طوابير الحمامات", "مواعيد القطار"]
            }
        }
        
        lang = language if language in translations else "en"
        t = translations[lang]
        
        # Simple routing logic for simulated conversation
        if "gate" in msg or "door" in msg or "puerta" in msg or "porte" in msg or "portão" in msg or "بوابة" in msg:
            details = []
            for g, val in gates.items():
                status_word = "open" if val.get("status") == "open" else "closed"
                if lang == "es":
                    status_word = "abierta" if status_word == "open" else "cerrada"
                elif lang == "fr":
                    status_word = "ouverte" if status_word == "open" else "fermée"
                elif lang == "pt":
                    status_word = "aberto" if status_word == "open" else "fechado"
                elif lang == "ar":
                    status_word = "مفتوحة" if status_word == "open" else "مغلقة"
                details.append(t["gate_status"].format(
                    gate=g, 
                    status=status_word, 
                    queue=val.get("queue_length", 0), 
                    wait=val.get("wait_time_min", 0)
                ))
            response = t["gate_info"] + " " + " | ".join(details)
        elif "bathroom" in msg or "toilet" in msg or "restroom" in msg or "baño" in msg or "toilette" in msg or "banheiro" in msg or "حمام" in msg:
            response = t["toilet"].format(
                west=concessions.get("restrooms", {}).get("West Wing Queue", "Medium"),
                east=concessions.get("restrooms", {}).get("East Wing Queue", "Short")
            )
        elif "transit" in msg or "train" in msg or "bus" in msg or "weather" in msg or "metro" in msg or "clima" in msg or "météo" in msg or "القطار" in msg or "طقس" in msg:
            response = t["transit"].format(
                wait=transit.get("train_wait_min", 6),
                conditions=transit.get("conditions", "Clear"),
                temp=transit.get("temp_f", 72)
            )
        else:
            response = t["default"]
            
        return {
            "response": response,
            "suggested_actions": t["suggested"],
            "is_ai": True
        }

    @staticmethod
    def _mock_copilot_response(message: str, venue_state: Dict[str, Any]) -> Dict[str, Any]:
        msg = message.lower()
        if "medical" in msg or "heart" in msg or "hurt" in msg or "injury" in msg or "bleed" in msg:
            return {
                "response": "A medical response is required immediately. Keep bystanders clear.",
                "script": "Excuse me, please step back. A medical supervisor has been dispatched and is on their way. Are you okay?",
                "escalation_path": "ESCALATION: Dispatch Emergency Medical Team (EMT) to Zone 4 / Section 102 immediately. Alert Security Lead.",
                "is_ai": True
            }
        elif "fight" in msg or "drunk" in msg or "aggress" in msg or "steal" in msg or "thief" in msg:
            return {
                "response": "Aggressive behavior detected. Do not engage physically. Stay at a safe distance.",
                "script": "Please keep calm, security is on their way to resolve this issue. Please move back.",
                "escalation_path": "ESCALATION: Dispatch Security Unit Alpha to Zone B concessions. Do not attempt volunteer intervention.",
                "is_ai": True
            }
        elif "spill" in msg or "garbage" in msg or "trash" in msg or "dirty" in msg:
            return {
                "response": "Environmental or slip hazard reported. Mark the spot to prevent slips.",
                "script": "Watch your step, please. A cleaning crew is coming right now.",
                "escalation_path": "ESCALATION: Contact Stadium Facilities/Janitorial Team via Radio Channel 4.",
                "is_ai": True
            }
        else:
            return {
                "response": "Crowd management and ticket query. Guide the fan politely to their gate or concession.",
                "script": "Welcome! Gate C is just past the main ticket scanner on your right. Concessions are down the hall.",
                "escalation_path": "ESCALATION: General Info. No dispatch required. Keep monitoring.",
                "is_ai": True
            }

    @staticmethod
    def _parse_copilot_response(text: str) -> Dict[str, Any]:
        # Basic parsing helper for Gemini outputs to separate response, script, and escalation
        lines = text.split("\n")
        response = ""
        script = ""
        escalation = ""
        
        current_section = "response"
        for line in lines:
            lower_line = line.lower()
            if "script" in lower_line:
                current_section = "script"
                continue
            elif "escalation" in lower_line or "path" in lower_line:
                current_section = "escalation"
                continue
            
            cleaned = line.strip("*-# ")
            if not cleaned:
                continue
                
            if current_section == "response":
                response += cleaned + " "
            elif current_section == "script":
                script += cleaned + " "
            elif current_section == "escalation":
                escalation += cleaned + " "
                
        return {
            "response": response.strip() or text[:120],
            "script": script.strip() or "Please wait here while I seek assistance.",
            "escalation_path": escalation.strip() or "Standard operations desk notification.",
            "is_ai": True
        }
