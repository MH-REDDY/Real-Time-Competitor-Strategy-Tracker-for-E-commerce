"""
LLM Agent using Groq API with function calling
"""
import os
import json
import re
from datetime import datetime
from groq import Groq
from typing import List, Dict, Optional, AsyncIterator
from conversation_memory import ConversationMemory
import tools


# Custom JSON encoder for datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Initialize Groq client
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in environment variables")

groq_client = Groq(api_key=GROQ_API_KEY)

# Model configuration
# Updated: llama-3.1-70b-versatile was decommissioned, using llama-3.3-70b-versatile
MODEL = "llama-3.3-70b-versatile"  # Fast, capable, and current
MAX_TOKENS = 2000  # reduce to conserve token budget and avoid TPD exhaustion
TEMPERATURE = 0.7


# Function definitions for Groq
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search for products in the database. Use this when user asks about products, wants to find items, or mentions a brand/category.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search term to find in product titles (e.g., 'laptop', 'phone', 'headphones')"
                    },
                    "brand": {
                        "type": "string",
                        "description": "Brand name to filter by (e.g., 'Samsung', 'Apple', 'Sony')"
                    },
                    "min_rating": {
                        "type": "number",
                        "description": "Minimum rating filter (0-5)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_product_details",
            "description": "Get detailed information about a specific product by ASIN. Use when user asks about a specific product's details, specs, or features.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asin": {
                        "type": "string",
                        "description": "Amazon Standard Identification Number (ASIN) of the product"
                    }
                },
                "required": ["asin"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_price_trends",
            "description": "Analyze price history and trends for a product. Use when user asks about price changes, historical prices, or pricing trends.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asin": {
                        "type": "string",
                        "description": "Product ASIN"
                    },
                    "brand": {
                        "type": "string",
                        "description": "Brand name if ASIN not available"
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of days to analyze (default 30)",
                        "default": 30
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_forecast",
            "description": "Get price forecast prediction using XGBoost model. Use when user asks about future prices, predictions, or forecasts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "brand": {
                        "type": "string",
                        "description": "Product brand"
                    },
                    "model": {
                        "type": "string",
                        "description": "Product model name"
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of days to forecast (default 30)",
                        "default": 30
                    }
                },
                "required": ["brand", "model"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "trigger_scraper",
            "description": "Trigger Amazon scraper to get latest competitor prices. Use when user asks 'what's the current price', 'get latest price', or wants real-time competitor data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_query": {
                        "type": "string",
                        "description": "Optional product to scrape specifically"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_pricing_recommendation",
            "description": "Get pricing recommendations based on competitor analysis and market trends. Use when user asks about pricing strategy, how to price products, or wants recommendations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asin": {
                        "type": "string",
                        "description": "Product ASIN"
                    },
                    "brand": {
                        "type": "string",
                        "description": "Brand name if ASIN not available"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_rated_products",
            "description": "Get products with highest ratings. Use when user asks about best products, top rated items, or highest quality products.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of products to return (default 5)",
                        "default": 5
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_latest_price",
            "description": "Get the most recent Amazon price for a product by ASIN or brand.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asin": {"type": "string", "description": "Product ASIN"},
                    "brand": {"type": "string", "description": "Brand or name if ASIN unknown"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_scraper_status",
            "description": "Check if the Amazon scraper has finished and get recently updated prices. Use this after trigger_scraper to show users the scraped results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_id": {"type": "string", "description": "Optional job ID from trigger_scraper"}
                },
                "required": []
            }
        }
    }
]


class LLMAgent:
    """LLM Agent with conversation memory and function calling"""
    
    def __init__(self):
        self.memory = ConversationMemory()
        self.rate_limit_until: Optional[datetime] = None
        self.system_prompt = """You are an expert e-commerce pricing assistant for a specialized headphones store. You help with:

1. **Product Information**: Search products, provide detailed descriptions and specs
2. **Competitor Pricing**: Track and analyze competitor prices in real-time
3. **Price Trends**: Analyze historical price data and identify patterns
4. **Price Forecasting**: Predict future prices using ML models
5. **Pricing Recommendations**: Strategic pricing advice based on competition and market trends

**When user asks "what can you do?" or "help", respond conversationally without calling any functions. Explain your capabilities in a friendly way.**

**YOUR PRODUCT CATALOG (ONLY THESE 5 PRODUCTS EXIST):**
    1. boAt Rockerz 650 Pro (2025 Launch) - ASIN: B0DV5HX4JZ
    2. soundcore by Anker Q20i Wireless Bluetooth Over-Ear Headphones - ASIN: B0C3HCD34R
    3. HP H200 On Ear Wireless Headset, Black - ASIN: B0DHKJ5HWL
    4. JBL Tune 770NC Wireless Over Ear ANC Headphones - ASIN: B09CYX92NB
    5. Amazon Basics Pro Series Wireless Noise Cancelling ANC Over Ear Headphone - ASIN: B0DG2SLR9F

**Your Capabilities:**
    - Access to EXACTLY 5 headphone products listed above (NO OTHER PRODUCTS)
    - ONLY Amazon India is supported (no other competitors)

**CRITICAL RULES (NEVER VIOLATE):**
    1. You ONLY have access to the 5 headphone products listed above—NOTHING ELSE
    2. If user asks about products NOT in the list (Samsung, iPhone, Apple AirPods, etc.), politely say: "I only have data for these 5 wireless headphones. Would you like information about any of them?"
    3. NEVER make up product data, prices, ASINs, or product names outside the 5 products
    4. ALWAYS call get_top_rated_products() to show all products; call search_products() only if user mentions specific brand (boAt/Anker/HP/JBL/Amazon Basics)
    5. ALL prices are in Indian Rupees (₹), NEVER use $ (USD)
    6. If a tool returns no data or errors, say so honestly—don't fill in with examples
    7. **ABSOLUTELY CRITICAL - FUNCTION CALLING**: 
       - NEVER write function calls as text like: <function>name()</function>, function_name(), or any XML/code syntax
       - NEVER mention function names in your response
       - The system uses automatic function calling via tools - you don't need to write function calls
       - Just provide natural language responses and the system handles function execution
    8. After triggering scraper with trigger_scraper(), immediately tell user to wait 5-10 seconds, then call check_scraper_status() to show the updated prices
    9. We ONLY scrape Amazon India (no Flipkart, no other sites)
    10. **CRITICAL**: When the system calls functions for you, use the returned data to formulate your natural language response
    11. For pricing recommendations: When user asks for pricing advice/recommendation for a brand (like "JBL", "boAt"), the system will automatically call the appropriate functions - just wait for the data and format it nicely

**Scraper Workflow (IMPORTANT):**
When user requests price scraping:
1. Call trigger_scraper() to start the scraper
2. Tell user: "Scraper started! Please wait 5-10 seconds while I fetch the latest prices..."
3. After your response, the system will automatically wait 8 seconds
4. Then call check_scraper_status() to retrieve and display the freshly scraped prices
5. Show the user the updated prices from check_scraper_status() results

**Guidelines:**
- Be conversational and helpful
- Explain insights with context from actual tool results
- Provide recommendations based on real data only
- When showing products, mention their actual ASIN, title, price (₹), and rating from tools
- For price trends, explain what the trend means based on returned data
- Our scraper fetches Amazon India data only
- If user asks unrelated questions (weather, general knowledge, coding help, etc.), politely redirect: "I specialize in headphone product pricing and competitor analysis. I can help you with product details, price trends, forecasts, or pricing recommendations for our 5 wireless headphones. What would you like to know?"

**Available Actions:**
- 🔍 Search products
- 📊 Analyze price trends
- 🔮 Get price forecasts
- 🛒 Trigger real-time scraping
- 💡 Provide pricing recommendations

**CRITICAL: Pricing Recommendation Format**
When presenting pricing recommendations from get_pricing_recommendation(), ALWAYS format the response as follows:

📊 Pricing Recommendation for [Product Title]:

Current Inventory Price: ₹[current_price]
Recommended Optimum Price: ₹[recommended_price] (±[change_percent]%)

📈 Market Analysis ([days] days, [data_points] data points):
• Competitor Range: ₹[min] - ₹[max]
• Average: ₹[avg] | Median: ₹[median]
• Latest: ₹[latest]
• Volatility: [volatility]% ([volatility_label])
• Trend: [trend]

⭐ Product Factors:
• Rating: [rating] ([rating_label]) → [multiplier]x multiplier
• Reviews: [reviews_count] reviews → [multiplier]x credibility boost

💡 Detailed Analysis:
[detailed_analysis text]

Use emojis, bullet points, and clear formatting. Present the data professionally as shown in the format above.

Always use available tools to fetch real data rather than making assumptions. For unrelated queries, kindly redirect users to your core capabilities."""
    
    async def chat(
        self,
        user_message: str,
        session_id: str,
        stream: bool = False
    ) -> AsyncIterator[str] | Dict:
        """
        Process user message with conversation context
        
        Args:
            user_message: User's message
            session_id: Conversation session ID
            stream: Whether to stream response
        
        Returns:
            Response text (streaming or complete)
        """
        try:
            # Add user message to memory
            self.memory.add_message(session_id, "user", user_message)

            # If recently rate-limited, return a friendly message without calling the LLM
            if self.rate_limit_until is not None:
                now = datetime.utcnow()
                if now < self.rate_limit_until:
                    remaining = int((self.rate_limit_until - now).total_seconds() // 60)
                    msg = (
                        f"I'm temporarily rate-limited by the LLM provider. Please try again in ~{remaining} minute(s). "
                        "Meanwhile, you can use the action buttons (Top Products, Trend, Forecast) for direct data."
                    )
                    self.memory.add_message(session_id, "assistant", msg)
                    yield {"response": msg, "session_id": session_id}
                    return

            # Get conversation history (list of dicts with 'role' and 'content')
            history = self.memory.get_history(session_id)
            # Only keep 'role' and 'content' keys for Groq
            groq_history = [
                {"role": msg["role"], "content": msg["content"]}
                for msg in history if "role" in msg and "content" in msg
            ]
            # Limit history to reduce token usage
            groq_history = groq_history[-12:]

            # Prepare messages for Groq
            messages = [
                {"role": "system", "content": self.system_prompt},
                *groq_history
            ]
            
            # Check if user is asking about products NOT in our catalog
            query_lower = user_message.lower()
            allowed_brands = ["boat", "anker", "hp", "jbl", "amazon basics", "soundcore", "rockerz", "tune 770", "h200", "q20i"]
            forbidden_products = ["samsung", "apple", "airpods", "iphone", "galaxy", "sony", "bose", "echo", "dot", "pixel"]
            
            # If user mentions forbidden product and asks about price/details
            should_reject = False
            if any(forbidden in query_lower for forbidden in forbidden_products):
                product_context = ["price", "cost", "buy", "available", "details", "specification", "forecast", "trend"]
                if any(ctx in query_lower for ctx in product_context):
                    should_reject = True
                    # Return immediate rejection response without calling LLM
                    rejection_msg = f"I only have data for these 5 wireless headphones:\n\n1. boAt Rockerz 650 Pro\n2. soundcore by Anker Q20i\n3. HP H200\n4. JBL Tune 770NC\n5. Amazon Basics Pro Series ANC\n\nI don't have information about {[p for p in forbidden_products if p in query_lower][0].title()} products. Would you like to know about any of these headphones instead?"
                    
                    self.memory.add_message(session_id, "user", user_message)
                    self.memory.add_message(session_id, "assistant", rejection_msg)
                    
                    yield {"response": rejection_msg, "session_id": session_id}
            
            if should_reject:
                return
            
            # Detect if query requires product data
            force_tool = None
            
            # Check for general capability questions first (these should NOT force tool calling)
            capability_questions = ["what can you do", "what do you do", "help", "capabilities", "features"]
            is_capability_question = any(q in query_lower for q in capability_questions)
            
            # Product data keywords
            product_keywords = [
                "show products", "list products", "all products", "get products",
                "top rated", "best products", "highest rated"
            ]
            
            # Only force tool calling for specific product data requests, not general questions
            if not is_capability_question and any(keyword in query_lower for keyword in product_keywords):
                # Force tool calling for product queries
                if "top" in query_lower or "best" in query_lower or "rated" in query_lower or "what are" in query_lower:
                    force_tool = {"type": "function", "function": {"name": "get_top_rated_products"}}
                elif "search" in query_lower and any(brand in query_lower for brand in ["boat", "anker", "hp", "jbl", "amazon"]):
                    force_tool = {"type": "function", "function": {"name": "search_products"}}
                elif "trend" in query_lower and "price" in query_lower:
                    force_tool = {"type": "function", "function": {"name": "get_price_trends"}}
                elif "latest" in query_lower or "all products" in query_lower or "all product" in query_lower:
                    force_tool = {"type": "function", "function": {"name": "get_top_rated_products"}}
            
            # Detect pricing recommendation requests
            pricing_keywords = ["pricing recommendation", "price recommendation", "pricing advice", "recommend price", "optimum price"]
            if any(keyword in query_lower for keyword in pricing_keywords):
                # Check if user specified a brand or if they want highest rated
                if "highest" in query_lower or "top rated" in query_lower or "best" in query_lower:
                    force_tool = {"type": "function", "function": {"name": "get_top_rated_products"}}
                elif any(brand in query_lower for brand in ["boat", "jbl", "hp", "anker", "amazon"]):
                    # They mentioned a specific brand
                    for brand in ["boat", "jbl", "hp", "anker", "amazon"]:
                        if brand in query_lower:
                            force_tool = {"type": "function", "function": {"name": "get_pricing_recommendation"}}
                            break
            
            # First pass: Check if function calling needed
            try:
                response = groq_client.chat.completions.create(
                    model=MODEL,
                    messages=messages,
                    tools=TOOL_DEFINITIONS,
                    tool_choice=force_tool if force_tool else "auto",
                    temperature=TEMPERATURE,
                    max_tokens=MAX_TOKENS
                )
            except Exception as e:
                err_text = str(e)
                if "rate limit" in err_text.lower() or "rate_limit_exceeded" in err_text.lower():
                    # Parse suggested wait if present
                    wait_minutes = 60
                    m = re.search(r"try again in\s+(\d+)m", err_text)
                    if m:
                        try:
                            wait_minutes = max(1, int(m.group(1)))
                        except Exception:
                            pass
                    from datetime import timedelta
                    self.rate_limit_until = datetime.utcnow() + timedelta(minutes=wait_minutes)
                    msg = (
                        "I'm temporarily rate-limited by the LLM provider. Please try again later. "
                        f"Estimated wait: ~{wait_minutes} minute(s)."
                    )
                    self.memory.add_message(session_id, "assistant", msg)
                    yield {"response": msg, "session_id": session_id}
                    return
                elif "tool_use_failed" in err_text.lower() or "failed to call a function" in err_text.lower():
                    # Model tried to output function as text instead of proper tool call
                    # Extract function call from failed_generation and execute manually
                    print(f"⚠️ TOOL USE FAILED - Attempting manual function parsing: {err_text}")
                    
                    # Try to extract function name and args from the error
                    # Pattern: <function=function_name{args}</function>
                    match = re.search(r"<function=([a-zA-Z0-9_]+)(\{[^}]*\})?</function>", err_text)
                    if match:
                        function_name = match.group(1)
                        args_str = match.group(2) if match.group(2) else "{}"
                        try:
                            function_args = json.loads(args_str)
                        except:
                            function_args = {}
                        
                        print(f"📞 Manually calling function: {function_name}({function_args})")
                        
                        # Execute the function
                        try:
                            result = await self._execute_function(function_name, function_args)
                            
                            # Add function result to messages
                            messages.append({
                                "role": "assistant",
                                "content": f"Calling {function_name}"
                            })
                            messages.append({
                                "role": "user",
                                "content": f"Function {function_name} returned: {json.dumps(result, cls=DateTimeEncoder)}"
                            })
                            
                            # Generate response with function result
                            final_response = groq_client.chat.completions.create(
                                model=MODEL,
                                messages=messages,
                                temperature=TEMPERATURE,
                                max_tokens=MAX_TOKENS,
                                stream=stream
                            )
                            
                            if stream:
                                async for chunk in self._stream_response(final_response, session_id):
                                    yield chunk
                            else:
                                final_text = final_response.choices[0].message.content
                                self.memory.add_message(session_id, "assistant", final_text)
                                yield {"response": final_text, "session_id": session_id}
                            return
                        except Exception as func_err:
                            print(f"❌ Manual function execution failed: {func_err}")
                    
                    # If manual parsing failed, fall through to generic error
                    msg = "I apologize, I encountered a technical issue. I specialize in helping with product information, pricing trends, and forecasts for wireless headphones. How can I assist you?"
                    self.memory.add_message(session_id, "assistant", msg)
                    yield {"response": msg, "session_id": session_id}
                    return
                else:
                    raise
            
            assistant_message = response.choices[0].message
            print("ASSISTANT MESSAGE:", assistant_message)

            # Fallback: some model generations print function calls as XML-like tags
            # e.g. <function=get_top_rated_products()></function> or <function>get_top_rated_products()</function>
            # If Groq didn't return structured tool_calls but the assistant content
            # contains an inline function tag, parse and execute it as a tool call.
            if not getattr(assistant_message, "tool_calls", None):
                content_text = (assistant_message.content or "")
                # match patterns like: <function>analyze_price_trend({"asin": "B0C3HCD34R"})</function>
                # or <function=get_top_rated_products()></function>
                m = re.search(r"<function[=>]?([a-zA-Z0-9_]+)\((.*?)\)</function>", content_text, re.DOTALL)
                if m:
                    function_name = m.group(1)
                    args_raw = m.group(2).strip()
                    # Try to parse args as JSON-like dict, otherwise assume empty
                    if args_raw:
                        try:
                            # Attempt direct JSON parse
                            args = json.loads(args_raw)
                        except Exception:
                            # Fallback: empty args
                            args = {}
                    else:
                        args = {}

                    # Execute the detected function and continue as if tool_calls were present
                    try:
                        result = await self._execute_function(function_name, args)
                    except Exception as e:
                        result = {"error": f"Function execution error (fallback): {str(e)}"}

                    # Build function_results and append to messages like normal tool flow
                    function_results = [
                        {
                            "tool_call_id": "fallback-1",
                            "role": "tool",
                            "name": function_name,
                            "content": json.dumps(result, cls=DateTimeEncoder)
                        }
                    ]

                    messages.append({
                        "role": "assistant",
                        "content": content_text or "",
                        "tool_calls": [
                            {
                                "id": "fallback-1",
                                "type": "function",
                                "function": {
                                    "name": function_name,
                                    "arguments": json.dumps(args)
                                }
                            }
                        ]
                    })

                    messages.extend(function_results)

                    # Second pass: generate final response with function results
                    try:
                        final_response = groq_client.chat.completions.create(
                            model=MODEL,
                            messages=messages,
                            temperature=TEMPERATURE,
                            max_tokens=MAX_TOKENS,
                            stream=stream
                        )
                    except Exception as e:
                        err_text = str(e)
                        if "rate limit" in err_text.lower() or "rate_limit_exceeded" in err_text.lower():
                            from datetime import timedelta
                            self.rate_limit_until = datetime.utcnow() + timedelta(minutes=60)
                            msg = "The LLM hit a rate limit during response generation. Please retry in a few minutes."
                            self.memory.add_message(session_id, "assistant", msg)
                            yield {"response": msg, "session_id": session_id}
                            return
                        else:
                            raise

                    if stream:
                        async for chunk in self._stream_response(final_response, session_id):
                            yield chunk
                    else:
                        final_text = final_response.choices[0].message.content
                        self.memory.add_message(session_id, "assistant", final_text)
                        yield {"response": final_text, "session_id": session_id}
                    return

            # Check for function calls
            if assistant_message.tool_calls:
                # Execute all function calls
                function_results = []
                
                for tool_call in assistant_message.tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    # Execute function
                    result = await self._execute_function(function_name, function_args)
                    
                    # Store entities in memory (only if result is a dict)
                    if isinstance(result, dict):
                        if function_name == "get_product_details" and not result.get("error"):
                            self.memory.store_entity(session_id, "product", result)
                    elif isinstance(result, list) and function_name == "search_products":
                        if result and not (len(result) == 1 and result[0].get("error")):
                            self.memory.store_entity(session_id, "products", result)
                    
                    function_results.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": json.dumps(result, cls=DateTimeEncoder)
                    })
                
                # Add function call and results to messages
                messages.append({
                    "role": "assistant",
                    "content": assistant_message.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments
                            }
                        }
                        for tc in assistant_message.tool_calls
                    ]
                })
                
                messages.extend(function_results)
                
                # Second pass: Generate final response with function results
                try:
                    final_response = groq_client.chat.completions.create(
                        model=MODEL,
                        messages=messages,
                        temperature=TEMPERATURE,
                        max_tokens=MAX_TOKENS,
                        stream=stream
                    )
                except Exception as e:
                    err_text = str(e)
                    if "rate limit" in err_text.lower() or "rate_limit_exceeded" in err_text.lower():
                        from datetime import timedelta
                        self.rate_limit_until = datetime.utcnow() + timedelta(minutes=60)
                        msg = "The LLM hit a rate limit during response generation. Please retry in a few minutes."
                        self.memory.add_message(session_id, "assistant", msg)
                        yield {"response": msg, "session_id": session_id}
                        return
                    else:
                        raise
                
                if stream:
                    # Stream response
                    async for chunk in self._stream_response(final_response, session_id):
                        yield chunk
                else:
                    # Complete response
                    final_text = final_response.choices[0].message.content
                    self.memory.add_message(session_id, "assistant", final_text)
                    yield {"response": final_text, "session_id": session_id}
            
            else:
                # No function calls, direct response
                response_text = assistant_message.content
                
                if stream:
                    # For streaming without function calls, make new streaming call
                    try:
                        stream_response = groq_client.chat.completions.create(
                            model=MODEL,
                            messages=messages,
                            temperature=TEMPERATURE,
                            max_tokens=MAX_TOKENS,
                            stream=True
                        )
                    except Exception as e:
                        err_text = str(e)
                        if "rate limit" in err_text.lower() or "rate_limit_exceeded" in err_text.lower():
                            from datetime import timedelta
                            self.rate_limit_until = datetime.utcnow() + timedelta(minutes=60)
                            msg = "The LLM is currently rate-limited. Please retry shortly."
                            self.memory.add_message(session_id, "assistant", msg)
                            yield {"response": msg, "session_id": session_id}
                            return
                        else:
                            raise
                    async for chunk in self._stream_response(stream_response, session_id):
                        yield chunk
                else:
                    self.memory.add_message(session_id, "assistant", response_text)
                    yield {"response": response_text, "session_id": session_id}
        
        except Exception as e:
            # Provide a friendly error message instead of raw error
            error_str = str(e)
            print(f"❌ EXCEPTION CAUGHT: {error_str}")  # Debug logging
            import traceback
            traceback.print_exc()  # Print full traceback for debugging
            
            # Check if it's a common error type and provide helpful message
            if "cannot access local variable" in error_str or "NameError" in error_str:
                error_message = "I apologize, I encountered a technical issue processing your request. Could you please rephrase your question or try asking something else?"
            elif "rate limit" in error_str.lower():
                error_message = "I'm currently experiencing high demand. Please try again in a few moments."
            else:
                error_message = "I'm sorry, I couldn't process that request. I specialize in helping with product information, pricing trends, and forecasts for wireless headphones. How can I assist you with that?"
            
            self.memory.add_message(session_id, "assistant", error_message)
            
            if stream:
                yield f"data: {json.dumps({'error': error_message})}\n\n"
            else:
                yield {"response": error_message, "session_id": session_id}
    
    async def _execute_function(self, function_name: str, args: Dict) -> Dict:
        """Execute a tool function"""
        try:
            # Normalize alternate function names / aliases
            aliases_price_trend = {"analyze_price_trend", "price_trend", "analyze_trend"}
            if function_name in aliases_price_trend:
                function_name = "get_price_trends"

            # Normalize argument keys (e.g., ASIN -> asin)
            normalized_args = {}
            for k, v in args.items():
                key_lower = k.lower()
                if key_lower == "asin" or key_lower == "a_s_i_n" or key_lower == "a":
                    normalized_args["asin"] = v
                else:
                    normalized_args[key_lower] = v
            args = normalized_args

            # Coerce days to int if present
            if "days" in args:
                try:
                    args["days"] = int(args["days"]) if args["days"] is not None else 30
                except Exception:
                    args["days"] = 30
            
            # Coerce limit to int if present (for get_top_rated_products, etc.)
            if "limit" in args:
                try:
                    args["limit"] = int(args["limit"]) if args["limit"] is not None else 5
                except Exception:
                    args["limit"] = 5
            
            # Coerce days to int if present (for get_price_trends, get_forecast, etc.)
            if "days" in args:
                try:
                    args["days"] = int(args["days"]) if args["days"] is not None else 30
                except Exception:
                    args["days"] = 30

            if function_name == "search_products":
                return tools.search_products(**args)
            elif function_name == "get_product_details":
                return tools.get_product_details(**args)
            elif function_name == "get_price_trends":
                return tools.get_price_trends(**args)
            elif function_name == "get_forecast":
                return await tools.get_forecast(**args)
            elif function_name == "trigger_scraper":
                return await tools.trigger_scraper(**args)
            elif function_name == "get_pricing_recommendation":
                return tools.get_pricing_recommendation(**args)
            elif function_name == "get_top_rated_products":
                return tools.get_top_rated_products(**args)
            elif function_name == "get_latest_price":
                return tools.get_latest_price(**args)
            elif function_name == "check_scraper_status":
                return tools.check_scraper_status(**args)
            else:
                return {"error": f"Unknown function: {function_name}"}
        except Exception as e:
            return {"error": f"Function execution error: {str(e)}"}
    
    async def _stream_response(self, stream_response, session_id: str):
        """Stream response chunks"""
        full_text = ""
        
        for chunk in stream_response:
            if chunk.choices[0].delta.content:
                text = chunk.choices[0].delta.content
                full_text += text
                yield f"data: {json.dumps({'text': text})}\n\n"
        
        # Save complete message to memory
        self.memory.add_message(session_id, "assistant", full_text)
        yield f"data: {json.dumps({'done': True})}\n\n"
    
    def clear_session(self, session_id: str):
        """Clear conversation history for session"""
        self.memory.clear_session(session_id)
    
    def get_history(self, session_id: str) -> List[Dict]:
        """Get conversation history"""
        return self.memory.get_history(session_id)
