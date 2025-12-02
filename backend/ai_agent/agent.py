# backend/ai_agent/agent.py
"""
AI Agent using Ollama with Langchain
Supports local open-source models with fallback to external APIs
"""

import os
import logging
from typing import List, Optional
from pydantic import BaseModel, Field
from langchain_community.llms import Ollama
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from langchain_core.output_parsers import JsonOutputParser

logger = logging.getLogger(__name__)


# ============================================
# PYDANTIC MODELS FOR STRUCTURED OUTPUT
# ============================================

class TaskClassification(BaseModel):
    """Task classification result"""
    category: str = Field(
        description="Task category: 'personal', 'work', or 'urgent'"
    )
    reasoning: str = Field(
        description="Brief explanation (1-2 sentences) for the classification"
    )
    priority: int = Field(
        description="Priority level 1-5, where 5 is highest priority",
        ge=1,
        le=5
    )


class SubtaskSuggestion(BaseModel):
    """Individual subtask suggestion"""
    title: str = Field(
        description="Short, actionable subtask title (3-8 words)"
    )
    description: str = Field(
        description="Detailed description of what needs to be done"
    )


class SubtaskList(BaseModel):
    """List of subtask suggestions"""
    subtasks: List[SubtaskSuggestion] = Field(
        description="List of subtasks, ordered logically. Generate as many as needed based on task complexity."
    )
    reasoning: str = Field(
        default="Task broken down into actionable steps",
        description="Brief analysis of how the task was broken down"
    )


# ============================================
# AI AGENT CLASS
# ============================================

class TaskAIAgent:
    """
    AI Agent for task analysis using Ollama

    Supports:
    - Task classification (personal/work/urgent)
    - Subtask generation
    - Fallback to external APIs if Ollama unavailable
    """

    def __init__(
        self,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        temperature: float = 0.3,
        use_fallback: bool = True
    ):
        """
        Initialize AI Agent

        Args:
            model: Ollama model name (e.g., 'llama3.2:3b')
            base_url: Ollama base URL (default: http://ollama:11434)
            temperature: LLM temperature (0-1, lower = more deterministic)
            use_fallback: Whether to use external APIs as fallback
        """
        self.model = model or os.getenv('OLLAMA_MODEL', 'llama3.2:3b')
        self.base_url = base_url or os.getenv('OLLAMA_BASE_URL', 'http://ollama:11434')
        self.temperature = temperature
        self.use_fallback = use_fallback

        # Initialize LLM
        self.llm = self._initialize_llm()

        logger.info(f"TaskAIAgent initialized with model: {self.model}")

    def _initialize_llm(self):
        """Initialize the LLM (Ollama or fallback)"""
        try:
            # Try Ollama first
            llm = Ollama(
                model=self.model,
                base_url=self.base_url,
                temperature=self.temperature,
            )

            # Test connection
            llm.invoke("test")
            logger.info(f"Successfully connected to Ollama at {self.base_url}")
            return llm

        except Exception as e:
            logger.warning(f"Failed to connect to Ollama: {e}")

            if self.use_fallback:
                return self._initialize_fallback_llm()
            else:
                raise RuntimeError(f"Ollama not available and fallback disabled: {e}")

    def _initialize_fallback_llm(self):
        """Initialize fallback LLM (Anthropic or OpenAI)"""
        # Try Anthropic Claude
        anthropic_key = os.getenv('ANTHROPIC_API_KEY')
        if anthropic_key:
            try:
                from langchain_anthropic import ChatAnthropic
                llm = ChatAnthropic(
                    model="claude-3-5-sonnet-20241022",
                    temperature=self.temperature,
                    api_key=anthropic_key
                )
                logger.info("Using Anthropic Claude as fallback")
                return llm
            except ImportError:
                logger.warning("langchain-anthropic not installed")

        # Try OpenAI GPT
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key:
            try:
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI(
                    model="gpt-4-turbo-preview",
                    temperature=self.temperature,
                    api_key=openai_key
                )
                logger.info("Using OpenAI GPT as fallback")
                return llm
            except ImportError:
                logger.warning("langchain-openai not installed")

        raise RuntimeError("No LLM available (Ollama failed, no API keys)")

    def classify_task(self, title: str, description: str) -> dict:
        """
        Classify a task into categories

        Args:
            title: Task title
            description: Task description

        Returns:
            dict with 'category', 'reasoning', 'priority'
        """
        try:
            parser = PydanticOutputParser(pydantic_object=TaskClassification)

            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a task classification assistant.
                Analyze the task and classify it into ONE of these categories:
                - 'personal': personal life, hobbies, health, family, self-improvement
                - 'work': professional tasks, meetings, projects, career-related
                - 'urgent': time-sensitive tasks needing immediate attention (deadlines, emergencies)

                Also assign a priority level (1-5) where:
                - 5: Critical/Urgent - needs immediate action
                - 4: High - important, address soon
                - 3: Medium - normal priority
                - 2: Low - when time permits
                - 1: Very Low - nice to have

                Respond ONLY with valid JSON matching this structure:
                {format_instructions}
                """),
                ("user", """Task Title: {title}

Task Description: {description}

Classify this task.""")
            ])

            chain = prompt | self.llm | parser

            result = chain.invoke({
                "title": title,
                "description": description,
                "format_instructions": parser.get_format_instructions()
            })

            # Convert Pydantic model to dict
            result_dict = result.model_dump()
            logger.info(f"Task classified: {result_dict['category']} (priority: {result_dict['priority']})")
            return result_dict

        except Exception as e:
            logger.error(f"Classification failed: {e}")
            # Return safe default
            return {
                "category": "other",
                "reasoning": f"Classification unavailable: {str(e)}",
                "priority": 3
            }

    def suggest_subtasks(self, title: str, description: str) -> dict:
        """
        Generate subtask suggestions

        Args:
            title: Task title
            description: Task description

        Returns:
            dict with 'subtasks' (list) and 'reasoning'
        """
        try:
            parser = PydanticOutputParser(pydantic_object=SubtaskList)

            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a task breakdown assistant.
                Analyze the task complexity and break it down into the appropriate number of concrete, actionable subtasks.

                Guidelines:
                - Generate as many subtasks as needed (simple tasks may need 2-3, complex ones may need 10+)
                - Each subtask should be specific and achievable
                - Order them logically (what needs to happen first)
                - Make subtasks independent when possible
                - Use action verbs (Research, Create, Review, etc.)
                - Keep titles concise (3-8 words)
                - For complex tasks, don't hesitate to create comprehensive breakdowns

                Respond ONLY with valid JSON matching this structure:
                {format_instructions}
                """),
                ("user", """Task Title: {title}

Task Description: {description}

Break this down into subtasks.""")
            ])

            chain = prompt | self.llm | parser

            result = chain.invoke({
                "title": title,
                "description": description,
                "format_instructions": parser.get_format_instructions()
            })

            # Convert Pydantic model to dict
            result_dict = result.model_dump()
            logger.info(f"Generated {len(result_dict.get('subtasks', []))} subtasks")
            return result_dict

        except Exception as e:
            logger.error(f"Subtask generation failed: {e}")
            # Return safe default
            return {
                "subtasks": [],
                "reasoning": f"Subtask generation unavailable: {str(e)}"
            }

    def analyze_task(self, title: str, description: str) -> dict:
        """
        Perform complete task analysis (classification + subtasks)

        Args:
            title: Task title
            description: Task description

        Returns:
            dict with 'classification' and 'subtasks'
        """
        logger.info(f"Analyzing task: {title}")

        classification = self.classify_task(title, description)
        subtasks = self.suggest_subtasks(title, description)

        return {
            "classification": classification,
            "subtasks": subtasks
        }

    def analyze_task_stream(self, title: str, description: str):
        """
        Perform complete task analysis with streaming progress updates

        This is a generator that yields progress events for SSE streaming

        Args:
            title: Task title
            description: Task description

        Yields:
            dict events with 'type', 'message', and optional 'data'
        """
        import time

        yield {
            "type": "start",
            "message": "🚀 Starting AI analysis...",
            "step": "initialization"
        }

        time.sleep(0.3)  # Small delay for UX

        # Step 1: Classification
        yield {
            "type": "progress",
            "message": "🔍 Analyzing task category and priority...",
            "step": "classification"
        }

        try:
            classification = self.classify_task(title, description)

            yield {
                "type": "progress",
                "message": f"✅ Classified as '{classification['category']}' with priority {classification['priority']}/5",
                "step": "classification",
                "data": classification
            }

        except Exception as e:
            logger.error(f"Classification failed: {e}")
            yield {
                "type": "error",
                "message": f"⚠️ Classification failed: {str(e)}",
                "step": "classification"
            }
            classification = {
                "category": "other",
                "reasoning": "Classification failed",
                "priority": 3
            }

        time.sleep(0.5)

        # Step 2: Subtask Generation
        yield {
            "type": "progress",
            "message": "🧩 Breaking down task into subtasks...",
            "step": "subtasks"
        }

        try:
            subtasks = self.suggest_subtasks(title, description)
            subtask_count = len(subtasks.get('subtasks', []))

            yield {
                "type": "progress",
                "message": f"✅ Generated {subtask_count} actionable subtasks",
                "step": "subtasks",
                "data": subtasks
            }

        except Exception as e:
            logger.error(f"Subtask generation failed: {e}")
            yield {
                "type": "error",
                "message": f"⚠️ Subtask generation failed: {str(e)}",
                "step": "subtasks"
            }
            subtasks = {
                "subtasks": [],
                "reasoning": "Subtask generation failed"
            }

        time.sleep(0.3)

        # Final result
        result = {
            "classification": classification,
            "subtasks": subtasks
        }

        yield {
            "type": "complete",
            "message": "🎉 Analysis complete!",
            "step": "done",
            "data": result
        }


# ============================================
# USAGE EXAMPLES
# ============================================

if __name__ == "__main__":
    """
    Test the AI agent locally
    """
    import json

    # Initialize agent
    agent = TaskAIAgent(
        model="llama3.2:3b",
        base_url="http://localhost:11434"  # Local Ollama
    )

    # Test task
    title = "Plan company retreat"
    description = "Organize a 3-day team retreat for 20 people including venue, activities, and catering"

    # Test classification
    print("\n=== CLASSIFICATION ===")
    classification = agent.classify_task(title, description)
    print(json.dumps(classification, indent=2))

    # Test subtask generation
    print("\n=== SUBTASKS ===")
    subtasks = agent.suggest_subtasks(title, description)
    print(json.dumps(subtasks, indent=2))

    # Test full analysis
    print("\n=== FULL ANALYSIS ===")
    analysis = agent.analyze_task(title, description)
    print(json.dumps(analysis, indent=2))
