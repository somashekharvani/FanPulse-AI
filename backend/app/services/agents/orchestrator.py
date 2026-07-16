import logging
from typing import Dict, Any, List
from app.services.agents.memory import agent_memory
from app.services.agents.ticket_agent import TicketAgent
from app.services.agents.navigation_agent import NavigationAgent
from app.services.agents.crowd_agent import CrowdAgent
from app.services.agents.hospitality_agent import HospitalityAgent
from app.services.agents.traffic_agent import TrafficAgent
from app.services.agents.prediction_agent import PredictionAgent
from app.services.agents.sitrep_agent import SitrepAgent
from app.services.agents.accessibility_agent import AccessibilityAgent
from app.services.agents.volunteer_agent import VolunteerAgent
from app.services.agents.medical_agent import MedicalAgent
from app.services.agents.translation_agent import TranslationAgent
from app.services.agents.memory_agent import MemoryAgent

logger = logging.getLogger("fanpulse.orchestrator")

class AgentOrchestrator:
    def __init__(self):
        self.ticket_agent = TicketAgent()
        self.navigation_agent = NavigationAgent()
        self.crowd_agent = CrowdAgent()
        self.hospitality_agent = HospitalityAgent()
        self.traffic_agent = TrafficAgent()
        self.prediction_agent = PredictionAgent()
        self.sitrep_agent = SitrepAgent()
        self.accessibility_agent = AccessibilityAgent()
        self.volunteer_agent = VolunteerAgent()
        self.medical_agent = MedicalAgent()
        self.translation_agent = TranslationAgent()
        self.memory_agent = MemoryAgent()

    def process_companion_chat(self, email: str, message: str, history: List[Dict[str, str]], language: str = "en") -> Dict[str, Any]:
        """
        Coordinates multiple agents to solve the fan companion query.
        """
        logger.info(f"Orchestrator processing message from {email}: {message}")
        
        # Add to memory
        agent_memory.add_chat_message(email, "user", message)
        
        msg_lower = message.lower()
        
        # Decide which agents to invoke
        invoked_agents = []
        details = {}
        
        if "gate" in msg_lower or "entry" in msg_lower or "queue" in msg_lower:
            invoked_agents.append(self.crowd_agent)
            gate_check = "Gate C" if "gate c" in msg_lower else ("Gate B" if "gate b" in msg_lower else "Gate A")
            details["crowd"] = self.crowd_agent.check_congestion(gate_check)
            
        if "route" in msg_lower or "map" in msg_lower or "walk" in msg_lower:
            invoked_agents.append(self.navigation_agent)
            gate_route = "Gate C" if "gate c" in msg_lower else ("Gate B" if "gate b" in msg_lower else "Gate A")
            details["route"] = self.navigation_agent.get_route(gate_route, "104", False)

        if "accessibility" in msg_lower or "ramp" in msg_lower or "wheelchair" in msg_lower:
            invoked_agents.append(self.accessibility_agent)
            details["accessibility"] = self.accessibility_agent.get_accessibility_plan("wheelchair" in msg_lower, "vision" in msg_lower, "hearing" in msg_lower)
            
        if "volunteer" in msg_lower or "dispatch" in msg_lower:
            invoked_agents.append(self.volunteer_agent)
            details["volunteer"] = self.volunteer_agent.schedule_volunteer_dispatch("Gate C", "high")

        if "medical" in msg_lower or "doctor" in msg_lower or "injury" in msg_lower or "incident" in msg_lower:
            invoked_agents.append(self.medical_agent)
            details["medical"] = self.medical_agent.handle_medical_priority("Gate C", "Heatstroke alert")

        if "translate" in msg_lower or "language" in msg_lower:
            invoked_agents.append(self.translation_agent)
            details["translation"] = self.translation_agent.translate_message(message, language)

        if "history" in msg_lower or "preference" in msg_lower or "profile" in msg_lower:
            invoked_agents.append(self.memory_agent)
            details["memory"] = self.memory_agent.retrieve_preference_nudge(email)
            
        if "food" in msg_lower or "inventory" in msg_lower or "toilet" in msg_lower or "restroom" in msg_lower or "washroom" in msg_lower or "hotdog" in msg_lower:
            invoked_agents.append(self.hospitality_agent)
            details["hospitality"] = self.hospitality_agent.check_hospitality()
            
        if "parking" in msg_lower or "transit" in msg_lower or "train" in msg_lower or "weather" in msg_lower:
            invoked_agents.append(self.traffic_agent)
            details["traffic"] = self.traffic_agent.check_traffic()

        # Fallback to general chat if no specific agent was triggered
        if not invoked_agents:
            from app.services.ai_service import AIService
            from app.services.world_model import world_model
            state = world_model.get_current_state()
            
            chat_res = AIService.get_companion_response(message, history, state, language)
            response_text = chat_res.get("response", "I am your stadium companion AI. How can I help you today?")
            
            why = "General stadium FAQ lookup mapped to live database configs."
            confidence = "95%"
            confidence_factors = {
                "general_lookup": "Match operations profile matched",
                "weather": state.get("weather_transit", {}).get("conditions", "Clear")
            }
            suggested_actions = chat_res.get("suggested_actions", ["Check queue times", "Show map"])
        else:
            agent_names = ", ".join([a.name for a in invoked_agents])
            logger.info(f"Orchestrated agents: {agent_names}")
            
            paragraphs = []
            factors = {}
            confidences = []
            whys = []
            
            if "crowd" in details:
                paragraphs.append(details["crowd"]["nudge"])
                confidences.append(95)
                whys.append(details["crowd"]["why"])
                factors.update(details["crowd"]["confidence_factors"])
                
            if "route" in details:
                paragraphs.append("Navigation Path: " + " -> ".join(details["route"]["route_steps"]))
                confidences.append(98)
                whys.append(details["route"]["why"])
                factors.update(details["route"]["confidence_factors"])
                
            if "hospitality" in details:
                paragraphs.append(details["hospitality"]["recommendation"])
                confidences.append(96)
                whys.append(details["hospitality"]["why"])
                factors.update(details["hospitality"]["confidence_factors"])
                
            if "traffic" in details:
                paragraphs.append(details["traffic"]["recommendation"])
                confidences.append(94)
                whys.append(details["traffic"]["why"])
                factors.update(details["traffic"]["confidence_factors"])

            if "accessibility" in details:
                paragraphs.append(details["accessibility"]["nudge"])
                confidences.append(97)
                whys.append(details["accessibility"]["why"])
                factors.update(details["accessibility"]["confidence_factors"])

            if "volunteer" in details:
                paragraphs.append(details["volunteer"]["nudge"])
                confidences.append(95)
                whys.append(details["volunteer"]["why"])
                factors.update(details["volunteer"]["confidence_factors"])

            if "medical" in details:
                paragraphs.append(details["medical"]["nudge"])
                confidences.append(96)
                whys.append(details["medical"]["why"])
                factors.update(details["medical"]["confidence_factors"])

            if "translation" in details:
                paragraphs.append(details["translation"]["translated_text"])
                confidences.append(99)
                whys.append(details["translation"]["why"])
                factors.update(details["translation"]["confidence_factors"])

            if "memory" in details:
                paragraphs.append(details["memory"]["nudge"])
                confidences.append(98)
                whys.append(details["memory"]["why"])
                factors.update(details["memory"]["confidence_factors"])
                
            response_text = " | ".join(paragraphs)
            avg_conf = int(sum(confidences) / len(confidences))
            confidence = f"{avg_conf}%"
            why = " & ".join(whys)
            confidence_factors = factors
            suggested_actions = ["Show venue map", "Check transit updates"]

        # Add assistant response to memory
        agent_memory.add_chat_message(email, "assistant", response_text)
        
        return {
            "response": response_text,
            "why": why,
            "confidence": confidence,
            "confidence_factors": confidence_factors,
            "suggested_actions": suggested_actions,
            "is_ai": True
        }

# Global Singleton Orchestrator Instance
orchestrator = AgentOrchestrator()
