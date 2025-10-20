(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory((function webpackLoadOptionalExternalModule() { try { return require("pdfjsLib"); } catch(e) {} }()));
	else if(typeof define === 'function' && define.amd)
		define(["pdfjsLib"], factory);
	else if(typeof exports === 'object')
		exports["WarpMind"] = factory((function webpackLoadOptionalExternalModule() { try { return require("pdfjsLib"); } catch(e) {} }()));
	else
		root["WarpMind"] = factory(root["pdfjsLib"]);
})(this, (__WEBPACK_EXTERNAL_MODULE__192__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 48:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * WarpMind - A simple library for easy use of OpenAI-compatible APIs for students
 * Designed to work with school proxy servers using custom authentication keys
 */

// Import utility functions for better modularity
let addJitter, calculateRetryDelay, shouldRetry, createTimeoutController, sleep, delayForRetry, fileToBase64;

// Import base client and TimeoutError
const { BaseClient, TimeoutError } = __webpack_require__(969);

// Import SSE parser for streaming functionality
const { parseSSE, createParser } = __webpack_require__(728);

// Import audio module factory
let createAudioModule;

// Import vision module factory  
let createVisionModule;

// Import data processing module factory
let createDataProcessingModule;

// Import PDF loader module factory
let createPdfLoaderModule;

// Import memory module factory
let createMemoryModule;

// Import tool call tracker
let ToolCallTracker;

if ( true && module.exports) {
  // Node.js environment
  const utils = __webpack_require__(94);
  ({ 
    addJitter, 
    calculateRetryDelay, 
    shouldRetry, 
    createTimeoutController, 
    sleep, 
    delayForRetry,
    fileToBase64
  } = utils);
  
  // Import audio module in Node.js
  createAudioModule = __webpack_require__(604);
  
  // Import vision module in Node.js
  createVisionModule = __webpack_require__(828);
  
  // Import data processing module in Node.js
  createDataProcessingModule = __webpack_require__(186);
  
  // Import memory module in Node.js
  createMemoryModule = __webpack_require__(291);
  
  // Import tool call tracker in Node.js
  ToolCallTracker = __webpack_require__(450);
  
  // Import PDF loader module in Node.js
  createPdfLoaderModule = __webpack_require__(902);
} else {
  // Browser environment - webpack should bundle util.js
  try {
    const utils = __webpack_require__(94);
    ({ 
      addJitter, 
      calculateRetryDelay, 
      shouldRetry, 
      createTimeoutController, 
      sleep, 
      delayForRetry,
      fileToBase64
    } = utils);
    
    // Import audio module in browser
    createAudioModule = __webpack_require__(604);
    
    // Import vision module in browser
    createVisionModule = __webpack_require__(828);
    
    // Import data processing module in browser
    createDataProcessingModule = __webpack_require__(186);
    
    // Import memory module in browser
    createMemoryModule = __webpack_require__(291);
    
    // Import PDF loader module in browser
    createPdfLoaderModule = __webpack_require__(902);
    
    // Import tool call tracker in browser
    ToolCallTracker = __webpack_require__(450);
  } catch (error) {
    throw new Error('Utility functions are required. Please ensure util.js is bundled with your application.');
  }
}

class WarpMind extends BaseClient {
  constructor(config = {}) {
    // Handle API key auto-prompting in browser environment
    if (!config.apiKey && typeof window !== 'undefined') {
      // Check localStorage first
      const savedApiKey = localStorage.getItem('warpmind-api-key');
      if (savedApiKey) {
        config.apiKey = savedApiKey;
      } else {
        // Prompt user for API key
        const apiKey = prompt('WarpMind API Key Required\n\nPlease enter your API key to continue:');
        if (apiKey && apiKey.trim()) {
          config.apiKey = apiKey.trim();
          // Save to localStorage for future use
          localStorage.setItem('warpmind-api-key', config.apiKey);
        } else {
          throw new Error('API key is required to use WarpMind');
        }
      }
    }
    
    super(config); // Call BaseClient constructor
    
    // Initialize tool registry
    this._tools = [];
    
    // Initialize tool call tracker
    this._toolCallTracker = new ToolCallTracker();
    
    // Memory tool configuration
    this._memoryToolConfig = {
      enabled: config.memoryToolEnabled !== false, // Default to true if memory module is present
      explicitOnly: config.memoryToolExplicitOnly !== false, // Default to true
      maxResults: config.memoryToolMaxResults || 5
    };
    
    // Bind the parseSSE function to this instance for backward compatibility
    this.parseSSE = parseSSE.bind(this);
    
    // Integrate audio module methods
    const audioMethods = createAudioModule(this);
    Object.assign(this, audioMethods);
    
    // Integrate vision module methods
    const visionMethods = createVisionModule(this);
    Object.assign(this, visionMethods);
    
    // Integrate data processing module methods
    const dataProcessingMethods = createDataProcessingModule(this);
    Object.assign(this, dataProcessingMethods);
    
    // Integrate PDF loader module methods
    const pdfLoaderMethods = createPdfLoaderModule(this);
    Object.assign(this, pdfLoaderMethods);
    
    // Integrate memory module methods
    const memoryMethods = createMemoryModule(this);
    Object.assign(this, memoryMethods);
  }

  /**
   * Update the API key and save it to localStorage (browser only)
   * @param {string} apiKey - The new API key
   */
  setApiKey(apiKey) {
    super.setApiKey(apiKey); // Call parent method
    if (typeof window !== 'undefined') {
      localStorage.setItem('warpmind-api-key', apiKey);
    }
  }

  /**
   * Clear the saved API key from localStorage (browser only)
   * @static
   */
  static clearSavedApiKey() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('warpmind-api-key');
    }
  }

  /**
   * Get the saved API key from localStorage (browser only)
   * @static
   * @returns {string|null} - The saved API key or null if not found
   */
  static getSavedApiKey() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('warpmind-api-key');
    }
    return null;
  }

  /**
   * Prompt user for a new API key and save it (browser only)
   * @static
   * @returns {string|null} - The new API key or null if cancelled
   */
  static promptForApiKey() {
    if (typeof window !== 'undefined') {
      const apiKey = prompt('WarpMind API Key Required\n\nPlease enter your API key:');
      if (apiKey && apiKey.trim()) {
        const trimmedKey = apiKey.trim();
        localStorage.setItem('warpmind-api-key', trimmedKey);
        return trimmedKey;
      }
    }
    return null;
  }

  /**
   * Generate a chat completion
   * @param {string|Array} messages - Single message string or array of message objects
   * @param {Object} options - Optional parameters
   * @param {number} options.timeoutMs - Request timeout in milliseconds
   * @returns {Promise<string>} - The generated response
   */
  async chat(messages, options = {}) {
    // Convert string message to proper format
    if (typeof messages === 'string') {
      messages = [{ role: 'user', content: messages }];
    }

    // Support tool calling with depth limit
    return await this._chatWithTools(messages, options, 0);
  }

  /**
   * Internal chat method that handles tool calling with depth limit
   * @private
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Chat options
   * @param {number} depth - Current recursion depth
   * @returns {Promise<string>} - The final response
   */
  async _chatWithTools(messages, options = {}, depth = 0) {
    const MAX_TOOL_CALL_DEPTH = 2;
    
    // Track tool calls for metadata if requested
    const toolCallsMetadata = [];
    const startTime = performance.now();
    
    const requestData = {
      model: options.model || this.model,
      messages: messages,
      temperature: options.temperature !== undefined ? options.temperature : this.temperature
    };

    // Include tools if registered and not at max depth
    if (this._tools.length > 0 && depth < MAX_TOOL_CALL_DEPTH) {
      requestData.tools = this._tools.map(t => t.schema);
      requestData.tool_choice = 'auto'; // Let the model decide when to use tools
    }

    // Add other options, but filter out our custom ones to avoid conflicts
    const filteredOptions = { ...options };
    delete filteredOptions.model;
    delete filteredOptions.temperature;
    delete filteredOptions.timeoutMs;
    delete filteredOptions.onToolCall;
    delete filteredOptions.onToolResult;
    delete filteredOptions.onToolError;
    delete filteredOptions.returnMetadata;
    
    Object.assign(requestData, filteredOptions);

    const requestOptions = {
      timeoutMs: options.timeoutMs
    };

    const response = await this.makeRequest('/chat/completions', requestData, requestOptions);
    const message = response.choices[0]?.message;
    
    if (!message) {
      throw new Error('No message in response');
    }

    // Check if the assistant wants to call tools
    if (message.tool_calls && message.tool_calls.length > 0 && depth < MAX_TOOL_CALL_DEPTH) {
      // Add the assistant's message to the conversation
      const newMessages = [...messages, {
        role: 'assistant',
        content: message.content,
        tool_calls: message.tool_calls
      }];

      // Execute each tool call
      for (const toolCall of message.tool_calls) {
        let toolCallMetadata = null;
        
        try {
          const result = await this._executeTool(toolCall, {
            onToolCall: (callData) => {
              // Store metadata for returnMetadata option
              if (options.returnMetadata) {
                toolCallMetadata = {
                  id: callData.callId,
                  name: callData.name,
                  parameters: callData.parameters,
                  timestamp: callData.timestamp
                };
              }
              // Call user callback
              if (options.onToolCall) {
                options.onToolCall(callData);
              }
            },
            onToolResult: (resultData) => {
              // Update metadata for returnMetadata option
              if (options.returnMetadata && toolCallMetadata) {
                toolCallMetadata.result = resultData.result;
                toolCallMetadata.duration = resultData.duration;
                toolCallMetadata.success = true;
                toolCallsMetadata.push(toolCallMetadata);
              }
              // Call user callback
              if (options.onToolResult) {
                options.onToolResult(resultData);
              }
            },
            onToolError: (errorData) => {
              // Update metadata for returnMetadata option
              if (options.returnMetadata && toolCallMetadata) {
                toolCallMetadata.error = errorData.error;
                toolCallMetadata.duration = errorData.duration;
                toolCallMetadata.success = false;
                toolCallsMetadata.push(toolCallMetadata);
              }
              // Call user callback
              if (options.onToolError) {
                options.onToolError(errorData);
              }
            }
          });
          
          // Add tool result to messages
          newMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        } catch (error) {
          // Add error result to messages
          newMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: error.message })
          });
        }
      }

      // Recursively call chat to let the model respond to tool results
      const recursiveResult = await this._chatWithTools(newMessages, options, depth + 1);
      
      // If returnMetadata is requested and this is the top-level call, wrap the result
      if (options.returnMetadata && depth === 0) {
        const totalDuration = Math.round(performance.now() - startTime);
        return {
          response: recursiveResult,
          metadata: {
            toolCalls: toolCallsMetadata,
            totalDuration,
            tokensUsed: response.usage?.total_tokens || null
          }
        };
      }
      
      return recursiveResult;
    }

    // No tool calls or max depth reached, return the content
    const finalResponse = message.content || '';
    
    // If returnMetadata is requested and this is the top-level call, wrap the result
    if (options.returnMetadata && depth === 0) {
      const totalDuration = Math.round(performance.now() - startTime);
      return {
        response: finalResponse,
        metadata: {
          toolCalls: toolCallsMetadata,
          totalDuration,
          tokensUsed: response.usage?.total_tokens || null
        }
      };
    }
    
    return finalResponse;
  }

  /**
   * Generate a simple completion
   * @param {string} prompt - The prompt text
   * @param {Object} options - Optional parameters
   * @param {number} options.timeoutMs - Request timeout in milliseconds
   * @returns {Promise<string>} - The generated response
   */
  async complete(prompt, options = {}) {
    const requestData = {
      model: options.model || this.model,
      prompt: prompt,
      temperature: options.temperature !== undefined ? options.temperature : this.temperature
    };

    // Add other options, but filter out our custom ones to avoid conflicts
    const filteredOptions = { ...options };
    delete filteredOptions.model;
    delete filteredOptions.temperature;
    delete filteredOptions.timeoutMs;
    
    Object.assign(requestData, filteredOptions);

    const requestOptions = {
      timeoutMs: options.timeoutMs
    };

    const response = await this.makeRequest('/completions', requestData, requestOptions);
    return response.choices[0]?.text || '';
  }

  /**
   * Ask a simple question and get a response
   * @param {string} question - The question to ask
   * @param {Object} options - Optional parameters
   * @param {number} options.timeoutMs - Request timeout in milliseconds
   * @returns {Promise<string>} - The AI response
   */
  async ask(question, options = {}) {
    return await this.chat(question, options);
  }

  /**
   * Stream chat completion (for real-time responses)
   * @param {string|Array} messages - Single message string or array of message objects
   * @param {Function} onChunk - Callback function for each chunk - receives { type: "chunk", content: string }
   * @param {Object} options - Optional parameters
   * @param {number} options.timeoutMs - Request timeout in milliseconds
   * @returns {Promise<string>} - The complete generated response
   */
  async streamChat(messages, onChunk, options = {}) {
    if (typeof messages === 'string') {
      messages = [{ role: 'user', content: messages }];
    }

    // Support tool calling with depth limit
    return await this._streamChatWithTools(messages, onChunk, options, 0);
  }

  /**
   * Internal streaming chat method that handles tool calling with depth limit
   * @private
   * @param {Array} messages - Array of message objects
   * @param {Function} onChunk - Callback function for each chunk
   * @param {Object} options - Chat options
   * @param {number} depth - Current recursion depth
   * @returns {Promise<string>} - The final response
   */
  async _streamChatWithTools(messages, onChunk, options = {}, depth = 0) {
    const MAX_TOOL_CALL_DEPTH = 2;
    
    const requestData = {
      model: options.model || this.model,
      messages: messages,
      temperature: options.temperature !== undefined ? options.temperature : this.temperature,
      stream: true
    };

    // Include tools if registered and not at max depth
    if (this._tools.length > 0 && depth < MAX_TOOL_CALL_DEPTH) {
      requestData.tools = this._tools.map(t => t.schema);
      requestData.tool_choice = 'auto'; // Let the model decide when to use tools
    }

    // Add other options, but filter out our custom ones to avoid conflicts
    const filteredOptions = { ...options };
    delete filteredOptions.model;
    delete filteredOptions.temperature;
    delete filteredOptions.stream;
    delete filteredOptions.timeoutMs;
    delete filteredOptions.onToolCall;
    delete filteredOptions.onToolResult;
    delete filteredOptions.onToolError;
    
    Object.assign(requestData, filteredOptions);

    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const { controller, timeoutId } = createTimeoutController(timeoutMs);
    
    // Internal accumulator for full response
    let fullResponse = '';
    let currentMessage = { role: 'assistant', content: '', tool_calls: [] };
    let hasToolCalls = false;
    
    try {
      const response = await fetch(this._buildApiUrl('/chat/completions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      // Don't clear timeout yet - we need it for the streaming phase too

      if (!response.ok) {
        clearTimeout(timeoutId);
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
      }

      const reader = response.body.getReader();
      
      // Use the new SSE parser with enhanced event callback
      await this.parseSSE(reader, (event) => {
        // Handle different types of streaming events
        if (event.delta !== undefined && event.delta !== null) { // Check for both undefined and null
          const deltaContent = event.delta || ''; // Ensure it's a string
          fullResponse += deltaContent;
          currentMessage.content += deltaContent;
          
          // Emit chunk in the new enhanced format immediately to callback
          if (onChunk) {
            onChunk({
              type: "chunk",
              content: deltaContent
            });
          }
        }
        
        // Handle tool calls delta - merge into existing tool calls
        if (event.tool_calls) {
          hasToolCalls = true;
          if (!currentMessage.tool_calls) {
            currentMessage.tool_calls = [];
          }
          
          // Merge tool call deltas properly
          for (const delta of event.tool_calls) {
            const index = delta.index !== undefined ? delta.index : 0; // Default to 0 if no index
            
            // Initialize tool call at this index if it doesn't exist
            if (!currentMessage.tool_calls[index]) {
              currentMessage.tool_calls[index] = {
                id: '',
                type: 'function',
                function: {
                  name: '',
                  arguments: ''
                }
              };
            }
            
            const toolCall = currentMessage.tool_calls[index];
            
            // Merge the delta
            if (delta.id) {
              toolCall.id = delta.id;
            }
            if (delta.type) {
              toolCall.type = delta.type;
            }
            if (delta.function) {
              if (delta.function.name) {
                toolCall.function.name += delta.function.name;
              }
              if (delta.function.arguments) {
                toolCall.function.arguments += delta.function.arguments;
              }
            }
          }
        }
      });

      // Clear timeout only after streaming completes
      clearTimeout(timeoutId);
      
      // Check if we need to handle tool calls
      if (hasToolCalls && currentMessage.tool_calls && currentMessage.tool_calls.length > 0 && depth < MAX_TOOL_CALL_DEPTH) {
        // Filter out incomplete tool calls and validate
        const validToolCalls = currentMessage.tool_calls.filter(toolCall => {
          return toolCall && 
                 toolCall.id && 
                 toolCall.function && 
                 toolCall.function.name &&
                 toolCall.function.arguments !== undefined;
        });
        
        if (validToolCalls.length === 0) {
          // No valid tool calls, return current response
          return fullResponse;
        }
        
        // Update the message with only valid tool calls
        currentMessage.tool_calls = validToolCalls;
        // Note: Messages with tool_calls should not be shown in UI
        
        // Add the assistant's message to the conversation
        const newMessages = [...messages, currentMessage];

        // Execute each valid tool call
        for (const toolCall of validToolCalls) {
          try {
            const result = await this._executeTool(toolCall, {
              onToolCall: options.onToolCall,
              onToolResult: options.onToolResult,
              onToolError: options.onToolError
            });
            
            // Add tool result to messages (these should not be shown in UI)
            newMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (error) {
            // Add error result to messages (these should not be shown in UI)
            newMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: error.message })
            });
          }
        }

        // Make a final call with tool_choice: "none" to get the user-facing response
        const finalOptions = {
          ...options,
          tool_choice: 'none' // Force final response without more tool calls
        };
        
        // Remove tools from final options to ensure no more tool calls
        delete finalOptions.tools;
        
        // Recursively call to get final response
        const toolResponse = await this._streamChatWithTools(newMessages, onChunk, finalOptions, depth + 1);
        return fullResponse + toolResponse;
      }
      
      // Return the accumulated full response
      return fullResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new TimeoutError(`Request timed out after ${timeoutMs}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Register a tool that the AI can call during conversations
   * @param {Object} tool - Tool definition
   * @param {string} tool.name - Tool name (must be unique)
   * @param {string} tool.description - Description of what the tool does
   * @param {Object} tool.parameters - JSON schema for tool parameters
   * @param {Function} tool.handler - Async function to execute when tool is called
   */
  registerTool(tool) {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool name must be a non-empty string');
    }
    
    if (!tool.description || typeof tool.description !== 'string') {
      throw new Error('Tool description must be a non-empty string');
    }
    
    if (!tool.parameters || typeof tool.parameters !== 'object') {
      throw new Error('Tool parameters must be an object (JSON schema)');
    }
    
    if (!tool.handler || typeof tool.handler !== 'function') {
      throw new Error('Tool handler must be a function');
    }
    
    // Check for duplicate tool names
    if (this._tools.find(t => t.schema.function.name === tool.name)) {
      throw new Error(`Tool with name '${tool.name}' is already registered`);
    }
    
    // Create the tool schema for OpenAI API
    const schema = {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    };
    
    // Store both schema and handler
    this._tools.push({ schema, handler: tool.handler });
  }

  /**
   * Unregister a tool by name
   * @param {string} toolName - Name of the tool to unregister
   * @returns {boolean} - True if tool was found and removed, false otherwise
   */
  unregisterTool(toolName) {
    if (!toolName || typeof toolName !== 'string') {
      throw new Error('Tool name must be a non-empty string');
    }

    const toolIndex = this._tools.findIndex(t => t.schema.function.name === toolName);
    if (toolIndex !== -1) {
      this._tools.splice(toolIndex, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if a tool is registered
   * @param {string} toolName - Name of the tool to check
   * @returns {boolean} - True if tool is registered, false otherwise
   */
  isToolRegistered(toolName) {
    if (!toolName || typeof toolName !== 'string') {
      return false;
    }
    return this._tools.some(t => t.schema.function.name === toolName);
  }

  /**
   * Get array of all registered tool names
   * @returns {Array<string>} - Array of tool names
   */
  getRegisteredTools() {
    return this._tools.map(t => t.schema.function.name);
  }

  /**
   * Clear all registered tools
   */
  clearAllTools() {
    this._tools = [];
  }

  /**
   * Execute a tool call
   * @private
   * @param {Object} toolCall - Tool call from OpenAI response
   * @returns {Promise<any>} - Result from tool execution
   */
  async _executeTool(toolCall, callbacks = {}) {
    const tool = this._tools.find(t => t.schema.function.name === toolCall.function.name);
    
    if (!tool) {
      throw new Error(`Tool '${toolCall.function.name}' not found`);
    }
    
    let trackedCall = null;
    
    try {
      // Parse the arguments from JSON
      const args = JSON.parse(toolCall.function.arguments);
      
      // Start tracking the tool call
      trackedCall = this._toolCallTracker.startCall(toolCall.function.name, args);
      
      // Call onToolCall callback if provided
      this._safeCallCallback(callbacks.onToolCall, {
        callId: trackedCall.callId,
        name: trackedCall.name,
        parameters: trackedCall.parameters,
        timestamp: trackedCall.timestamp
      });
      
      // Execute the tool handler
      const result = await tool.handler(args);
      
      // Complete the tracked call
      const completedCall = this._toolCallTracker.completeCall(trackedCall.callId, result);
      
      // Call onToolResult callback if provided
      this._safeCallCallback(callbacks.onToolResult, {
        callId: completedCall.callId,
        name: completedCall.name,
        result: completedCall.result,
        duration: completedCall.duration,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      // Mark call as failed if it was started
      if (trackedCall) {
        const errorCall = this._toolCallTracker.errorCall(trackedCall.callId, error);
        
        // Call onToolError callback if provided
        this._safeCallCallback(callbacks.onToolError, {
          callId: errorCall.callId,
          name: errorCall.name,
          error: errorCall.error,
          duration: errorCall.duration,
          timestamp: new Date().toISOString()
        });
      }
      
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }

  /**
   * Safely execute a callback function, catching any errors to prevent disruption
   * @private
   * @param {Function} callback - The callback function to execute
   * @param {*} data - Data to pass to the callback
   */
  _safeCallCallback(callback, data) {
    if (typeof callback === 'function') {
      try {
        callback(data);
      } catch (error) {
        console.warn('Error in tool call callback:', error);
      }
    }
  }

  /**
   * Generate embeddings for text using the embeddings API
   * @param {string} text - The text to generate embeddings for
   * @param {Object} options - Optional parameters
   * @param {string} options.model - The embedding model to use (default: 'text-embedding-3-small')
   * @param {number} options.timeoutMs - Request timeout in milliseconds
   * @returns {Promise<number[]>} - The embedding vector as an array of numbers
   */
  async embed(text, options = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text input is required and must be a string');
    }

    const requestData = {
      model: options.model || 'text-embedding-3-small',
      input: text
    };

    // Add other options, but filter out our custom ones to avoid conflicts
    const filteredOptions = { ...options };
    delete filteredOptions.model;
    delete filteredOptions.timeoutMs;
    
    Object.assign(requestData, filteredOptions);

    const requestOptions = {
      timeoutMs: options.timeoutMs
    };

    try {
      const response = await this.makeRequest('/embeddings', requestData, requestOptions);
      
      if (!response.data || !response.data[0] || !response.data[0].embedding) {
        throw new Error('Invalid embedding response format');
      }

      return response.data[0].embedding;
    } catch (error) {
      // Re-throw with more context if it's an API error
      if (error.message.includes('API request failed')) {
        throw new Error(`Embedding generation failed: ${error.message}`);
      }
      throw error;
    }
  }
}

// Export for both CommonJS and ES modules
if ( true && module.exports) {
  module.exports = WarpMind;
  module.exports.TimeoutError = TimeoutError;
  // Also export utility functions for testing purposes
  module.exports.utils = {
    addJitter,
    calculateRetryDelay,
    shouldRetry,
    createTimeoutController,
    sleep,
    delayForRetry
  };
} else if (typeof window !== 'undefined') {
  window.WarpMind = WarpMind;
  window.TimeoutError = TimeoutError;
  // Also expose utilities for testing in browser
  window.WarpMindUtils = {
    addJitter,
    calculateRetryDelay,
    shouldRetry,
    createTimeoutController,
    sleep,
    delayForRetry
  };
}

// Also attach TimeoutError to WarpMind class for webpack UMD compatibility
WarpMind.TimeoutError = TimeoutError;

/***/ }),

/***/ 94:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * Utility functions for WarpMind library
 * These are helper functions that support retry logic, timeouts, and other common operations
 */

/**
 * Adds jitter to delay calculation for exponential back-off
 * This prevents the "thundering herd" problem when many clients retry at the same time
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} - Delay with added random jitter (0-250ms)
 */
function addJitter(baseDelay) {
  const jitter = Math.random() * 250; // 0-250ms jitter
  return baseDelay + jitter;
}

/**
 * Calculates delay for exponential back-off with optional retry-after header
 * Uses exponential backoff: 500ms × 2^attempt (with jitter)
 * @param {number} attempt - Current attempt number (0-based)
 * @param {string} retryAfter - Optional Retry-After header value in seconds
 * @returns {number} - Delay in milliseconds
 */
function calculateRetryDelay(attempt, retryAfter) {
  if (retryAfter) {
    const retryDelayMs = parseInt(retryAfter) * 1000; // Convert seconds to milliseconds
    return addJitter(retryDelayMs);
  }
  
  const baseDelay = 500 * Math.pow(2, attempt); // 500ms × 2^attempt
  return addJitter(baseDelay);
}

/**
 * Checks if an HTTP status code should trigger a retry
 * Retries on rate limiting and server errors that might be temporary
 * @param {number} status - HTTP status code
 * @returns {boolean} - Whether to retry the request
 */
function shouldRetry(status) {
  return [429, 502, 503, 524].includes(status);
}

/**
 * Creates an AbortController with automatic timeout
 * Useful for canceling requests that take too long
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Object} - Object with controller and timeout ID {controller, timeoutId}
 */
function createTimeoutController(timeoutMs) {
  if (typeof AbortController === 'undefined') {
    // Return a fallback when AbortController is not available
    return {
      controller: null,
      timeoutId: setTimeout(() => {}, timeoutMs)
    };
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  return { controller, timeoutId };
}

/**
 * Waits for a specified amount of time (async sleep)
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} - Promise that resolves after the delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a delay promise that can be used in retry logic
 * @param {number} attempt - Current attempt number (0-based)
 * @param {string} retryAfter - Optional Retry-After header value
 * @returns {Promise} - Promise that resolves after the calculated delay
 */
function delayForRetry(attempt, retryAfter) {
  const delay = calculateRetryDelay(attempt, retryAfter);
  return sleep(delay);
}

/**
 * Converts a File or Blob to base64 data URL
 * @param {File|Blob} file - File or Blob to convert
 * @returns {Promise<string>} - Base64 data URL
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('File is required'));
      return;
    }
    
    // Check if FileReader is available (browser environment)
    if (typeof FileReader !== 'undefined') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    } else {
      // Node.js environment - use fs module
      try {
        const fs = __webpack_require__(603);
        const path = __webpack_require__(247);
        
        const data = fs.readFileSync(file.path || file);
        const mimeType = file.type || 'application/octet-stream';
        const base64 = data.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;
        resolve(dataUrl);
      } catch (error) {
        reject(new Error(`Failed to read file: ${error.message}`));
      }
    }
  });
}

// Export for both CommonJS and ES modules
if ( true && module.exports) {
  module.exports = {
    addJitter,
    calculateRetryDelay,
    shouldRetry,
    createTimeoutController,
    sleep,
    delayForRetry,
    fileToBase64
  };
} else if (typeof window !== 'undefined') {
  // Browser environment - attach to window for global access
  window.WarpMindUtils = {
    addJitter,
    calculateRetryDelay,
    shouldRetry,
    createTimeoutController,
    sleep,
    delayForRetry,
    fileToBase64
  };
}


/***/ }),

/***/ 119:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
function createParser(onParse) {
  let isFirstChunk;
  let buffer;
  let startingPosition;
  let startingFieldLength;
  let eventId;
  let eventName;
  let data;
  reset();
  return {
    feed,
    reset
  };
  function reset() {
    isFirstChunk = true;
    buffer = "";
    startingPosition = 0;
    startingFieldLength = -1;
    eventId = void 0;
    eventName = void 0;
    data = "";
  }
  function feed(chunk) {
    buffer = buffer ? buffer + chunk : chunk;
    if (isFirstChunk && hasBom(buffer)) {
      buffer = buffer.slice(BOM.length);
    }
    isFirstChunk = false;
    const length = buffer.length;
    let position = 0;
    let discardTrailingNewline = false;
    while (position < length) {
      if (discardTrailingNewline) {
        if (buffer[position] === "\n") {
          ++position;
        }
        discardTrailingNewline = false;
      }
      let lineLength = -1;
      let fieldLength = startingFieldLength;
      let character;
      for (let index = startingPosition; lineLength < 0 && index < length; ++index) {
        character = buffer[index];
        if (character === ":" && fieldLength < 0) {
          fieldLength = index - position;
        } else if (character === "\r") {
          discardTrailingNewline = true;
          lineLength = index - position;
        } else if (character === "\n") {
          lineLength = index - position;
        }
      }
      if (lineLength < 0) {
        startingPosition = length - position;
        startingFieldLength = fieldLength;
        break;
      } else {
        startingPosition = 0;
        startingFieldLength = -1;
      }
      parseEventStreamLine(buffer, position, fieldLength, lineLength);
      position += lineLength + 1;
    }
    if (position === length) {
      buffer = "";
    } else if (position > 0) {
      buffer = buffer.slice(position);
    }
  }
  function parseEventStreamLine(lineBuffer, index, fieldLength, lineLength) {
    if (lineLength === 0) {
      if (data.length > 0) {
        onParse({
          type: "event",
          id: eventId,
          event: eventName || void 0,
          data: data.slice(0, -1)
          // remove trailing newline
        });

        data = "";
        eventId = void 0;
      }
      eventName = void 0;
      return;
    }
    const noValue = fieldLength < 0;
    const field = lineBuffer.slice(index, index + (noValue ? lineLength : fieldLength));
    let step = 0;
    if (noValue) {
      step = lineLength;
    } else if (lineBuffer[index + fieldLength + 1] === " ") {
      step = fieldLength + 2;
    } else {
      step = fieldLength + 1;
    }
    const position = index + step;
    const valueLength = lineLength - step;
    const value = lineBuffer.slice(position, position + valueLength).toString();
    if (field === "data") {
      data += value ? "".concat(value, "\n") : "\n";
    } else if (field === "event") {
      eventName = value;
    } else if (field === "id" && !value.includes("\0")) {
      eventId = value;
    } else if (field === "retry") {
      const retry = parseInt(value, 10);
      if (!Number.isNaN(retry)) {
        onParse({
          type: "reconnect-interval",
          value: retry
        });
      }
    }
  }
}
const BOM = [239, 187, 191];
function hasBom(buffer) {
  return BOM.every((charCode, index) => buffer.charCodeAt(index) === charCode);
}
exports.createParser = createParser;
//# sourceMappingURL=index.cjs.map


/***/ }),

/***/ 186:
/***/ ((module) => {

/**
 * Data Processing module for WarpMind - Contains structured JSON processing operations
 * Handles data analysis, schema validation, and retry logic for structured responses
 */

/**
 * Data processing module factory function that accepts a client instance
 * @param {Object} client - The client instance (BaseClient or WarpMind)
 * @returns {Object} - Object with data processing methods to be mixed into the main class
 */
function createDataProcessingModule(client) {
  return {
    /**
     * Process data or questions with structured JSON output
     * @param {string} prompt - Instructions for what to process or analyze
     * @param {string|Object|Array} data - Optional data to process (text, object, or array)
     * @param {Object} schema - Object describing the expected JSON structure
     * @param {Object} options - Optional parameters
     * @param {number} options.retries - Number of retries for failed JSON parsing (default: 2)
     * @returns {Promise<Object>} - The AI response as a parsed JSON object
     */
    async process(prompt, data = null, schema = {}, options = {}) {
      const { retries = 2, ...restOptions } = options;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Build the full prompt
          let fullPrompt = prompt;
          
          // Add data if provided
          if (data !== null) {
            if (typeof data === 'string') {
              fullPrompt += "\n\nData to process:\n" + data;
            } else {
              fullPrompt += "\n\nData to process:\n" + JSON.stringify(data, null, 2);
            }
          }
          
          // Add schema instructions
          if (Object.keys(schema).length > 0) {
            fullPrompt += "\n\nPlease respond with a JSON object that has these fields:\n";
            for (const [key, description] of Object.entries(schema)) {
              fullPrompt += `- ${key}: ${description}\n`;
            }
            fullPrompt += "\nRespond only with valid JSON, no extra text.";
          } else {
            fullPrompt += "\n\nPlease respond with valid JSON only, no extra text.";
          }

          const response = await client.chat(fullPrompt, {
            ...restOptions,
            response_format: { type: "json_object" }
          });

          try {
            const result = JSON.parse(response);

            // Validate that the response contains all keys from the schema
            if (Object.keys(schema).length > 0) {
              for (const key of Object.keys(schema)) {
                if (!(key in result)) {
                  throw new Error(`AI response is missing the required field: '${key}'`);
                }
              }
            }
            
            return result; // Validation successful
          } catch (parseError) {
            // This will catch both JSON parsing errors and our schema validation errors.
            // We re-throw the error so the retry logic can catch it.
            throw new Error(`Response validation failed: ${parseError.message}. Raw response: ${response}`);
          }
        } catch (error) {
          // If the error came from client.chat (network/API error), re-throw it directly
          // If it came from parsing/validation, it will have the expected message format
          console.warn(`Process attempt ${attempt + 1} failed: ${error.message}`);
          if (attempt === retries) {
              console.error('All process attempts failed.');
              throw error; // All retries failed, re-throw the last error
          }
          // Optional: wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }
  };
}

// Export for both CommonJS and ES modules
if ( true && module.exports) {
  module.exports = createDataProcessingModule;
} else if (typeof window !== 'undefined') {
  window.createDataProcessingModule = createDataProcessingModule;
}


/***/ }),

/***/ 192:
/***/ ((module) => {

"use strict";
if(typeof __WEBPACK_EXTERNAL_MODULE__192__ === 'undefined') { var e = new Error("Cannot find module 'pdfjsLib'"); e.code = 'MODULE_NOT_FOUND'; throw e; }

module.exports = __WEBPACK_EXTERNAL_MODULE__192__;

/***/ }),

/***/ 247:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 291:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * Memory module for WarpMind - Contains all memory storage and retrieval operations
 * Includes semantic search using embeddings and fallback keyword search
 */

// Import required utilities
let createTimeoutController, TimeoutError;

if ( true && module.exports) {
  // Node.js environment
  const { createTimeoutController: ctc } = __webpack_require__(94);
  const { TimeoutError: te } = __webpack_require__(969);
  createTimeoutController = ctc;
  TimeoutError = te;
} else {
  // Browser environment - utilities should be available globally
  createTimeoutController = window.createTimeoutController;
  TimeoutError = window.TimeoutError;
}

/**
 * Simple UUID v4 generator
 * @returns {string} - UUID string
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Storage wrapper for memory - uses IndexedDB (browser) or in-memory storage (Node.js)
 */
class MemoryStore {
  constructor() {
    this.dbName = 'warpMindMemory';
    this.dbVersion = 1;
    this.storeName = 'memories';
    this.db = null;
    
    // For Node.js environments - use in-memory storage
    this.isNode = typeof indexedDB === 'undefined';
    this.memoryData = new Map(); // In-memory storage for Node.js
  }

  /**
   * Initialize the storage (IndexedDB or in-memory)
   * @returns {Promise<void>}
   */
  async init() {
    if (this.isNode) {
      // Node.js environment - no initialization needed for in-memory storage
      return Promise.resolve();
    }

    // Browser environment - use IndexedDB
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create memories object store
        const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
        
        // Create indexes for efficient querying
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      };
    });
  }

  /**
   * Store a memory object
   * @param {Object} memory - The memory object to store
   * @returns {Promise<void>}
   */
  async store(memory) {
    if (this.isNode) {
      // Node.js - use in-memory storage
      this.memoryData.set(memory.id, memory);
      return Promise.resolve();
    }
    
    // Browser - use IndexedDB
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(memory);

      request.onerror = () => reject(new Error('Failed to store memory'));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Retrieve a memory by ID
   * @param {string} id - The memory ID
   * @returns {Promise<Object|null>} - The memory object or null if not found
   */
  async get(id) {
    if (this.isNode) {
      // Node.js - use in-memory storage
      return Promise.resolve(this.memoryData.get(id) || null);
    }
    
    // Browser - use IndexedDB
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onerror = () => reject(new Error('Failed to retrieve memory'));
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Delete a memory by ID
   * @param {string} id - The memory ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    if (this.isNode) {
      // Node.js - use in-memory storage
      this.memoryData.delete(id);
      return Promise.resolve();
    }
    
    // Browser - use IndexedDB
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onerror = () => reject(new Error('Failed to delete memory'));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get all memories with optional filtering
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} - Array of memory objects
   */
  async getAll(options = {}) {
    if (this.isNode) {
      // Node.js - use in-memory storage
      let memories = Array.from(this.memoryData.values());
      
      // Apply filters
      if (options.tags && options.tags.length > 0) {
        memories = memories.filter(memory => 
          memory.tags && memory.tags.some(tag => options.tags.includes(tag))
        );
      }
      
      if (options.after) {
        memories = memories.filter(memory => memory.timestamp > options.after);
      }
      
      if (options.before) {
        memories = memories.filter(memory => memory.timestamp < options.before);
      }
      
      return Promise.resolve(memories);
    }
    
    // Browser - use IndexedDB
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(new Error('Failed to retrieve memories'));
      request.onsuccess = () => {
        let memories = request.result || [];
        
        // Apply filters
        if (options.tags && options.tags.length > 0) {
          memories = memories.filter(memory => 
            memory.tags && memory.tags.some(tag => options.tags.includes(tag))
          );
        }
        
        if (options.after) {
          memories = memories.filter(memory => memory.timestamp > options.after);
        }
        
        if (options.before) {
          memories = memories.filter(memory => memory.timestamp < options.before);
        }
        
        // Sort by timestamp (newest first)
        memories.sort((a, b) => b.timestamp - a.timestamp);
        
        // Apply limit
        if (options.limit && options.limit > 0) {
          memories = memories.slice(0, options.limit);
        }
        
        resolve(memories);
      };
    });
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vectorA - First vector
 * @param {number[]} vectorB - Second vector
 * @returns {number} - Similarity score between 0 and 1
 */
function cosineSimilarity(vectorA, vectorB) {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Simple keyword search as fallback
 * @param {string} query - Search query
 * @param {Array} memories - Array of memory objects
 * @returns {Array} - Sorted array of memories with relevance scores
 */
function keywordSearch(query, memories) {
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  
  const scoredMemories = memories.map(memory => {
    const content = memory.content.toLowerCase();
    const tags = (memory.tags || []).map(tag => tag.toLowerCase()).join(' ');
    const searchableText = content + ' ' + tags;
    
    let score = 0;
    
    queryWords.forEach(word => {
      const wordCount = (searchableText.match(new RegExp(word, 'g')) || []).length;
      score += wordCount;
    });
    
    return { ...memory, relevanceScore: score };
  });
  
  return scoredMemories
    .filter(memory => memory.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Memory module factory function that accepts a client instance
 * @param {Object} client - The client instance (BaseClient or WarpMind)
 * @returns {Object} - Object with memory methods to be mixed into the main class
 */
function createMemoryModule(client) {
  const memoryStore = new MemoryStore();

  // Register the memory recall tool if the client supports tools and it's enabled
  if (client.registerTool && typeof client.registerTool === 'function' && 
      client._memoryToolConfig && client._memoryToolConfig.enabled) {
    
    const memoryTool = {
      name: "recall_memory",
      description: "Search for relevant memories when the user explicitly asks to remember or recall information. Only use this tool when the user specifically mentions remembering, recalling, or accessing stored information. Do not use for general knowledge questions or current conversation context.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find relevant memories"
          },
          limit: {
            type: "number",
            description: `Maximum number of memories to retrieve (default: ${client._memoryToolConfig.maxResults})`,
            default: client._memoryToolConfig.maxResults
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Optional tags to filter memories"
          }
        },
        required: ["query"]
      },
      handler: async (args) => {
        const { query, limit = client._memoryToolConfig.maxResults, tags } = args;
        
        try {
          const memories = await client.recall(query, { limit, tags });
          
          if (memories.length === 0) {
            return "No relevant memories found for the query.";
          }
          
          return memories.map(memory => ({
            content: memory.content,
            tags: memory.tags || [],
            timestamp: new Date(memory.timestamp).toLocaleString(),
            relevanceScore: memory.relevanceScore
          }));
        } catch (error) {
          return `Error accessing memories: ${error.message}`;
        }
      }
    };

    // Register the tool
    try {
      client.registerTool(memoryTool);
    } catch (error) {
      console.warn('Failed to register memory tool:', error.message);
    }
  }

  return {
    /**
     * Store a memory with optional tags
     * @param {string|Object} data - The data to remember (string or JSON object)
     * @param {Object} options - Optional parameters
     * @param {string[]} options.tags - Optional tags for categorization
     * @returns {Promise<string>} - The memory ID
     */
    async remember(data, options = {}) {
      if (!data) {
        throw new Error('Data is required to create a memory');
      }

      const id = generateUUID();
      const timestamp = Date.now();
      
      // Convert data to content string for embedding
      let content, rawData;
      if (typeof data === 'string') {
        content = data;
      } else {
        content = JSON.stringify(data);
        rawData = data;
      }

      const memory = {
        id,
        content,
        rawData,
        tags: options.tags || [],
        timestamp
      };

      // Try to generate embedding
      try {
        const embedding = await client.embed(content);
        memory.embedding = embedding;
      } catch (error) {
        console.warn('Failed to generate embedding for memory:', error.message);
        // Continue without embedding (will use keyword search as fallback)
      }

      await memoryStore.store(memory);
      return memory; // Return the complete memory object instead of just the ID
    },

    /**
     * Recall memories relevant to a prompt using semantic similarity
     * @param {string} prompt - The search prompt
     * @param {Object} options - Optional parameters
     * @param {number} options.limit - Maximum number of results (default: 5)
     * @param {string[]} options.tags - Filter by specific tags
     * @returns {Promise<Array>} - Array of relevant memory objects sorted by relevance
     */
    async recall(prompt, options = {}) {
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt is required and must be a string');
      }

      const limit = options.limit || 5;
      const memories = await memoryStore.getAll({ tags: options.tags });
      
      if (memories.length === 0) {
        return [];
      }

      try {
        // Try semantic search with embeddings
        const promptEmbedding = await client.embed(prompt);
        
        const memoriesWithEmbeddings = memories.filter(memory => memory.embedding);
        
        if (memoriesWithEmbeddings.length === 0) {
          // Fall back to keyword search
          return keywordSearch(prompt, memories).slice(0, limit);
        }

        const scoredMemories = memoriesWithEmbeddings.map(memory => ({
          ...memory,
          relevanceScore: cosineSimilarity(promptEmbedding, memory.embedding)
        }));

        return scoredMemories
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, limit)
          .map(memory => {
            const { embedding, ...memoryWithoutEmbedding } = memory;
            return memoryWithoutEmbedding;
          });

      } catch (error) {
        console.warn('Semantic search failed, falling back to keyword search:', error.message);
        return keywordSearch(prompt, memories).slice(0, limit);
      }
    },

    /**
     * Get all memories with optional filtering
     * @param {Object} options - Filter options
     * @param {string} options.prompt - Filter by similarity to this prompt
     * @param {string[]} options.tags - Filter by specific tags
     * @param {number} options.after - Only include memories created after this timestamp
     * @param {number} options.before - Only include memories created before this timestamp
     * @param {number} options.limit - Limit the number of results
     * @returns {Promise<Array>} - Array of memory objects
     */
    async getMemories(options = {}) {
      if (options.prompt) {
        // Use recall for prompt-based filtering
        return await this.recall(options.prompt, {
          limit: options.limit,
          tags: options.tags
        });
      }

      const memories = await memoryStore.getAll(options);
      
      return memories.map(memory => {
        const { embedding, ...memoryWithoutEmbedding } = memory;
        return memoryWithoutEmbedding;
      });
    },

    /**
     * Delete a memory by its ID
     * @param {string} id - The memory ID to delete
     * @returns {Promise<void>}
     */
    async forget(id) {
      if (!id || typeof id !== 'string') {
        throw new Error('Memory ID is required and must be a string');
      }

      await memoryStore.delete(id);
    },

    /**
     * Export memories to a JSON format for backup or transfer
     * @param {Object} options - Optional parameters
     * @param {string[]} options.tags - Only export memories with specific tags
     * @param {number} options.after - Only export memories created after this timestamp (ms)
     * @param {number} options.before - Only export memories created before this timestamp (ms)
     * @param {boolean} options.includeEmbeddings - Include embedding vectors in export (default: false)
     * @returns {Promise<Object>} - Export data object
     */
    async exportMemories(options = {}) {
      const memories = await memoryStore.getAll(options);
      
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        source: 'WarpMind Memory Module',
        options: {
          includeEmbeddings: options.includeEmbeddings || false,
          filters: {
            tags: options.tags,
            after: options.after,
            before: options.before
          }
        },
        memories: memories.map(memory => {
          const exported = { ...memory };
          
          // Remove embedding unless specifically requested
          if (!options.includeEmbeddings && exported.embedding) {
            delete exported.embedding;
          }
          
          return exported;
        }),
        count: memories.length
      };
      
      return exportData;
    },

    /**
     * Export memories to a downloadable JSON file (browser only)
     * @param {Object} options - Export options (same as exportMemories)
     * @param {string} options.filename - Optional filename (default: 'warpmind-memories-YYYY-MM-DD.json')
     * @returns {Promise<Object>} - Export stats and data
     */
    async exportMemoriesToFile(options = {}) {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('exportMemoriesToFile() is only available in browser environments. Use exportMemories() in Node.js.');
      }

      // Generate the export data
      const exportData = await this.exportMemories(options);
      
      // Generate filename if not provided
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const filename = options.filename || `warpmind-memories-${dateStr}.json`;
      
      // Create and trigger download
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create temporary download link
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = filename;
      downloadLink.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up the object URL
      URL.revokeObjectURL(url);
      
      return {
        exported: exportData.count,
        filename: filename,
        size: new Blob([jsonString]).size,
        data: exportData
      };
    },

    /**
     * Import memories from a previously exported JSON format
     * @param {Object|string} data - The exported data object or JSON string
     * @param {Object} options - Optional parameters
     * @param {boolean} options.merge - If true, merge with existing; if false, replace all (default: true)
     * @param {boolean} options.skipDuplicates - Skip memories with duplicate content (default: true)
     * @param {boolean} options.regenerateEmbeddings - Regenerate embeddings for imported memories (default: true)
     * @returns {Promise<Object>} - Import statistics: { imported: number, skipped: number, errors: string[] }
     */
    async importMemories(data, options = {}) {
      const {
        merge = true,
        skipDuplicates = true,
        regenerateEmbeddings = true
      } = options;

      // Parse data if it's a string
      let importData;
      try {
        importData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (error) {
        throw new Error('Invalid import data format: ' + error.message);
      }

      // Validate import data structure
      if (!importData.memories || !Array.isArray(importData.memories)) {
        throw new Error('Import data must contain a "memories" array');
      }

      const stats = {
        imported: 0,
        skipped: 0,
        errors: []
      };

      // Get existing memories for duplicate checking
      let existingMemories = [];
      if (skipDuplicates) {
        existingMemories = await memoryStore.getAll();
      }

      // Clear all memories if not merging
      if (!merge) {
        const allMemories = await memoryStore.getAll();
        for (const memory of allMemories) {
          await memoryStore.delete(memory.id);
        }
      }

      // Process each memory for import
      for (const memoryData of importData.memories) {
        try {
          // Check for duplicates by content
          if (skipDuplicates) {
            const isDuplicate = existingMemories.some(existing => 
              existing.content === memoryData.content
            );
            if (isDuplicate) {
              stats.skipped++;
              continue;
            }
          }

          // Prepare memory for storage
          const memory = {
            id: memoryData.id || generateUUID(), // Use existing ID or generate new one
            content: memoryData.content,
            rawData: memoryData.rawData,
            tags: memoryData.tags || [],
            timestamp: memoryData.timestamp || Date.now()
          };

          // Handle embeddings
          if (regenerateEmbeddings) {
            // Generate new embedding
            try {
              const embedding = await client.embed(memory.content);
              memory.embedding = embedding;
            } catch (error) {
              console.warn('Failed to generate embedding for imported memory:', error);
              memory.embedding = null;
            }
          } else if (memoryData.embedding) {
            // Use existing embedding if available
            memory.embedding = memoryData.embedding;
          } else {
            memory.embedding = null;
          }

          await memoryStore.store(memory);
          stats.imported++;

        } catch (error) {
          stats.errors.push(`Failed to import memory "${memoryData.content?.slice(0, 50)}...": ${error.message}`);
        }
      }

      return stats;
    },

    /**
     * Import memories from a file using browser file picker (browser only)
     * @param {Object} options - Import options (same as importMemories)
     * @returns {Promise<Object>} - Import statistics: { imported: number, skipped: number, errors: string[] }
     */
    async importMemoriesFromFile(options = {}) {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('importMemoriesFromFile() is only available in browser environments. Use importMemories() in Node.js.');
      }

      return new Promise((resolve, reject) => {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.style.display = 'none';
        
        // Handle file selection
        fileInput.onchange = async (event) => {
          try {
            const file = event.target.files[0];
            if (!file) {
              reject(new Error('No file selected'));
              return;
            }
            
            // Validate file type
            if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
              reject(new Error('Please select a JSON file (.json)'));
              return;
            }
            
            // Read file content
            const fileContent = await new Promise((fileResolve, fileReject) => {
              const reader = new FileReader();
              reader.onload = (e) => fileResolve(e.target.result);
              reader.onerror = () => fileReject(new Error('Failed to read file'));
              reader.readAsText(file);
            });
            
            // Parse and import the JSON data
            let importData;
            try {
              importData = JSON.parse(fileContent);
            } catch (parseError) {
              reject(new Error(`Invalid JSON file: ${parseError.message}`));
              return;
            }
            
            // Import the memories using existing importMemories method
            const stats = await this.importMemories(importData, options);
            
            // Clean up file input
            document.body.removeChild(fileInput);
            
            resolve({
              ...stats,
              filename: file.name,
              fileSize: file.size
            });
            
          } catch (error) {
            // Clean up file input on error
            if (document.body.contains(fileInput)) {
              document.body.removeChild(fileInput);
            }
            reject(error);
          }
        };
        
        // Handle dialog cancellation
        fileInput.oncancel = () => {
          document.body.removeChild(fileInput);
          reject(new Error('File selection cancelled'));
        };
        
        // Trigger file picker
        document.body.appendChild(fileInput);
        fileInput.click();
      });
    }
  };
}

// Export for both CommonJS and browser environments
if ( true && module.exports) {
  module.exports = createMemoryModule;
} else if (typeof window !== 'undefined') {
  window.createMemoryModule = createMemoryModule;
}


/***/ }),

/***/ 450:
/***/ ((module) => {

/**
 * Tool Call Tracker Module - Manages tool call lifecycle and provides inspection capabilities
 */

class ToolCallTracker {
  constructor() {
    this.activeCalls = new Map();
    this.callHistory = [];
    this.callIdCounter = 0;
  }
  
  /**
   * Start tracking a new tool call
   * @param {string} name - Tool name
   * @param {Object} parameters - Tool parameters
   * @returns {Object} - Tool call object with callId
   */
  startCall(name, parameters) {
    const callId = this.generateCallId();
    const call = {
      callId,
      name,
      parameters: this._sanitizeParameters(parameters),
      timestamp: new Date().toISOString(),
      startTime: performance.now()
    };
    
    this.activeCalls.set(callId, call);
    return call;
  }
  
  /**
   * Mark a tool call as completed
   * @param {string} callId - Call ID
   * @param {*} result - Tool result
   * @returns {Object} - Completed tool call object
   */
  completeCall(callId, result) {
    const call = this.activeCalls.get(callId);
    if (call) {
      const duration = Math.round(performance.now() - call.startTime);
      const completedCall = {
        ...call,
        result: this._sanitizeResult(result),
        duration,
        status: 'completed'
      };
      
      this.activeCalls.delete(callId);
      this.callHistory.push(completedCall);
      return completedCall;
    }
    return null;
  }
  
  /**
   * Mark a tool call as failed
   * @param {string} callId - Call ID
   * @param {Error} error - Error that occurred
   * @returns {Object} - Failed tool call object
   */
  errorCall(callId, error) {
    const call = this.activeCalls.get(callId);
    if (call) {
      const duration = Math.round(performance.now() - call.startTime);
      const errorCall = {
        ...call,
        error: error.message,
        duration,
        status: 'error'
      };
      
      this.activeCalls.delete(callId);
      this.callHistory.push(errorCall);
      return errorCall;
    }
    return null;
  }
  
  /**
   * Generate a unique call ID
   * @returns {string} - Unique call ID
   */
  generateCallId() {
    return `call_${Date.now()}_${++this.callIdCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get current active calls
   * @returns {Array} - Array of active call objects
   */
  getActiveCalls() {
    return Array.from(this.activeCalls.values());
  }
  
  /**
   * Get call history
   * @param {number} limit - Maximum number of calls to return
   * @returns {Array} - Array of completed/failed call objects
   */
  getCallHistory(limit = 50) {
    return this.callHistory.slice(-limit);
  }
  
  /**
   * Clear call history
   */
  clearHistory() {
    this.callHistory = [];
  }
  
  /**
   * Sanitize parameters to prevent circular references and limit size
   * @param {*} parameters - Parameters to sanitize
   * @returns {*} - Sanitized parameters
   */
  _sanitizeParameters(parameters) {
    try {
      // Convert to JSON and back to remove circular references
      const jsonString = JSON.stringify(parameters);
      
      // Limit size to prevent memory issues
      if (jsonString.length > 10000) {
        return { 
          _truncated: true, 
          _originalSize: jsonString.length,
          _preview: jsonString.substring(0, 1000) + '...'
        };
      }
      
      return JSON.parse(jsonString);
    } catch (error) {
      return { 
        _error: 'Failed to serialize parameters', 
        _type: typeof parameters,
        _message: error.message 
      };
    }
  }
  
  /**
   * Sanitize result to prevent circular references and limit size
   * @param {*} result - Result to sanitize
   * @returns {*} - Sanitized result
   */
  _sanitizeResult(result) {
    try {
      // Convert to JSON and back to remove circular references
      const jsonString = JSON.stringify(result);
      
      // Limit size to prevent memory issues
      if (jsonString.length > 10000) {
        return { 
          _truncated: true, 
          _originalSize: jsonString.length,
          _preview: jsonString.substring(0, 1000) + '...'
        };
      }
      
      return JSON.parse(jsonString);
    } catch (error) {
      return { 
        _error: 'Failed to serialize result', 
        _type: typeof result,
        _message: error.message 
      };
    }
  }
}

module.exports = ToolCallTracker;


/***/ }),

/***/ 603:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 604:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * Audio module for WarpMind - Contains all audio-related operations
 * Includes text-to-speech, speech-to-text, and voice chat functionality
 */

// Import required utilities
let createTimeoutController, TimeoutError;

if ( true && module.exports) {
  // Node.js environment
  const { createTimeoutController: ctc } = __webpack_require__(94);
  const { TimeoutError: te } = __webpack_require__(969);
  createTimeoutController = ctc;
  TimeoutError = te;
} else {
  // Browser environment - utilities should be available globally
  createTimeoutController = window.createTimeoutController;
  TimeoutError = window.TimeoutError;
}

/**
 * Audio module factory function that accepts a client instance
 * @param {Object} client - The client instance (BaseClient or WarpMind)
 * @returns {Object} - Object with audio methods to be mixed into the main class
 */
function createAudioModule(client) {
  return {
    /**
     * Convert text to speech using TTS
     * @param {string} text - Text to convert to speech
     * @param {Object} options - Optional parameters
     * @param {string} options.model - TTS model (default: 'tts-1')
     * @param {string} options.voice - Voice to use: alloy, echo, fable, onyx, nova, shimmer (default: 'alloy')
     * @param {string} options.format - Audio format: mp3, opus, aac, flac (default: 'mp3')
     * @param {number} options.speed - Speech speed: 0.25 to 4.0 (default: 1.0)
     * @param {boolean} options.stream - Enable streaming for real-time audio (default: false)
     * @param {Function} options.onChunk - Callback for streaming chunks (chunk) => {}
     * @param {number} options.timeoutMs - Request timeout in milliseconds
     * @returns {Promise<Blob>} - Audio data as Blob, or Promise<void> if streaming
     */
    async textToSpeech(text, options = {}) {
      if (!client.apiKey) {
        throw new Error('API key is required. Use setApiKey() to set your proxy authentication key.');
      }

      const requestData = {
        model: options.model || 'tts-1',
        input: text,
        voice: options.voice || 'alloy',
        response_format: options.format || 'mp3',
        speed: options.speed || 1.0
      };

      // Add streaming parameter if requested
      if (options.stream) {
        requestData.stream = true;
        // For streaming, use opus format which is better for real-time
        if (!options.format) {
          requestData.response_format = 'opus';
        }
      }

      const timeoutMs = options.timeoutMs || client.defaultTimeoutMs;
      const { controller, timeoutId } = createTimeoutController(timeoutMs);
      const url = client._buildApiUrl('/audio/speech');
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': client.apiKey
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        });

        if (!response.ok) {
          clearTimeout(timeoutId);
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`TTS request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        // Handle streaming response
        if (options.stream && options.onChunk) {
          const reader = response.body.getReader();
          const chunks = [];
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) break;
              
              // Store chunk for final blob and call callback
              chunks.push(value);
              options.onChunk(value);
            }
            
            clearTimeout(timeoutId);
            
            // Return combined blob for compatibility
            return new Blob(chunks, { type: response.headers.get('content-type') || 'audio/opus' });
          } finally {
            reader.releaseLock();
          }
        } else {
          // Standard non-streaming response
          clearTimeout(timeoutId);
          return await response.blob();
        }
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new TimeoutError(`Request timed out after ${timeoutMs}ms`);
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error('Network error: Unable to connect to the TTS API.');
        }
        throw error;
      }
    },

    /**
     * Transcribe audio to text using speech-to-text
     * @param {File|Blob} audioFile - Audio file to transcribe
     * @param {Object} options - Optional parameters
     * @param {string} options.model - STT model (default: 'whisper-1')
     * @param {string} options.language - Language code (optional)
     * @param {string} options.prompt - Prompt to guide transcription (optional)
     * @param {number} options.temperature - Sampling temperature (optional)
     * @param {boolean} options.stream - Enable streaming for partial transcripts (default: false)
     * @param {Function} options.onPartial - Callback for partial transcripts (text) => {}
     * @param {number} options.timeoutMs - Request timeout in milliseconds
     * @returns {Promise<string>} - Transcribed text
     */
    async speechToText(audioFile, options = {}) {
      if (!client.apiKey) {
        throw new Error('API key is required. Use setApiKey() to set your proxy authentication key.');
      }

      if (!audioFile || !(audioFile instanceof File || audioFile instanceof Blob)) {
        throw new Error('Audio file must be a File or Blob object');
      }

      const formData = new FormData();
      
      // Ensure the file has a proper name and extension
      const fileName = audioFile.name || 'audio.wav';
      formData.append('file', audioFile, fileName);
      formData.append('model', options.model || 'whisper-1');
      
      // Optional parameters - only add if they exist
      if (options.language) {
        formData.append('language', options.language);
      }
      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }
      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }

      // For streaming, we'll use verbose_json response format - but don't add timestamp_granularities for basic proxy compatibility
      if (options.stream) {
        formData.append('response_format', 'verbose_json');
        // Commented out as this might not be supported by all proxy servers
        // formData.append('timestamp_granularities[]', 'word');
      }

      const timeoutMs = options.timeoutMs || client.defaultTimeoutMs;
      const { controller, timeoutId } = createTimeoutController(timeoutMs);
      
      // Always use the standard transcriptions endpoint
      const url = client._buildApiUrl('/audio/transcriptions');
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'api-key': client.apiKey
            // Don't set Content-Type for FormData - let browser set it with boundary
          },
          body: formData,
          signal: controller.signal
        });

        if (!response.ok) {
          clearTimeout(timeoutId);
          let errorDetails = '';
          try {
            const errorData = await response.json();
            errorDetails = errorData.error?.message || JSON.stringify(errorData);
          } catch (e) {
            // If we can't parse JSON, try to get text
            try {
              errorDetails = await response.text();
            } catch (e2) {
              errorDetails = 'Unable to parse error response';
            }
          }
          
          // Enhanced error message with more details
          throw new Error(`STT request failed: ${response.status} ${response.statusText}. Error details: ${errorDetails}`);
        }

        clearTimeout(timeoutId);
        const result = await response.json();
        
        // If streaming was requested but API doesn't support it, simulate streaming
        if (options.stream && options.onPartial && result.text) {
          // Simulate streaming by breaking the text into chunks
          const words = result.text.split(' ');
          let currentText = '';
          
          // Emit partial results word by word with small delays
          for (let i = 0; i < words.length; i++) {
            currentText += (i > 0 ? ' ' : '') + words[i];
            options.onPartial(currentText);
            
            // Small delay to simulate streaming (only if more words remain)
            if (i < words.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          
          return result.text;
        } else {
          // Standard non-streaming response
          return result.text || '';
        }
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new TimeoutError(`Request timed out after ${timeoutMs}ms`);
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error('Network error: Unable to connect to the STT API.');
        }
        throw error;
      }
    },

    /**
     * Play audio from blob (utility function)
     * @param {Blob} audioBlob - Audio data to play
     * @returns {Promise} - Resolves when audio finishes playing
     */
    async playAudio(audioBlob) {
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        const url = URL.createObjectURL(audioBlob);
        
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to play audio'));
        };
        
        audio.src = url;
        audio.play().catch(reject);
      });
    },

    /**
     * Create an interactive voice conversation
     * @param {string} systemPrompt - System instructions for the AI
     * @param {Object} options - Configuration options
     * @returns {Object} - Voice conversation controller
     */
    createVoiceChat(systemPrompt = "You are a helpful assistant.", options = {}) {
      const conversation = [];
      let isRecording = false;
      let mediaRecorder = null;
      let audioChunks = [];
      const self = this; // Reference to the audio module methods

      if (systemPrompt) {
        conversation.push({ role: 'system', content: systemPrompt });
      }

      const voiceChat = {
        /**
         * Start recording audio from the user
         */
        async startRecording() {
          if (isRecording) {
            throw new Error('Already recording');
          }

          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: { 
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
              } 
            });
            
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream, {
              mimeType: 'audio/webm;codecs=opus'
            });
            
            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunks.push(event.data);
              }
            };
            
            mediaRecorder.start();
            isRecording = true;
          } catch (error) {
            throw new Error(`Failed to start recording: ${error.message}`);
          }
        },

        /**
         * Stop recording and process the conversation
         */
        async stopRecording() {
          if (!isRecording || !mediaRecorder) {
            throw new Error('Not currently recording');
          }

          return new Promise(async (resolve, reject) => {
            mediaRecorder.onstop = async () => {
              isRecording = false;
              
              // Stop all tracks to release microphone
              if (mediaRecorder.stream) {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
              }

              try {
                // Create audio blob from recorded chunks
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
                
                // Convert speech to text
                const userMessage = await self.speechToText(audioBlob, options.stt || {});
                conversation.push({ role: 'user', content: userMessage });
                
                // Get AI response
                const aiResponse = await client.chat(conversation, options.chat || {});
                conversation.push({ role: 'assistant', content: aiResponse });
                
                // Convert AI response to speech
                const speechBlob = await self.textToSpeech(aiResponse, options.tts || {});
                
                resolve({
                  userMessage,
                  aiResponse,
                  audioBlob: speechBlob,
                  conversation: [...conversation]
                });
              } catch (error) {
                reject(error);
              }
            };

            mediaRecorder.stop();
          });
        },

        /**
         * Get the current conversation history
         */
        getConversation() {
          return [...conversation];
        },

        /**
         * Clear the conversation history
         */
        clearConversation() {
          conversation.length = 0;
          if (systemPrompt) {
            conversation.push({ role: 'system', content: systemPrompt });
          }
        },

        /**
         * Check if currently recording
         */
        isRecording() {
          return isRecording;
        }
      };
      
      // Add alias for backward compatibility
      voiceChat.stopRecordingAndRespond = voiceChat.stopRecording;
      
      return voiceChat;
    }
  };
}

// Export the module
if ( true && module.exports) {
  module.exports = createAudioModule;
} else {
  // Browser environment
  window.createAudioModule = createAudioModule;
}


/***/ }),

/***/ 710:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*!

JSZip v3.10.1 - A JavaScript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.

JSZip uses the library pako released under the MIT license :
https://github.com/nodeca/pako/blob/main/LICENSE
*/

!function(e){if(true)module.exports=e();else // removed by dead control flow
{}}(function(){return function s(a,o,h){function u(r,e){if(!o[r]){if(!a[r]){var t=undefined;if(!e&&t)return require(r,!0);if(l)return l(r,!0);var n=new Error("Cannot find module '"+r+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[r]={exports:{}};a[r][0].call(i.exports,function(e){var t=a[r][1][e];return u(t||e)},i,i.exports,s,a,o,h)}return o[r].exports}for(var l=undefined,e=0;e<h.length;e++)u(h[e]);return u}({1:[function(e,t,r){"use strict";var d=e("./utils"),c=e("./support"),p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(e){for(var t,r,n,i,s,a,o,h=[],u=0,l=e.length,f=l,c="string"!==d.getTypeOf(e);u<e.length;)f=l-u,n=c?(t=e[u++],r=u<l?e[u++]:0,u<l?e[u++]:0):(t=e.charCodeAt(u++),r=u<l?e.charCodeAt(u++):0,u<l?e.charCodeAt(u++):0),i=t>>2,s=(3&t)<<4|r>>4,a=1<f?(15&r)<<2|n>>6:64,o=2<f?63&n:64,h.push(p.charAt(i)+p.charAt(s)+p.charAt(a)+p.charAt(o));return h.join("")},r.decode=function(e){var t,r,n,i,s,a,o=0,h=0,u="data:";if(e.substr(0,u.length)===u)throw new Error("Invalid base64 input, it looks like a data url.");var l,f=3*(e=e.replace(/[^A-Za-z0-9+/=]/g,"")).length/4;if(e.charAt(e.length-1)===p.charAt(64)&&f--,e.charAt(e.length-2)===p.charAt(64)&&f--,f%1!=0)throw new Error("Invalid base64 input, bad content length.");for(l=c.uint8array?new Uint8Array(0|f):new Array(0|f);o<e.length;)t=p.indexOf(e.charAt(o++))<<2|(i=p.indexOf(e.charAt(o++)))>>4,r=(15&i)<<4|(s=p.indexOf(e.charAt(o++)))>>2,n=(3&s)<<6|(a=p.indexOf(e.charAt(o++))),l[h++]=t,64!==s&&(l[h++]=r),64!==a&&(l[h++]=n);return l}},{"./support":30,"./utils":32}],2:[function(e,t,r){"use strict";var n=e("./external"),i=e("./stream/DataWorker"),s=e("./stream/Crc32Probe"),a=e("./stream/DataLengthProbe");function o(e,t,r,n,i){this.compressedSize=e,this.uncompressedSize=t,this.crc32=r,this.compression=n,this.compressedContent=i}o.prototype={getContentWorker:function(){var e=new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),t=this;return e.on("end",function(){if(this.streamInfo.data_length!==t.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),e},getCompressedWorker:function(){return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(e,t,r){return e.pipe(new s).pipe(new a("uncompressedSize")).pipe(t.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",t)},t.exports=o},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(e,t,r){"use strict";var n=e("./stream/GenericWorker");r.STORE={magic:"\0\0",compressWorker:function(){return new n("STORE compression")},uncompressWorker:function(){return new n("STORE decompression")}},r.DEFLATE=e("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(e,t,r){"use strict";var n=e("./utils");var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t){return void 0!==e&&e.length?"string"!==n.getTypeOf(e)?function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}(0|t,e,e.length,0):function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t.charCodeAt(a))];return-1^e}(0|t,e,e.length,0):0}},{"./utils":32}],5:[function(e,t,r){"use strict";r.base64=!1,r.binary=!1,r.dir=!1,r.createFolders=!0,r.date=null,r.compression=null,r.compressionOptions=null,r.comment=null,r.unixPermissions=null,r.dosPermissions=null},{}],6:[function(e,t,r){"use strict";var n=null;n="undefined"!=typeof Promise?Promise:e("lie"),t.exports={Promise:n}},{lie:37}],7:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,i=e("pako"),s=e("./utils"),a=e("./stream/GenericWorker"),o=n?"uint8array":"array";function h(e,t){a.call(this,"FlateWorker/"+e),this._pako=null,this._pakoAction=e,this._pakoOptions=t,this.meta={}}r.magic="\b\0",s.inherits(h,a),h.prototype.processChunk=function(e){this.meta=e.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,e.data),!1)},h.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0)},h.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null},h.prototype._createPako=function(){this._pako=new i[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var t=this;this._pako.onData=function(e){t.push({data:e,meta:t.meta})}},r.compressWorker=function(e){return new h("Deflate",e)},r.uncompressWorker=function(){return new h("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(e,t,r){"use strict";function A(e,t){var r,n="";for(r=0;r<t;r++)n+=String.fromCharCode(255&e),e>>>=8;return n}function n(e,t,r,n,i,s){var a,o,h=e.file,u=e.compression,l=s!==O.utf8encode,f=I.transformTo("string",s(h.name)),c=I.transformTo("string",O.utf8encode(h.name)),d=h.comment,p=I.transformTo("string",s(d)),m=I.transformTo("string",O.utf8encode(d)),_=c.length!==h.name.length,g=m.length!==d.length,b="",v="",y="",w=h.dir,k=h.date,x={crc32:0,compressedSize:0,uncompressedSize:0};t&&!r||(x.crc32=e.crc32,x.compressedSize=e.compressedSize,x.uncompressedSize=e.uncompressedSize);var S=0;t&&(S|=8),l||!_&&!g||(S|=2048);var z=0,C=0;w&&(z|=16),"UNIX"===i?(C=798,z|=function(e,t){var r=e;return e||(r=t?16893:33204),(65535&r)<<16}(h.unixPermissions,w)):(C=20,z|=function(e){return 63&(e||0)}(h.dosPermissions)),a=k.getUTCHours(),a<<=6,a|=k.getUTCMinutes(),a<<=5,a|=k.getUTCSeconds()/2,o=k.getUTCFullYear()-1980,o<<=4,o|=k.getUTCMonth()+1,o<<=5,o|=k.getUTCDate(),_&&(v=A(1,1)+A(B(f),4)+c,b+="up"+A(v.length,2)+v),g&&(y=A(1,1)+A(B(p),4)+m,b+="uc"+A(y.length,2)+y);var E="";return E+="\n\0",E+=A(S,2),E+=u.magic,E+=A(a,2),E+=A(o,2),E+=A(x.crc32,4),E+=A(x.compressedSize,4),E+=A(x.uncompressedSize,4),E+=A(f.length,2),E+=A(b.length,2),{fileRecord:R.LOCAL_FILE_HEADER+E+f+b,dirRecord:R.CENTRAL_FILE_HEADER+A(C,2)+E+A(p.length,2)+"\0\0\0\0"+A(z,4)+A(n,4)+f+b+p}}var I=e("../utils"),i=e("../stream/GenericWorker"),O=e("../utf8"),B=e("../crc32"),R=e("../signature");function s(e,t,r,n){i.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=t,this.zipPlatform=r,this.encodeFileName=n,this.streamFiles=e,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}I.inherits(s,i),s.prototype.push=function(e){var t=e.meta.percent||0,r=this.entriesCount,n=this._sources.length;this.accumulate?this.contentBuffer.push(e):(this.bytesWritten+=e.data.length,i.prototype.push.call(this,{data:e.data,meta:{currentFile:this.currentFile,percent:r?(t+100*(r-n-1))/r:100}}))},s.prototype.openedSource=function(e){this.currentSourceOffset=this.bytesWritten,this.currentFile=e.file.name;var t=this.streamFiles&&!e.file.dir;if(t){var r=n(e,t,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}})}else this.accumulate=!0},s.prototype.closedSource=function(e){this.accumulate=!1;var t=this.streamFiles&&!e.file.dir,r=n(e,t,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),t)this.push({data:function(e){return R.DATA_DESCRIPTOR+A(e.crc32,4)+A(e.compressedSize,4)+A(e.uncompressedSize,4)}(e),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},s.prototype.flush=function(){for(var e=this.bytesWritten,t=0;t<this.dirRecords.length;t++)this.push({data:this.dirRecords[t],meta:{percent:100}});var r=this.bytesWritten-e,n=function(e,t,r,n,i){var s=I.transformTo("string",i(n));return R.CENTRAL_DIRECTORY_END+"\0\0\0\0"+A(e,2)+A(e,2)+A(t,4)+A(r,4)+A(s.length,2)+s}(this.dirRecords.length,r,e,this.zipComment,this.encodeFileName);this.push({data:n,meta:{percent:100}})},s.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},s.prototype.registerPrevious=function(e){this._sources.push(e);var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.closedSource(t.previous.streamInfo),t._sources.length?t.prepareNextSource():t.end()}),e.on("error",function(e){t.error(e)}),this},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},s.prototype.error=function(e){var t=this._sources;if(!i.prototype.error.call(this,e))return!1;for(var r=0;r<t.length;r++)try{t[r].error(e)}catch(e){}return!0},s.prototype.lock=function(){i.prototype.lock.call(this);for(var e=this._sources,t=0;t<e.length;t++)e[t].lock()},t.exports=s},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(e,t,r){"use strict";var u=e("../compressions"),n=e("./ZipFileWorker");r.generateWorker=function(e,a,t){var o=new n(a.streamFiles,t,a.platform,a.encodeFileName),h=0;try{e.forEach(function(e,t){h++;var r=function(e,t){var r=e||t,n=u[r];if(!n)throw new Error(r+" is not a valid compression method !");return n}(t.options.compression,a.compression),n=t.options.compressionOptions||a.compressionOptions||{},i=t.dir,s=t.date;t._compressWorker(r,n).withStreamInfo("file",{name:e,dir:i,date:s,comment:t.comment||"",unixPermissions:t.unixPermissions,dosPermissions:t.dosPermissions}).pipe(o)}),o.entriesCount=h}catch(e){o.error(e)}return o}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(e,t,r){"use strict";function n(){if(!(this instanceof n))return new n;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var e=new n;for(var t in this)"function"!=typeof this[t]&&(e[t]=this[t]);return e}}(n.prototype=e("./object")).loadAsync=e("./load"),n.support=e("./support"),n.defaults=e("./defaults"),n.version="3.10.1",n.loadAsync=function(e,t){return(new n).loadAsync(e,t)},n.external=e("./external"),t.exports=n},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(e,t,r){"use strict";var u=e("./utils"),i=e("./external"),n=e("./utf8"),s=e("./zipEntries"),a=e("./stream/Crc32Probe"),l=e("./nodejsUtils");function f(n){return new i.Promise(function(e,t){var r=n.decompressed.getContentWorker().pipe(new a);r.on("error",function(e){t(e)}).on("end",function(){r.streamInfo.crc32!==n.decompressed.crc32?t(new Error("Corrupted zip : CRC32 mismatch")):e()}).resume()})}t.exports=function(e,o){var h=this;return o=u.extend(o||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:n.utf8decode}),l.isNode&&l.isStream(e)?i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):u.prepareContent("the loaded zip file",e,!0,o.optimizedBinaryString,o.base64).then(function(e){var t=new s(o);return t.load(e),t}).then(function(e){var t=[i.Promise.resolve(e)],r=e.files;if(o.checkCRC32)for(var n=0;n<r.length;n++)t.push(f(r[n]));return i.Promise.all(t)}).then(function(e){for(var t=e.shift(),r=t.files,n=0;n<r.length;n++){var i=r[n],s=i.fileNameStr,a=u.resolve(i.fileNameStr);h.file(a,i.decompressed,{binary:!0,optimizedBinaryString:!0,date:i.date,dir:i.dir,comment:i.fileCommentStr.length?i.fileCommentStr:null,unixPermissions:i.unixPermissions,dosPermissions:i.dosPermissions,createFolders:o.createFolders}),i.dir||(h.file(a).unsafeOriginalName=s)}return t.zipComment.length&&(h.comment=t.zipComment),h})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../stream/GenericWorker");function s(e,t){i.call(this,"Nodejs stream input adapter for "+e),this._upstreamEnded=!1,this._bindStream(t)}n.inherits(s,i),s.prototype._bindStream=function(e){var t=this;(this._stream=e).pause(),e.on("data",function(e){t.push({data:e,meta:{percent:0}})}).on("error",function(e){t.isPaused?this.generatedError=e:t.error(e)}).on("end",function(){t.isPaused?t._upstreamEnded=!0:t.end()})},s.prototype.pause=function(){return!!i.prototype.pause.call(this)&&(this._stream.pause(),!0)},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},t.exports=s},{"../stream/GenericWorker":28,"../utils":32}],13:[function(e,t,r){"use strict";var i=e("readable-stream").Readable;function n(e,t,r){i.call(this,t),this._helper=e;var n=this;e.on("data",function(e,t){n.push(e)||n._helper.pause(),r&&r(t)}).on("error",function(e){n.emit("error",e)}).on("end",function(){n.push(null)})}e("../utils").inherits(n,i),n.prototype._read=function(){this._helper.resume()},t.exports=n},{"../utils":32,"readable-stream":16}],14:[function(e,t,r){"use strict";t.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(e,t){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(e,t);if("number"==typeof e)throw new Error('The "data" argument must not be a number');return new Buffer(e,t)},allocBuffer:function(e){if(Buffer.alloc)return Buffer.alloc(e);var t=new Buffer(e);return t.fill(0),t},isBuffer:function(e){return Buffer.isBuffer(e)},isStream:function(e){return e&&"function"==typeof e.on&&"function"==typeof e.pause&&"function"==typeof e.resume}}},{}],15:[function(e,t,r){"use strict";function s(e,t,r){var n,i=u.getTypeOf(t),s=u.extend(r||{},f);s.date=s.date||new Date,null!==s.compression&&(s.compression=s.compression.toUpperCase()),"string"==typeof s.unixPermissions&&(s.unixPermissions=parseInt(s.unixPermissions,8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=!0),s.dosPermissions&&16&s.dosPermissions&&(s.dir=!0),s.dir&&(e=g(e)),s.createFolders&&(n=_(e))&&b.call(this,n,!0);var a="string"===i&&!1===s.binary&&!1===s.base64;r&&void 0!==r.binary||(s.binary=!a),(t instanceof c&&0===t.uncompressedSize||s.dir||!t||0===t.length)&&(s.base64=!1,s.binary=!0,t="",s.compression="STORE",i="string");var o=null;o=t instanceof c||t instanceof l?t:p.isNode&&p.isStream(t)?new m(e,t):u.prepareContent(e,t,s.binary,s.optimizedBinaryString,s.base64);var h=new d(e,o,s);this.files[e]=h}var i=e("./utf8"),u=e("./utils"),l=e("./stream/GenericWorker"),a=e("./stream/StreamHelper"),f=e("./defaults"),c=e("./compressedObject"),d=e("./zipObject"),o=e("./generate"),p=e("./nodejsUtils"),m=e("./nodejs/NodejsStreamInputAdapter"),_=function(e){"/"===e.slice(-1)&&(e=e.substring(0,e.length-1));var t=e.lastIndexOf("/");return 0<t?e.substring(0,t):""},g=function(e){return"/"!==e.slice(-1)&&(e+="/"),e},b=function(e,t){return t=void 0!==t?t:f.createFolders,e=g(e),this.files[e]||s.call(this,e,null,{dir:!0,createFolders:t}),this.files[e]};function h(e){return"[object RegExp]"===Object.prototype.toString.call(e)}var n={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(e){var t,r,n;for(t in this.files)n=this.files[t],(r=t.slice(this.root.length,t.length))&&t.slice(0,this.root.length)===this.root&&e(r,n)},filter:function(r){var n=[];return this.forEach(function(e,t){r(e,t)&&n.push(t)}),n},file:function(e,t,r){if(1!==arguments.length)return e=this.root+e,s.call(this,e,t,r),this;if(h(e)){var n=e;return this.filter(function(e,t){return!t.dir&&n.test(e)})}var i=this.files[this.root+e];return i&&!i.dir?i:null},folder:function(r){if(!r)return this;if(h(r))return this.filter(function(e,t){return t.dir&&r.test(e)});var e=this.root+r,t=b.call(this,e),n=this.clone();return n.root=t.name,n},remove:function(r){r=this.root+r;var e=this.files[r];if(e||("/"!==r.slice(-1)&&(r+="/"),e=this.files[r]),e&&!e.dir)delete this.files[r];else for(var t=this.filter(function(e,t){return t.name.slice(0,r.length)===r}),n=0;n<t.length;n++)delete this.files[t[n].name];return this},generate:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(e){var t,r={};try{if((r=u.extend(e||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:i.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");u.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var n=r.comment||this.comment||"";t=o.generateWorker(this,r,n)}catch(e){(t=new l("error")).error(e)}return new a(t,r.type||"string",r.mimeType)},generateAsync:function(e,t){return this.generateInternalStream(e).accumulate(t)},generateNodeStream:function(e,t){return(e=e||{}).type||(e.type="nodebuffer"),this.generateInternalStream(e).toNodejsStream(t)}};t.exports=n},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(e,t,r){"use strict";t.exports=e("stream")},{stream:void 0}],17:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e);for(var t=0;t<this.data.length;t++)e[t]=255&e[t]}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data[this.zero+e]},i.prototype.lastIndexOfSignature=function(e){for(var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.length-4;0<=s;--s)if(this.data[s]===t&&this.data[s+1]===r&&this.data[s+2]===n&&this.data[s+3]===i)return s-this.zero;return-1},i.prototype.readAndCheckSignature=function(e){var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.readData(4);return t===s[0]&&r===s[1]&&n===s[2]&&i===s[3]},i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return[];var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],18:[function(e,t,r){"use strict";var n=e("../utils");function i(e){this.data=e,this.length=e.length,this.index=0,this.zero=0}i.prototype={checkOffset:function(e){this.checkIndex(this.index+e)},checkIndex:function(e){if(this.length<this.zero+e||e<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+e+"). Corrupted zip ?")},setIndex:function(e){this.checkIndex(e),this.index=e},skip:function(e){this.setIndex(this.index+e)},byteAt:function(){},readInt:function(e){var t,r=0;for(this.checkOffset(e),t=this.index+e-1;t>=this.index;t--)r=(r<<8)+this.byteAt(t);return this.index+=e,r},readString:function(e){return n.transformTo("string",this.readData(e))},readData:function(){},lastIndexOfSignature:function(){},readAndCheckSignature:function(){},readDate:function(){var e=this.readInt(4);return new Date(Date.UTC(1980+(e>>25&127),(e>>21&15)-1,e>>16&31,e>>11&31,e>>5&63,(31&e)<<1))}},t.exports=i},{"../utils":32}],19:[function(e,t,r){"use strict";var n=e("./Uint8ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data.charCodeAt(this.zero+e)},i.prototype.lastIndexOfSignature=function(e){return this.data.lastIndexOf(e)-this.zero},i.prototype.readAndCheckSignature=function(e){return e===this.readData(4)},i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],21:[function(e,t,r){"use strict";var n=e("./ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return new Uint8Array(0);var t=this.data.subarray(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./ArrayReader":17}],22:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../support"),s=e("./ArrayReader"),a=e("./StringReader"),o=e("./NodeBufferReader"),h=e("./Uint8ArrayReader");t.exports=function(e){var t=n.getTypeOf(e);return n.checkSupport(t),"string"!==t||i.uint8array?"nodebuffer"===t?new o(e):i.uint8array?new h(n.transformTo("uint8array",e)):new s(n.transformTo("array",e)):new a(e)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(e,t,r){"use strict";r.LOCAL_FILE_HEADER="PK",r.CENTRAL_FILE_HEADER="PK",r.CENTRAL_DIRECTORY_END="PK",r.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",r.ZIP64_CENTRAL_DIRECTORY_END="PK",r.DATA_DESCRIPTOR="PK\b"},{}],24:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../utils");function s(e){n.call(this,"ConvertWorker to "+e),this.destType=e}i.inherits(s,n),s.prototype.processChunk=function(e){this.push({data:i.transformTo(this.destType,e.data),meta:e.meta})},t.exports=s},{"../utils":32,"./GenericWorker":28}],25:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../crc32");function s(){n.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}e("../utils").inherits(s,n),s.prototype.processChunk=function(e){this.streamInfo.crc32=i(e.data,this.streamInfo.crc32||0),this.push(e)},t.exports=s},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataLengthProbe for "+e),this.propName=e,this.withStreamInfo(e,0)}n.inherits(s,i),s.prototype.processChunk=function(e){if(e){var t=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=t+e.data.length}i.prototype.processChunk.call(this,e)},t.exports=s},{"../utils":32,"./GenericWorker":28}],27:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataWorker");var t=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,e.then(function(e){t.dataIsReady=!0,t.data=e,t.max=e&&e.length||0,t.type=n.getTypeOf(e),t.isPaused||t._tickAndRepeat()},function(e){t.error(e)})}n.inherits(s,i),s.prototype.cleanUp=function(){i.prototype.cleanUp.call(this),this.data=null},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,n.delay(this._tickAndRepeat,[],this)),!0)},s.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(n.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var e=null,t=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":e=this.data.substring(this.index,t);break;case"uint8array":e=this.data.subarray(this.index,t);break;case"array":case"nodebuffer":e=this.data.slice(this.index,t)}return this.index=t,this.push({data:e,meta:{percent:this.max?this.index/this.max*100:0}})},t.exports=s},{"../utils":32,"./GenericWorker":28}],28:[function(e,t,r){"use strict";function n(e){this.name=e||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}n.prototype={push:function(e){this.emit("data",e)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(e){this.emit("error",e)}return!0},error:function(e){return!this.isFinished&&(this.isPaused?this.generatedError=e:(this.isFinished=!0,this.emit("error",e),this.previous&&this.previous.error(e),this.cleanUp()),!0)},on:function(e,t){return this._listeners[e].push(t),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(e,t){if(this._listeners[e])for(var r=0;r<this._listeners[e].length;r++)this._listeners[e][r].call(this,t)},pipe:function(e){return e.registerPrevious(this)},registerPrevious:function(e){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=e.streamInfo,this.mergeStreamInfo(),this.previous=e;var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.end()}),e.on("error",function(e){t.error(e)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var e=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),e=!0),this.previous&&this.previous.resume(),!e},flush:function(){},processChunk:function(e){this.push(e)},withStreamInfo:function(e,t){return this.extraStreamInfo[e]=t,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var e in this.extraStreamInfo)Object.prototype.hasOwnProperty.call(this.extraStreamInfo,e)&&(this.streamInfo[e]=this.extraStreamInfo[e])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var e="Worker "+this.name;return this.previous?this.previous+" -> "+e:e}},t.exports=n},{}],29:[function(e,t,r){"use strict";var h=e("../utils"),i=e("./ConvertWorker"),s=e("./GenericWorker"),u=e("../base64"),n=e("../support"),a=e("../external"),o=null;if(n.nodestream)try{o=e("../nodejs/NodejsStreamOutputAdapter")}catch(e){}function l(e,o){return new a.Promise(function(t,r){var n=[],i=e._internalType,s=e._outputType,a=e._mimeType;e.on("data",function(e,t){n.push(e),o&&o(t)}).on("error",function(e){n=[],r(e)}).on("end",function(){try{var e=function(e,t,r){switch(e){case"blob":return h.newBlob(h.transformTo("arraybuffer",t),r);case"base64":return u.encode(t);default:return h.transformTo(e,t)}}(s,function(e,t){var r,n=0,i=null,s=0;for(r=0;r<t.length;r++)s+=t[r].length;switch(e){case"string":return t.join("");case"array":return Array.prototype.concat.apply([],t);case"uint8array":for(i=new Uint8Array(s),r=0;r<t.length;r++)i.set(t[r],n),n+=t[r].length;return i;case"nodebuffer":return Buffer.concat(t);default:throw new Error("concat : unsupported type '"+e+"'")}}(i,n),a);t(e)}catch(e){r(e)}n=[]}).resume()})}function f(e,t,r){var n=t;switch(t){case"blob":case"arraybuffer":n="uint8array";break;case"base64":n="string"}try{this._internalType=n,this._outputType=t,this._mimeType=r,h.checkSupport(n),this._worker=e.pipe(new i(n)),e.lock()}catch(e){this._worker=new s("error"),this._worker.error(e)}}f.prototype={accumulate:function(e){return l(this,e)},on:function(e,t){var r=this;return"data"===e?this._worker.on(e,function(e){t.call(r,e.data,e.meta)}):this._worker.on(e,function(){h.delay(t,arguments,r)}),this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(e){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new o(this,{objectMode:"nodebuffer"!==this._outputType},e)}},t.exports=f},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(e,t,r){"use strict";if(r.base64=!0,r.array=!0,r.string=!0,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=!1;else{var n=new ArrayBuffer(0);try{r.blob=0===new Blob([n],{type:"application/zip"}).size}catch(e){try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);i.append(n),r.blob=0===i.getBlob("application/zip").size}catch(e){r.blob=!1}}}try{r.nodestream=!!e("readable-stream").Readable}catch(e){r.nodestream=!1}},{"readable-stream":16}],31:[function(e,t,s){"use strict";for(var o=e("./utils"),h=e("./support"),r=e("./nodejsUtils"),n=e("./stream/GenericWorker"),u=new Array(256),i=0;i<256;i++)u[i]=252<=i?6:248<=i?5:240<=i?4:224<=i?3:192<=i?2:1;u[254]=u[254]=1;function a(){n.call(this,"utf-8 decode"),this.leftOver=null}function l(){n.call(this,"utf-8 encode")}s.utf8encode=function(e){return h.nodebuffer?r.newBufferFrom(e,"utf-8"):function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=h.uint8array?new Uint8Array(o):new Array(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t}(e)},s.utf8decode=function(e){return h.nodebuffer?o.transformTo("nodebuffer",e).toString("utf-8"):function(e){var t,r,n,i,s=e.length,a=new Array(2*s);for(t=r=0;t<s;)if((n=e[t++])<128)a[r++]=n;else if(4<(i=u[n]))a[r++]=65533,t+=i-1;else{for(n&=2===i?31:3===i?15:7;1<i&&t<s;)n=n<<6|63&e[t++],i--;1<i?a[r++]=65533:n<65536?a[r++]=n:(n-=65536,a[r++]=55296|n>>10&1023,a[r++]=56320|1023&n)}return a.length!==r&&(a.subarray?a=a.subarray(0,r):a.length=r),o.applyFromCharCode(a)}(e=o.transformTo(h.uint8array?"uint8array":"array",e))},o.inherits(a,n),a.prototype.processChunk=function(e){var t=o.transformTo(h.uint8array?"uint8array":"array",e.data);if(this.leftOver&&this.leftOver.length){if(h.uint8array){var r=t;(t=new Uint8Array(r.length+this.leftOver.length)).set(this.leftOver,0),t.set(r,this.leftOver.length)}else t=this.leftOver.concat(t);this.leftOver=null}var n=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}(t),i=t;n!==t.length&&(h.uint8array?(i=t.subarray(0,n),this.leftOver=t.subarray(n,t.length)):(i=t.slice(0,n),this.leftOver=t.slice(n,t.length))),this.push({data:s.utf8decode(i),meta:e.meta})},a.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},s.Utf8DecodeWorker=a,o.inherits(l,n),l.prototype.processChunk=function(e){this.push({data:s.utf8encode(e.data),meta:e.meta})},s.Utf8EncodeWorker=l},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(e,t,a){"use strict";var o=e("./support"),h=e("./base64"),r=e("./nodejsUtils"),u=e("./external");function n(e){return e}function l(e,t){for(var r=0;r<e.length;++r)t[r]=255&e.charCodeAt(r);return t}e("setimmediate"),a.newBlob=function(t,r){a.checkSupport("blob");try{return new Blob([t],{type:r})}catch(e){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return n.append(t),n.getBlob(r)}catch(e){throw new Error("Bug : can't construct the Blob.")}}};var i={stringifyByChunk:function(e,t,r){var n=[],i=0,s=e.length;if(s<=r)return String.fromCharCode.apply(null,e);for(;i<s;)"array"===t||"nodebuffer"===t?n.push(String.fromCharCode.apply(null,e.slice(i,Math.min(i+r,s)))):n.push(String.fromCharCode.apply(null,e.subarray(i,Math.min(i+r,s)))),i+=r;return n.join("")},stringifyByChar:function(e){for(var t="",r=0;r<e.length;r++)t+=String.fromCharCode(e[r]);return t},applyCanBeUsed:{uint8array:function(){try{return o.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(e){return!1}}(),nodebuffer:function(){try{return o.nodebuffer&&1===String.fromCharCode.apply(null,r.allocBuffer(1)).length}catch(e){return!1}}()}};function s(e){var t=65536,r=a.getTypeOf(e),n=!0;if("uint8array"===r?n=i.applyCanBeUsed.uint8array:"nodebuffer"===r&&(n=i.applyCanBeUsed.nodebuffer),n)for(;1<t;)try{return i.stringifyByChunk(e,r,t)}catch(e){t=Math.floor(t/2)}return i.stringifyByChar(e)}function f(e,t){for(var r=0;r<e.length;r++)t[r]=e[r];return t}a.applyFromCharCode=s;var c={};c.string={string:n,array:function(e){return l(e,new Array(e.length))},arraybuffer:function(e){return c.string.uint8array(e).buffer},uint8array:function(e){return l(e,new Uint8Array(e.length))},nodebuffer:function(e){return l(e,r.allocBuffer(e.length))}},c.array={string:s,array:n,arraybuffer:function(e){return new Uint8Array(e).buffer},uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(e)}},c.arraybuffer={string:function(e){return s(new Uint8Array(e))},array:function(e){return f(new Uint8Array(e),new Array(e.byteLength))},arraybuffer:n,uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(new Uint8Array(e))}},c.uint8array={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return e.buffer},uint8array:n,nodebuffer:function(e){return r.newBufferFrom(e)}},c.nodebuffer={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return c.nodebuffer.uint8array(e).buffer},uint8array:function(e){return f(e,new Uint8Array(e.length))},nodebuffer:n},a.transformTo=function(e,t){if(t=t||"",!e)return t;a.checkSupport(e);var r=a.getTypeOf(t);return c[r][e](t)},a.resolve=function(e){for(var t=e.split("/"),r=[],n=0;n<t.length;n++){var i=t[n];"."===i||""===i&&0!==n&&n!==t.length-1||(".."===i?r.pop():r.push(i))}return r.join("/")},a.getTypeOf=function(e){return"string"==typeof e?"string":"[object Array]"===Object.prototype.toString.call(e)?"array":o.nodebuffer&&r.isBuffer(e)?"nodebuffer":o.uint8array&&e instanceof Uint8Array?"uint8array":o.arraybuffer&&e instanceof ArrayBuffer?"arraybuffer":void 0},a.checkSupport=function(e){if(!o[e.toLowerCase()])throw new Error(e+" is not supported by this platform")},a.MAX_VALUE_16BITS=65535,a.MAX_VALUE_32BITS=-1,a.pretty=function(e){var t,r,n="";for(r=0;r<(e||"").length;r++)n+="\\x"+((t=e.charCodeAt(r))<16?"0":"")+t.toString(16).toUpperCase();return n},a.delay=function(e,t,r){setImmediate(function(){e.apply(r||null,t||[])})},a.inherits=function(e,t){function r(){}r.prototype=t.prototype,e.prototype=new r},a.extend=function(){var e,t,r={};for(e=0;e<arguments.length;e++)for(t in arguments[e])Object.prototype.hasOwnProperty.call(arguments[e],t)&&void 0===r[t]&&(r[t]=arguments[e][t]);return r},a.prepareContent=function(r,e,n,i,s){return u.Promise.resolve(e).then(function(n){return o.blob&&(n instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(n)))&&"undefined"!=typeof FileReader?new u.Promise(function(t,r){var e=new FileReader;e.onload=function(e){t(e.target.result)},e.onerror=function(e){r(e.target.error)},e.readAsArrayBuffer(n)}):n}).then(function(e){var t=a.getTypeOf(e);return t?("arraybuffer"===t?e=a.transformTo("uint8array",e):"string"===t&&(s?e=h.decode(e):n&&!0!==i&&(e=function(e){return l(e,o.uint8array?new Uint8Array(e.length):new Array(e.length))}(e))),e):u.Promise.reject(new Error("Can't read the data of '"+r+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,setimmediate:54}],33:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),i=e("./utils"),s=e("./signature"),a=e("./zipEntry"),o=e("./support");function h(e){this.files=[],this.loadOptions=e}h.prototype={checkSignature:function(e){if(!this.reader.readAndCheckSignature(e)){this.reader.index-=4;var t=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+i.pretty(t)+", expected "+i.pretty(e)+")")}},isSignature:function(e,t){var r=this.reader.index;this.reader.setIndex(e);var n=this.reader.readString(4)===t;return this.reader.setIndex(r),n},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var e=this.reader.readData(this.zipCommentLength),t=o.uint8array?"uint8array":"array",r=i.transformTo(t,e);this.zipComment=this.loadOptions.decodeFileName(r)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var e,t,r,n=this.zip64EndOfCentralSize-44;0<n;)e=this.reader.readInt(2),t=this.reader.readInt(4),r=this.reader.readData(t),this.zip64ExtensibleData[e]={id:e,length:t,value:r}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var e,t;for(e=0;e<this.files.length;e++)t=this.files[e],this.reader.setIndex(t.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),t.readLocalPart(this.reader),t.handleUTF8(),t.processAttributes()},readCentralDir:function(){var e;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(e=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(e);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var e=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);if(e<0)throw!this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip: can't find end of central directory");this.reader.setIndex(e);var t=e;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===i.MAX_VALUE_16BITS||this.diskWithCentralDirStart===i.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===i.MAX_VALUE_16BITS||this.centralDirRecords===i.MAX_VALUE_16BITS||this.centralDirSize===i.MAX_VALUE_32BITS||this.centralDirOffset===i.MAX_VALUE_32BITS){if(this.zip64=!0,(e=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(e),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var n=t-r;if(0<n)this.isSignature(t,s.CENTRAL_FILE_HEADER)||(this.reader.zero=n);else if(n<0)throw new Error("Corrupted zip: missing "+Math.abs(n)+" bytes.")},prepareReader:function(e){this.reader=n(e)},load:function(e){this.prepareReader(e),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},t.exports=h},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utils":32,"./zipEntry":34}],34:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),s=e("./utils"),i=e("./compressedObject"),a=e("./crc32"),o=e("./utf8"),h=e("./compressions"),u=e("./support");function l(e,t){this.options=e,this.loadOptions=t}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(e){var t,r;if(e.skip(22),this.fileNameLength=e.readInt(2),r=e.readInt(2),this.fileName=e.readData(this.fileNameLength),e.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(t=function(e){for(var t in h)if(Object.prototype.hasOwnProperty.call(h,t)&&h[t].magic===e)return h[t];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new i(this.compressedSize,this.uncompressedSize,this.crc32,t,e.readData(this.compressedSize))},readCentralPart:function(e){this.versionMadeBy=e.readInt(2),e.skip(2),this.bitFlag=e.readInt(2),this.compressionMethod=e.readString(2),this.date=e.readDate(),this.crc32=e.readInt(4),this.compressedSize=e.readInt(4),this.uncompressedSize=e.readInt(4);var t=e.readInt(2);if(this.extraFieldsLength=e.readInt(2),this.fileCommentLength=e.readInt(2),this.diskNumberStart=e.readInt(2),this.internalFileAttributes=e.readInt(2),this.externalFileAttributes=e.readInt(4),this.localHeaderOffset=e.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");e.skip(t),this.readExtraFields(e),this.parseZIP64ExtraField(e),this.fileComment=e.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var e=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0==e&&(this.dosPermissions=63&this.externalFileAttributes),3==e&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(){if(this.extraFields[1]){var e=n(this.extraFields[1].value);this.uncompressedSize===s.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4))}},readExtraFields:function(e){var t,r,n,i=e.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});e.index+4<i;)t=e.readInt(2),r=e.readInt(2),n=e.readData(r),this.extraFields[t]={id:t,length:r,value:n};e.setIndex(i)},handleUTF8:function(){var e=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else{var t=this.findExtraFieldUnicodePath();if(null!==t)this.fileNameStr=t;else{var r=s.transformTo(e,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r)}var n=this.findExtraFieldUnicodeComment();if(null!==n)this.fileCommentStr=n;else{var i=s.transformTo(e,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(i)}}},findExtraFieldUnicodePath:function(){var e=this.extraFields[28789];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileName)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null},findExtraFieldUnicodeComment:function(){var e=this.extraFields[25461];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileComment)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null}},t.exports=l},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(e,t,r){"use strict";function n(e,t,r){this.name=e,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=t,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions}}var s=e("./stream/StreamHelper"),i=e("./stream/DataWorker"),a=e("./utf8"),o=e("./compressedObject"),h=e("./stream/GenericWorker");n.prototype={internalStream:function(e){var t=null,r="string";try{if(!e)throw new Error("No output type specified.");var n="string"===(r=e.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),t=this._decompressWorker();var i=!this._dataBinary;i&&!n&&(t=t.pipe(new a.Utf8EncodeWorker)),!i&&n&&(t=t.pipe(new a.Utf8DecodeWorker))}catch(e){(t=new h("error")).error(e)}return new s(t,r,"")},async:function(e,t){return this.internalStream(e).accumulate(t)},nodeStream:function(e,t){return this.internalStream(e||"nodebuffer").toNodejsStream(t)},_compressWorker:function(e,t){if(this._data instanceof o&&this._data.compression.magic===e.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new a.Utf8EncodeWorker)),o.createWorkerFrom(r,e,t)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof h?this._data:new i(this._data)}};for(var u=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],l=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},f=0;f<u.length;f++)n.prototype[u[f]]=l;t.exports=n},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(e,l,t){(function(t){"use strict";var r,n,e=t.MutationObserver||t.WebKitMutationObserver;if(e){var i=0,s=new e(u),a=t.document.createTextNode("");s.observe(a,{characterData:!0}),r=function(){a.data=i=++i%2}}else if(t.setImmediate||void 0===t.MessageChannel)r="document"in t&&"onreadystatechange"in t.document.createElement("script")?function(){var e=t.document.createElement("script");e.onreadystatechange=function(){u(),e.onreadystatechange=null,e.parentNode.removeChild(e),e=null},t.document.documentElement.appendChild(e)}:function(){setTimeout(u,0)};else{var o=new t.MessageChannel;o.port1.onmessage=u,r=function(){o.port2.postMessage(0)}}var h=[];function u(){var e,t;n=!0;for(var r=h.length;r;){for(t=h,h=[],e=-1;++e<r;)t[e]();r=h.length}n=!1}l.exports=function(e){1!==h.push(e)||n||r()}}).call(this,"undefined"!=typeof __webpack_require__.g?__webpack_require__.g:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],37:[function(e,t,r){"use strict";var i=e("immediate");function u(){}var l={},s=["REJECTED"],a=["FULFILLED"],n=["PENDING"];function o(e){if("function"!=typeof e)throw new TypeError("resolver must be a function");this.state=n,this.queue=[],this.outcome=void 0,e!==u&&d(this,e)}function h(e,t,r){this.promise=e,"function"==typeof t&&(this.onFulfilled=t,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected)}function f(t,r,n){i(function(){var e;try{e=r(n)}catch(e){return l.reject(t,e)}e===t?l.reject(t,new TypeError("Cannot resolve promise with itself")):l.resolve(t,e)})}function c(e){var t=e&&e.then;if(e&&("object"==typeof e||"function"==typeof e)&&"function"==typeof t)return function(){t.apply(e,arguments)}}function d(t,e){var r=!1;function n(e){r||(r=!0,l.reject(t,e))}function i(e){r||(r=!0,l.resolve(t,e))}var s=p(function(){e(i,n)});"error"===s.status&&n(s.value)}function p(e,t){var r={};try{r.value=e(t),r.status="success"}catch(e){r.status="error",r.value=e}return r}(t.exports=o).prototype.finally=function(t){if("function"!=typeof t)return this;var r=this.constructor;return this.then(function(e){return r.resolve(t()).then(function(){return e})},function(e){return r.resolve(t()).then(function(){throw e})})},o.prototype.catch=function(e){return this.then(null,e)},o.prototype.then=function(e,t){if("function"!=typeof e&&this.state===a||"function"!=typeof t&&this.state===s)return this;var r=new this.constructor(u);this.state!==n?f(r,this.state===a?e:t,this.outcome):this.queue.push(new h(r,e,t));return r},h.prototype.callFulfilled=function(e){l.resolve(this.promise,e)},h.prototype.otherCallFulfilled=function(e){f(this.promise,this.onFulfilled,e)},h.prototype.callRejected=function(e){l.reject(this.promise,e)},h.prototype.otherCallRejected=function(e){f(this.promise,this.onRejected,e)},l.resolve=function(e,t){var r=p(c,t);if("error"===r.status)return l.reject(e,r.value);var n=r.value;if(n)d(e,n);else{e.state=a,e.outcome=t;for(var i=-1,s=e.queue.length;++i<s;)e.queue[i].callFulfilled(t)}return e},l.reject=function(e,t){e.state=s,e.outcome=t;for(var r=-1,n=e.queue.length;++r<n;)e.queue[r].callRejected(t);return e},o.resolve=function(e){if(e instanceof this)return e;return l.resolve(new this(u),e)},o.reject=function(e){var t=new this(u);return l.reject(t,e)},o.all=function(e){var r=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var n=e.length,i=!1;if(!n)return this.resolve([]);var s=new Array(n),a=0,t=-1,o=new this(u);for(;++t<n;)h(e[t],t);return o;function h(e,t){r.resolve(e).then(function(e){s[t]=e,++a!==n||i||(i=!0,l.resolve(o,s))},function(e){i||(i=!0,l.reject(o,e))})}},o.race=function(e){var t=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var r=e.length,n=!1;if(!r)return this.resolve([]);var i=-1,s=new this(u);for(;++i<r;)a=e[i],t.resolve(a).then(function(e){n||(n=!0,l.resolve(s,e))},function(e){n||(n=!0,l.reject(s,e))});var a;return s}},{immediate:36}],38:[function(e,t,r){"use strict";var n={};(0,e("./lib/utils/common").assign)(n,e("./lib/deflate"),e("./lib/inflate"),e("./lib/zlib/constants")),t.exports=n},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(e,t,r){"use strict";var a=e("./zlib/deflate"),o=e("./utils/common"),h=e("./utils/strings"),i=e("./zlib/messages"),s=e("./zlib/zstream"),u=Object.prototype.toString,l=0,f=-1,c=0,d=8;function p(e){if(!(this instanceof p))return new p(e);this.options=o.assign({level:f,method:d,chunkSize:16384,windowBits:15,memLevel:8,strategy:c,to:""},e||{});var t=this.options;t.raw&&0<t.windowBits?t.windowBits=-t.windowBits:t.gzip&&0<t.windowBits&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new s,this.strm.avail_out=0;var r=a.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(r!==l)throw new Error(i[r]);if(t.header&&a.deflateSetHeader(this.strm,t.header),t.dictionary){var n;if(n="string"==typeof t.dictionary?h.string2buf(t.dictionary):"[object ArrayBuffer]"===u.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,(r=a.deflateSetDictionary(this.strm,n))!==l)throw new Error(i[r]);this._dict_set=!0}}function n(e,t){var r=new p(t);if(r.push(e,!0),r.err)throw r.msg||i[r.err];return r.result}p.prototype.push=function(e,t){var r,n,i=this.strm,s=this.options.chunkSize;if(this.ended)return!1;n=t===~~t?t:!0===t?4:0,"string"==typeof e?i.input=h.string2buf(e):"[object ArrayBuffer]"===u.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;do{if(0===i.avail_out&&(i.output=new o.Buf8(s),i.next_out=0,i.avail_out=s),1!==(r=a.deflate(i,n))&&r!==l)return this.onEnd(r),!(this.ended=!0);0!==i.avail_out&&(0!==i.avail_in||4!==n&&2!==n)||("string"===this.options.to?this.onData(h.buf2binstring(o.shrinkBuf(i.output,i.next_out))):this.onData(o.shrinkBuf(i.output,i.next_out)))}while((0<i.avail_in||0===i.avail_out)&&1!==r);return 4===n?(r=a.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===l):2!==n||(this.onEnd(l),!(i.avail_out=0))},p.prototype.onData=function(e){this.chunks.push(e)},p.prototype.onEnd=function(e){e===l&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Deflate=p,r.deflate=n,r.deflateRaw=function(e,t){return(t=t||{}).raw=!0,n(e,t)},r.gzip=function(e,t){return(t=t||{}).gzip=!0,n(e,t)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(e,t,r){"use strict";var c=e("./zlib/inflate"),d=e("./utils/common"),p=e("./utils/strings"),m=e("./zlib/constants"),n=e("./zlib/messages"),i=e("./zlib/zstream"),s=e("./zlib/gzheader"),_=Object.prototype.toString;function a(e){if(!(this instanceof a))return new a(e);this.options=d.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&0<=t.windowBits&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(0<=t.windowBits&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),15<t.windowBits&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new i,this.strm.avail_out=0;var r=c.inflateInit2(this.strm,t.windowBits);if(r!==m.Z_OK)throw new Error(n[r]);this.header=new s,c.inflateGetHeader(this.strm,this.header)}function o(e,t){var r=new a(t);if(r.push(e,!0),r.err)throw r.msg||n[r.err];return r.result}a.prototype.push=function(e,t){var r,n,i,s,a,o,h=this.strm,u=this.options.chunkSize,l=this.options.dictionary,f=!1;if(this.ended)return!1;n=t===~~t?t:!0===t?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof e?h.input=p.binstring2buf(e):"[object ArrayBuffer]"===_.call(e)?h.input=new Uint8Array(e):h.input=e,h.next_in=0,h.avail_in=h.input.length;do{if(0===h.avail_out&&(h.output=new d.Buf8(u),h.next_out=0,h.avail_out=u),(r=c.inflate(h,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&l&&(o="string"==typeof l?p.string2buf(l):"[object ArrayBuffer]"===_.call(l)?new Uint8Array(l):l,r=c.inflateSetDictionary(this.strm,o)),r===m.Z_BUF_ERROR&&!0===f&&(r=m.Z_OK,f=!1),r!==m.Z_STREAM_END&&r!==m.Z_OK)return this.onEnd(r),!(this.ended=!0);h.next_out&&(0!==h.avail_out&&r!==m.Z_STREAM_END&&(0!==h.avail_in||n!==m.Z_FINISH&&n!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(i=p.utf8border(h.output,h.next_out),s=h.next_out-i,a=p.buf2string(h.output,i),h.next_out=s,h.avail_out=u-s,s&&d.arraySet(h.output,h.output,i,s,0),this.onData(a)):this.onData(d.shrinkBuf(h.output,h.next_out)))),0===h.avail_in&&0===h.avail_out&&(f=!0)}while((0<h.avail_in||0===h.avail_out)&&r!==m.Z_STREAM_END);return r===m.Z_STREAM_END&&(n=m.Z_FINISH),n===m.Z_FINISH?(r=c.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===m.Z_OK):n!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(h.avail_out=0))},a.prototype.onData=function(e){this.chunks.push(e)},a.prototype.onEnd=function(e){e===m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=d.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Inflate=a,r.inflate=o,r.inflateRaw=function(e,t){return(t=t||{}).raw=!0,o(e,t)},r.ungzip=o},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;r.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var r=t.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var n in r)r.hasOwnProperty(n)&&(e[n]=r[n])}}return e},r.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var i={arraySet:function(e,t,r,n,i){if(t.subarray&&e.subarray)e.set(t.subarray(r,r+n),i);else for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){var t,r,n,i,s,a;for(t=n=0,r=e.length;t<r;t++)n+=e[t].length;for(a=new Uint8Array(n),t=i=0,r=e.length;t<r;t++)s=e[t],a.set(s,i),i+=s.length;return a}},s={arraySet:function(e,t,r,n,i){for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){return[].concat.apply([],e)}};r.setTyped=function(e){e?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,i)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s))},r.setTyped(n)},{}],42:[function(e,t,r){"use strict";var h=e("./common"),i=!0,s=!0;try{String.fromCharCode.apply(null,[0])}catch(e){i=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){s=!1}for(var u=new h.Buf8(256),n=0;n<256;n++)u[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;function l(e,t){if(t<65537&&(e.subarray&&s||!e.subarray&&i))return String.fromCharCode.apply(null,h.shrinkBuf(e,t));for(var r="",n=0;n<t;n++)r+=String.fromCharCode(e[n]);return r}u[254]=u[254]=1,r.string2buf=function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=new h.Buf8(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t},r.buf2binstring=function(e){return l(e,e.length)},r.binstring2buf=function(e){for(var t=new h.Buf8(e.length),r=0,n=t.length;r<n;r++)t[r]=e.charCodeAt(r);return t},r.buf2string=function(e,t){var r,n,i,s,a=t||e.length,o=new Array(2*a);for(r=n=0;r<a;)if((i=e[r++])<128)o[n++]=i;else if(4<(s=u[i]))o[n++]=65533,r+=s-1;else{for(i&=2===s?31:3===s?15:7;1<s&&r<a;)i=i<<6|63&e[r++],s--;1<s?o[n++]=65533:i<65536?o[n++]=i:(i-=65536,o[n++]=55296|i>>10&1023,o[n++]=56320|1023&i)}return l(o,n)},r.utf8border=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}},{"./common":41}],43:[function(e,t,r){"use strict";t.exports=function(e,t,r,n){for(var i=65535&e|0,s=e>>>16&65535|0,a=0;0!==r;){for(r-=a=2e3<r?2e3:r;s=s+(i=i+t[n++]|0)|0,--a;);i%=65521,s%=65521}return i|s<<16|0}},{}],44:[function(e,t,r){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(e,t,r){"use strict";var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}},{}],46:[function(e,t,r){"use strict";var h,c=e("../utils/common"),u=e("./trees"),d=e("./adler32"),p=e("./crc32"),n=e("./messages"),l=0,f=4,m=0,_=-2,g=-1,b=4,i=2,v=8,y=9,s=286,a=30,o=19,w=2*s+1,k=15,x=3,S=258,z=S+x+1,C=42,E=113,A=1,I=2,O=3,B=4;function R(e,t){return e.msg=n[t],t}function T(e){return(e<<1)-(4<e?9:0)}function D(e){for(var t=e.length;0<=--t;)e[t]=0}function F(e){var t=e.state,r=t.pending;r>e.avail_out&&(r=e.avail_out),0!==r&&(c.arraySet(e.output,t.pending_buf,t.pending_out,r,e.next_out),e.next_out+=r,t.pending_out+=r,e.total_out+=r,e.avail_out-=r,t.pending-=r,0===t.pending&&(t.pending_out=0))}function N(e,t){u._tr_flush_block(e,0<=e.block_start?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,F(e.strm)}function U(e,t){e.pending_buf[e.pending++]=t}function P(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function L(e,t){var r,n,i=e.max_chain_length,s=e.strstart,a=e.prev_length,o=e.nice_match,h=e.strstart>e.w_size-z?e.strstart-(e.w_size-z):0,u=e.window,l=e.w_mask,f=e.prev,c=e.strstart+S,d=u[s+a-1],p=u[s+a];e.prev_length>=e.good_match&&(i>>=2),o>e.lookahead&&(o=e.lookahead);do{if(u[(r=t)+a]===p&&u[r+a-1]===d&&u[r]===u[s]&&u[++r]===u[s+1]){s+=2,r++;do{}while(u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&s<c);if(n=S-(c-s),s=c-S,a<n){if(e.match_start=t,o<=(a=n))break;d=u[s+a-1],p=u[s+a]}}}while((t=f[t&l])>h&&0!=--i);return a<=e.lookahead?a:e.lookahead}function j(e){var t,r,n,i,s,a,o,h,u,l,f=e.w_size;do{if(i=e.window_size-e.lookahead-e.strstart,e.strstart>=f+(f-z)){for(c.arraySet(e.window,e.window,f,f,0),e.match_start-=f,e.strstart-=f,e.block_start-=f,t=r=e.hash_size;n=e.head[--t],e.head[t]=f<=n?n-f:0,--r;);for(t=r=f;n=e.prev[--t],e.prev[t]=f<=n?n-f:0,--r;);i+=f}if(0===e.strm.avail_in)break;if(a=e.strm,o=e.window,h=e.strstart+e.lookahead,u=i,l=void 0,l=a.avail_in,u<l&&(l=u),r=0===l?0:(a.avail_in-=l,c.arraySet(o,a.input,a.next_in,l,h),1===a.state.wrap?a.adler=d(a.adler,o,l,h):2===a.state.wrap&&(a.adler=p(a.adler,o,l,h)),a.next_in+=l,a.total_in+=l,l),e.lookahead+=r,e.lookahead+e.insert>=x)for(s=e.strstart-e.insert,e.ins_h=e.window[s],e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+x-1])&e.hash_mask,e.prev[s&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=s,s++,e.insert--,!(e.lookahead+e.insert<x)););}while(e.lookahead<z&&0!==e.strm.avail_in)}function Z(e,t){for(var r,n;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==r&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r)),e.match_length>=x)if(n=u._tr_tally(e,e.strstart-e.match_start,e.match_length-x),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=x){for(e.match_length--;e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart,0!=--e.match_length;);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else n=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(n&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function W(e,t){for(var r,n,i;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=x-1,0!==r&&e.prev_length<e.max_lazy_match&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r),e.match_length<=5&&(1===e.strategy||e.match_length===x&&4096<e.strstart-e.match_start)&&(e.match_length=x-1)),e.prev_length>=x&&e.match_length<=e.prev_length){for(i=e.strstart+e.lookahead-x,n=u._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-x),e.lookahead-=e.prev_length-1,e.prev_length-=2;++e.strstart<=i&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!=--e.prev_length;);if(e.match_available=0,e.match_length=x-1,e.strstart++,n&&(N(e,!1),0===e.strm.avail_out))return A}else if(e.match_available){if((n=u._tr_tally(e,0,e.window[e.strstart-1]))&&N(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return A}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(n=u._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function M(e,t,r,n,i){this.good_length=e,this.max_lazy=t,this.nice_length=r,this.max_chain=n,this.func=i}function H(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=v,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new c.Buf16(2*w),this.dyn_dtree=new c.Buf16(2*(2*a+1)),this.bl_tree=new c.Buf16(2*(2*o+1)),D(this.dyn_ltree),D(this.dyn_dtree),D(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new c.Buf16(k+1),this.heap=new c.Buf16(2*s+1),D(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new c.Buf16(2*s+1),D(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function G(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=i,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?C:E,e.adler=2===t.wrap?0:1,t.last_flush=l,u._tr_init(t),m):R(e,_)}function K(e){var t=G(e);return t===m&&function(e){e.window_size=2*e.w_size,D(e.head),e.max_lazy_match=h[e.level].max_lazy,e.good_match=h[e.level].good_length,e.nice_match=h[e.level].nice_length,e.max_chain_length=h[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=x-1,e.match_available=0,e.ins_h=0}(e.state),t}function Y(e,t,r,n,i,s){if(!e)return _;var a=1;if(t===g&&(t=6),n<0?(a=0,n=-n):15<n&&(a=2,n-=16),i<1||y<i||r!==v||n<8||15<n||t<0||9<t||s<0||b<s)return R(e,_);8===n&&(n=9);var o=new H;return(e.state=o).strm=e,o.wrap=a,o.gzhead=null,o.w_bits=n,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=i+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+x-1)/x),o.window=new c.Buf8(2*o.w_size),o.head=new c.Buf16(o.hash_size),o.prev=new c.Buf16(o.w_size),o.lit_bufsize=1<<i+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new c.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=t,o.strategy=s,o.method=r,K(e)}h=[new M(0,0,0,0,function(e,t){var r=65535;for(r>e.pending_buf_size-5&&(r=e.pending_buf_size-5);;){if(e.lookahead<=1){if(j(e),0===e.lookahead&&t===l)return A;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var n=e.block_start+r;if((0===e.strstart||e.strstart>=n)&&(e.lookahead=e.strstart-n,e.strstart=n,N(e,!1),0===e.strm.avail_out))return A;if(e.strstart-e.block_start>=e.w_size-z&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):(e.strstart>e.block_start&&(N(e,!1),e.strm.avail_out),A)}),new M(4,4,8,4,Z),new M(4,5,16,8,Z),new M(4,6,32,32,Z),new M(4,4,16,16,W),new M(8,16,32,32,W),new M(8,16,128,128,W),new M(8,32,128,256,W),new M(32,128,258,1024,W),new M(32,258,258,4096,W)],r.deflateInit=function(e,t){return Y(e,t,v,15,8,0)},r.deflateInit2=Y,r.deflateReset=K,r.deflateResetKeep=G,r.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?_:(e.state.gzhead=t,m):_},r.deflate=function(e,t){var r,n,i,s;if(!e||!e.state||5<t||t<0)return e?R(e,_):_;if(n=e.state,!e.output||!e.input&&0!==e.avail_in||666===n.status&&t!==f)return R(e,0===e.avail_out?-5:_);if(n.strm=e,r=n.last_flush,n.last_flush=t,n.status===C)if(2===n.wrap)e.adler=0,U(n,31),U(n,139),U(n,8),n.gzhead?(U(n,(n.gzhead.text?1:0)+(n.gzhead.hcrc?2:0)+(n.gzhead.extra?4:0)+(n.gzhead.name?8:0)+(n.gzhead.comment?16:0)),U(n,255&n.gzhead.time),U(n,n.gzhead.time>>8&255),U(n,n.gzhead.time>>16&255),U(n,n.gzhead.time>>24&255),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,255&n.gzhead.os),n.gzhead.extra&&n.gzhead.extra.length&&(U(n,255&n.gzhead.extra.length),U(n,n.gzhead.extra.length>>8&255)),n.gzhead.hcrc&&(e.adler=p(e.adler,n.pending_buf,n.pending,0)),n.gzindex=0,n.status=69):(U(n,0),U(n,0),U(n,0),U(n,0),U(n,0),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,3),n.status=E);else{var a=v+(n.w_bits-8<<4)<<8;a|=(2<=n.strategy||n.level<2?0:n.level<6?1:6===n.level?2:3)<<6,0!==n.strstart&&(a|=32),a+=31-a%31,n.status=E,P(n,a),0!==n.strstart&&(P(n,e.adler>>>16),P(n,65535&e.adler)),e.adler=1}if(69===n.status)if(n.gzhead.extra){for(i=n.pending;n.gzindex<(65535&n.gzhead.extra.length)&&(n.pending!==n.pending_buf_size||(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending!==n.pending_buf_size));)U(n,255&n.gzhead.extra[n.gzindex]),n.gzindex++;n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),n.gzindex===n.gzhead.extra.length&&(n.gzindex=0,n.status=73)}else n.status=73;if(73===n.status)if(n.gzhead.name){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.name.length?255&n.gzhead.name.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.gzindex=0,n.status=91)}else n.status=91;if(91===n.status)if(n.gzhead.comment){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.comment.length?255&n.gzhead.comment.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.status=103)}else n.status=103;if(103===n.status&&(n.gzhead.hcrc?(n.pending+2>n.pending_buf_size&&F(e),n.pending+2<=n.pending_buf_size&&(U(n,255&e.adler),U(n,e.adler>>8&255),e.adler=0,n.status=E)):n.status=E),0!==n.pending){if(F(e),0===e.avail_out)return n.last_flush=-1,m}else if(0===e.avail_in&&T(t)<=T(r)&&t!==f)return R(e,-5);if(666===n.status&&0!==e.avail_in)return R(e,-5);if(0!==e.avail_in||0!==n.lookahead||t!==l&&666!==n.status){var o=2===n.strategy?function(e,t){for(var r;;){if(0===e.lookahead&&(j(e),0===e.lookahead)){if(t===l)return A;break}if(e.match_length=0,r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):3===n.strategy?function(e,t){for(var r,n,i,s,a=e.window;;){if(e.lookahead<=S){if(j(e),e.lookahead<=S&&t===l)return A;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=x&&0<e.strstart&&(n=a[i=e.strstart-1])===a[++i]&&n===a[++i]&&n===a[++i]){s=e.strstart+S;do{}while(n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&i<s);e.match_length=S-(s-i),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=x?(r=u._tr_tally(e,1,e.match_length-x),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):h[n.level].func(n,t);if(o!==O&&o!==B||(n.status=666),o===A||o===O)return 0===e.avail_out&&(n.last_flush=-1),m;if(o===I&&(1===t?u._tr_align(n):5!==t&&(u._tr_stored_block(n,0,0,!1),3===t&&(D(n.head),0===n.lookahead&&(n.strstart=0,n.block_start=0,n.insert=0))),F(e),0===e.avail_out))return n.last_flush=-1,m}return t!==f?m:n.wrap<=0?1:(2===n.wrap?(U(n,255&e.adler),U(n,e.adler>>8&255),U(n,e.adler>>16&255),U(n,e.adler>>24&255),U(n,255&e.total_in),U(n,e.total_in>>8&255),U(n,e.total_in>>16&255),U(n,e.total_in>>24&255)):(P(n,e.adler>>>16),P(n,65535&e.adler)),F(e),0<n.wrap&&(n.wrap=-n.wrap),0!==n.pending?m:1)},r.deflateEnd=function(e){var t;return e&&e.state?(t=e.state.status)!==C&&69!==t&&73!==t&&91!==t&&103!==t&&t!==E&&666!==t?R(e,_):(e.state=null,t===E?R(e,-3):m):_},r.deflateSetDictionary=function(e,t){var r,n,i,s,a,o,h,u,l=t.length;if(!e||!e.state)return _;if(2===(s=(r=e.state).wrap)||1===s&&r.status!==C||r.lookahead)return _;for(1===s&&(e.adler=d(e.adler,t,l,0)),r.wrap=0,l>=r.w_size&&(0===s&&(D(r.head),r.strstart=0,r.block_start=0,r.insert=0),u=new c.Buf8(r.w_size),c.arraySet(u,t,l-r.w_size,r.w_size,0),t=u,l=r.w_size),a=e.avail_in,o=e.next_in,h=e.input,e.avail_in=l,e.next_in=0,e.input=t,j(r);r.lookahead>=x;){for(n=r.strstart,i=r.lookahead-(x-1);r.ins_h=(r.ins_h<<r.hash_shift^r.window[n+x-1])&r.hash_mask,r.prev[n&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=n,n++,--i;);r.strstart=n,r.lookahead=x-1,j(r)}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=x-1,r.match_available=0,e.next_in=o,e.input=h,e.avail_in=a,r.wrap=s,m},r.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(e,t,r){"use strict";t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(e,t,r){"use strict";t.exports=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C;r=e.state,n=e.next_in,z=e.input,i=n+(e.avail_in-5),s=e.next_out,C=e.output,a=s-(t-e.avail_out),o=s+(e.avail_out-257),h=r.dmax,u=r.wsize,l=r.whave,f=r.wnext,c=r.window,d=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,b=(1<<r.distbits)-1;e:do{p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=m[d&g];t:for(;;){if(d>>>=y=v>>>24,p-=y,0===(y=v>>>16&255))C[s++]=65535&v;else{if(!(16&y)){if(0==(64&y)){v=m[(65535&v)+(d&(1<<y)-1)];continue t}if(32&y){r.mode=12;break e}e.msg="invalid literal/length code",r.mode=30;break e}w=65535&v,(y&=15)&&(p<y&&(d+=z[n++]<<p,p+=8),w+=d&(1<<y)-1,d>>>=y,p-=y),p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=_[d&b];r:for(;;){if(d>>>=y=v>>>24,p-=y,!(16&(y=v>>>16&255))){if(0==(64&y)){v=_[(65535&v)+(d&(1<<y)-1)];continue r}e.msg="invalid distance code",r.mode=30;break e}if(k=65535&v,p<(y&=15)&&(d+=z[n++]<<p,(p+=8)<y&&(d+=z[n++]<<p,p+=8)),h<(k+=d&(1<<y)-1)){e.msg="invalid distance too far back",r.mode=30;break e}if(d>>>=y,p-=y,(y=s-a)<k){if(l<(y=k-y)&&r.sane){e.msg="invalid distance too far back",r.mode=30;break e}if(S=c,(x=0)===f){if(x+=u-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}}else if(f<y){if(x+=u+f-y,(y-=f)<w){for(w-=y;C[s++]=c[x++],--y;);if(x=0,f<w){for(w-=y=f;C[s++]=c[x++],--y;);x=s-k,S=C}}}else if(x+=f-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}for(;2<w;)C[s++]=S[x++],C[s++]=S[x++],C[s++]=S[x++],w-=3;w&&(C[s++]=S[x++],1<w&&(C[s++]=S[x++]))}else{for(x=s-k;C[s++]=C[x++],C[s++]=C[x++],C[s++]=C[x++],2<(w-=3););w&&(C[s++]=C[x++],1<w&&(C[s++]=C[x++]))}break}}break}}while(n<i&&s<o);n-=w=p>>3,d&=(1<<(p-=w<<3))-1,e.next_in=n,e.next_out=s,e.avail_in=n<i?i-n+5:5-(n-i),e.avail_out=s<o?o-s+257:257-(s-o),r.hold=d,r.bits=p}},{}],49:[function(e,t,r){"use strict";var I=e("../utils/common"),O=e("./adler32"),B=e("./crc32"),R=e("./inffast"),T=e("./inftrees"),D=1,F=2,N=0,U=-2,P=1,n=852,i=592;function L(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function s(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new I.Buf16(320),this.work=new I.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function a(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=P,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new I.Buf32(n),t.distcode=t.distdyn=new I.Buf32(i),t.sane=1,t.back=-1,N):U}function o(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,a(e)):U}function h(e,t){var r,n;return e&&e.state?(n=e.state,t<0?(r=0,t=-t):(r=1+(t>>4),t<48&&(t&=15)),t&&(t<8||15<t)?U:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=r,n.wbits=t,o(e))):U}function u(e,t){var r,n;return e?(n=new s,(e.state=n).window=null,(r=h(e,t))!==N&&(e.state=null),r):U}var l,f,c=!0;function j(e){if(c){var t;for(l=new I.Buf32(512),f=new I.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(T(D,e.lens,0,288,l,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;T(F,e.lens,0,32,f,0,e.work,{bits:5}),c=!1}e.lencode=l,e.lenbits=9,e.distcode=f,e.distbits=5}function Z(e,t,r,n){var i,s=e.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new I.Buf8(s.wsize)),n>=s.wsize?(I.arraySet(s.window,t,r-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):(n<(i=s.wsize-s.wnext)&&(i=n),I.arraySet(s.window,t,r-n,i,s.wnext),(n-=i)?(I.arraySet(s.window,t,r-n,n,0),s.wnext=n,s.whave=s.wsize):(s.wnext+=i,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=i))),0}r.inflateReset=o,r.inflateReset2=h,r.inflateResetKeep=a,r.inflateInit=function(e){return u(e,15)},r.inflateInit2=u,r.inflate=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C=0,E=new I.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return U;12===(r=e.state).mode&&(r.mode=13),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,f=o,c=h,x=N;e:for(;;)switch(r.mode){case P:if(0===r.wrap){r.mode=13;break}for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(2&r.wrap&&35615===u){E[r.check=0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0),l=u=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&u)<<8)+(u>>8))%31){e.msg="incorrect header check",r.mode=30;break}if(8!=(15&u)){e.msg="unknown compression method",r.mode=30;break}if(l-=4,k=8+(15&(u>>>=4)),0===r.wbits)r.wbits=k;else if(k>r.wbits){e.msg="invalid window size",r.mode=30;break}r.dmax=1<<k,e.adler=r.check=1,r.mode=512&u?10:12,l=u=0;break;case 2:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.flags=u,8!=(255&r.flags)){e.msg="unknown compression method",r.mode=30;break}if(57344&r.flags){e.msg="unknown header flags set",r.mode=30;break}r.head&&(r.head.text=u>>8&1),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=3;case 3:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.time=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,E[2]=u>>>16&255,E[3]=u>>>24&255,r.check=B(r.check,E,4,0)),l=u=0,r.mode=4;case 4:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.xflags=255&u,r.head.os=u>>8),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=5;case 5:if(1024&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length=u,r.head&&(r.head.extra_len=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&(o<(d=r.length)&&(d=o),d&&(r.head&&(k=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),I.arraySet(r.head.extra,n,s,d,k)),512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,r.length-=d),r.length))break e;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.name+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.comment+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(65535&r.check)){e.msg="header crc mismatch",r.mode=30;break}l=u=0}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),e.adler=r.check=0,r.mode=12;break;case 10:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}e.adler=r.check=L(u),l=u=0,r.mode=11;case 11:if(0===r.havedict)return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,2;e.adler=r.check=1,r.mode=12;case 12:if(5===t||6===t)break e;case 13:if(r.last){u>>>=7&l,l-=7&l,r.mode=27;break}for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}switch(r.last=1&u,l-=1,3&(u>>>=1)){case 0:r.mode=14;break;case 1:if(j(r),r.mode=20,6!==t)break;u>>>=2,l-=2;break e;case 2:r.mode=17;break;case 3:e.msg="invalid block type",r.mode=30}u>>>=2,l-=2;break;case 14:for(u>>>=7&l,l-=7&l;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if((65535&u)!=(u>>>16^65535)){e.msg="invalid stored block lengths",r.mode=30;break}if(r.length=65535&u,l=u=0,r.mode=15,6===t)break e;case 15:r.mode=16;case 16:if(d=r.length){if(o<d&&(d=o),h<d&&(d=h),0===d)break e;I.arraySet(i,n,s,d,a),o-=d,s+=d,h-=d,a+=d,r.length-=d;break}r.mode=12;break;case 17:for(;l<14;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.nlen=257+(31&u),u>>>=5,l-=5,r.ndist=1+(31&u),u>>>=5,l-=5,r.ncode=4+(15&u),u>>>=4,l-=4,286<r.nlen||30<r.ndist){e.msg="too many length or distance symbols",r.mode=30;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.lens[A[r.have++]]=7&u,u>>>=3,l-=3}for(;r.have<19;)r.lens[A[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,S={bits:r.lenbits},x=T(0,r.lens,0,19,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid code lengths set",r.mode=30;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(b<16)u>>>=_,l-=_,r.lens[r.have++]=b;else{if(16===b){for(z=_+2;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u>>>=_,l-=_,0===r.have){e.msg="invalid bit length repeat",r.mode=30;break}k=r.lens[r.have-1],d=3+(3&u),u>>>=2,l-=2}else if(17===b){for(z=_+3;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=3+(7&(u>>>=_)),u>>>=3,l-=3}else{for(z=_+7;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=11+(127&(u>>>=_)),u>>>=7,l-=7}if(r.have+d>r.nlen+r.ndist){e.msg="invalid bit length repeat",r.mode=30;break}for(;d--;)r.lens[r.have++]=k}}if(30===r.mode)break;if(0===r.lens[256]){e.msg="invalid code -- missing end-of-block",r.mode=30;break}if(r.lenbits=9,S={bits:r.lenbits},x=T(D,r.lens,0,r.nlen,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid literal/lengths set",r.mode=30;break}if(r.distbits=6,r.distcode=r.distdyn,S={bits:r.distbits},x=T(F,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,S),r.distbits=S.bits,x){e.msg="invalid distances set",r.mode=30;break}if(r.mode=20,6===t)break e;case 20:r.mode=21;case 21:if(6<=o&&258<=h){e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,R(e,c),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,12===r.mode&&(r.back=-1);break}for(r.back=0;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(g&&0==(240&g)){for(v=_,y=g,w=b;g=(C=r.lencode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,r.length=b,0===g){r.mode=26;break}if(32&g){r.back=-1,r.mode=12;break}if(64&g){e.msg="invalid literal/length code",r.mode=30;break}r.extra=15&g,r.mode=22;case 22:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}r.was=r.length,r.mode=23;case 23:for(;g=(C=r.distcode[u&(1<<r.distbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(0==(240&g)){for(v=_,y=g,w=b;g=(C=r.distcode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,64&g){e.msg="invalid distance code",r.mode=30;break}r.offset=b,r.extra=15&g,r.mode=24;case 24:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.offset+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}if(r.offset>r.dmax){e.msg="invalid distance too far back",r.mode=30;break}r.mode=25;case 25:if(0===h)break e;if(d=c-h,r.offset>d){if((d=r.offset-d)>r.whave&&r.sane){e.msg="invalid distance too far back",r.mode=30;break}p=d>r.wnext?(d-=r.wnext,r.wsize-d):r.wnext-d,d>r.length&&(d=r.length),m=r.window}else m=i,p=a-r.offset,d=r.length;for(h<d&&(d=h),h-=d,r.length-=d;i[a++]=m[p++],--d;);0===r.length&&(r.mode=21);break;case 26:if(0===h)break e;i[a++]=r.length,h--,r.mode=21;break;case 27:if(r.wrap){for(;l<32;){if(0===o)break e;o--,u|=n[s++]<<l,l+=8}if(c-=h,e.total_out+=c,r.total+=c,c&&(e.adler=r.check=r.flags?B(r.check,i,c,a-c):O(r.check,i,c,a-c)),c=h,(r.flags?u:L(u))!==r.check){e.msg="incorrect data check",r.mode=30;break}l=u=0}r.mode=28;case 28:if(r.wrap&&r.flags){for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(4294967295&r.total)){e.msg="incorrect length check",r.mode=30;break}l=u=0}r.mode=29;case 29:x=1;break e;case 30:x=-3;break e;case 31:return-4;case 32:default:return U}return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,(r.wsize||c!==e.avail_out&&r.mode<30&&(r.mode<27||4!==t))&&Z(e,e.output,e.next_out,c-e.avail_out)?(r.mode=31,-4):(f-=e.avail_in,c-=e.avail_out,e.total_in+=f,e.total_out+=c,r.total+=c,r.wrap&&c&&(e.adler=r.check=r.flags?B(r.check,i,c,e.next_out-c):O(r.check,i,c,e.next_out-c)),e.data_type=r.bits+(r.last?64:0)+(12===r.mode?128:0)+(20===r.mode||15===r.mode?256:0),(0==f&&0===c||4===t)&&x===N&&(x=-5),x)},r.inflateEnd=function(e){if(!e||!e.state)return U;var t=e.state;return t.window&&(t.window=null),e.state=null,N},r.inflateGetHeader=function(e,t){var r;return e&&e.state?0==(2&(r=e.state).wrap)?U:((r.head=t).done=!1,N):U},r.inflateSetDictionary=function(e,t){var r,n=t.length;return e&&e.state?0!==(r=e.state).wrap&&11!==r.mode?U:11===r.mode&&O(1,t,n,0)!==r.check?-3:Z(e,t,n,n)?(r.mode=31,-4):(r.havedict=1,N):U},r.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(e,t,r){"use strict";var D=e("../utils/common"),F=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],N=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],P=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,r,n,i,s,a,o){var h,u,l,f,c,d,p,m,_,g=o.bits,b=0,v=0,y=0,w=0,k=0,x=0,S=0,z=0,C=0,E=0,A=null,I=0,O=new D.Buf16(16),B=new D.Buf16(16),R=null,T=0;for(b=0;b<=15;b++)O[b]=0;for(v=0;v<n;v++)O[t[r+v]]++;for(k=g,w=15;1<=w&&0===O[w];w--);if(w<k&&(k=w),0===w)return i[s++]=20971520,i[s++]=20971520,o.bits=1,0;for(y=1;y<w&&0===O[y];y++);for(k<y&&(k=y),b=z=1;b<=15;b++)if(z<<=1,(z-=O[b])<0)return-1;if(0<z&&(0===e||1!==w))return-1;for(B[1]=0,b=1;b<15;b++)B[b+1]=B[b]+O[b];for(v=0;v<n;v++)0!==t[r+v]&&(a[B[t[r+v]]++]=v);if(d=0===e?(A=R=a,19):1===e?(A=F,I-=257,R=N,T-=257,256):(A=U,R=P,-1),b=y,c=s,S=v=E=0,l=-1,f=(C=1<<(x=k))-1,1===e&&852<C||2===e&&592<C)return 1;for(;;){for(p=b-S,_=a[v]<d?(m=0,a[v]):a[v]>d?(m=R[T+a[v]],A[I+a[v]]):(m=96,0),h=1<<b-S,y=u=1<<x;i[c+(E>>S)+(u-=h)]=p<<24|m<<16|_|0,0!==u;);for(h=1<<b-1;E&h;)h>>=1;if(0!==h?(E&=h-1,E+=h):E=0,v++,0==--O[b]){if(b===w)break;b=t[r+a[v]]}if(k<b&&(E&f)!==l){for(0===S&&(S=k),c+=y,z=1<<(x=b-S);x+S<w&&!((z-=O[x+S])<=0);)x++,z<<=1;if(C+=1<<x,1===e&&852<C||2===e&&592<C)return 1;i[l=E&f]=k<<24|x<<16|c-s|0}}return 0!==E&&(i[c+E]=b-S<<24|64<<16|0),o.bits=k,0}},{"../utils/common":41}],51:[function(e,t,r){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(e,t,r){"use strict";var i=e("../utils/common"),o=0,h=1;function n(e){for(var t=e.length;0<=--t;)e[t]=0}var s=0,a=29,u=256,l=u+1+a,f=30,c=19,_=2*l+1,g=15,d=16,p=7,m=256,b=16,v=17,y=18,w=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],k=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],x=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],S=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],z=new Array(2*(l+2));n(z);var C=new Array(2*f);n(C);var E=new Array(512);n(E);var A=new Array(256);n(A);var I=new Array(a);n(I);var O,B,R,T=new Array(f);function D(e,t,r,n,i){this.static_tree=e,this.extra_bits=t,this.extra_base=r,this.elems=n,this.max_length=i,this.has_stree=e&&e.length}function F(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function N(e){return e<256?E[e]:E[256+(e>>>7)]}function U(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function P(e,t,r){e.bi_valid>d-r?(e.bi_buf|=t<<e.bi_valid&65535,U(e,e.bi_buf),e.bi_buf=t>>d-e.bi_valid,e.bi_valid+=r-d):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=r)}function L(e,t,r){P(e,r[2*t],r[2*t+1])}function j(e,t){for(var r=0;r|=1&e,e>>>=1,r<<=1,0<--t;);return r>>>1}function Z(e,t,r){var n,i,s=new Array(g+1),a=0;for(n=1;n<=g;n++)s[n]=a=a+r[n-1]<<1;for(i=0;i<=t;i++){var o=e[2*i+1];0!==o&&(e[2*i]=j(s[o]++,o))}}function W(e){var t;for(t=0;t<l;t++)e.dyn_ltree[2*t]=0;for(t=0;t<f;t++)e.dyn_dtree[2*t]=0;for(t=0;t<c;t++)e.bl_tree[2*t]=0;e.dyn_ltree[2*m]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function M(e){8<e.bi_valid?U(e,e.bi_buf):0<e.bi_valid&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function H(e,t,r,n){var i=2*t,s=2*r;return e[i]<e[s]||e[i]===e[s]&&n[t]<=n[r]}function G(e,t,r){for(var n=e.heap[r],i=r<<1;i<=e.heap_len&&(i<e.heap_len&&H(t,e.heap[i+1],e.heap[i],e.depth)&&i++,!H(t,n,e.heap[i],e.depth));)e.heap[r]=e.heap[i],r=i,i<<=1;e.heap[r]=n}function K(e,t,r){var n,i,s,a,o=0;if(0!==e.last_lit)for(;n=e.pending_buf[e.d_buf+2*o]<<8|e.pending_buf[e.d_buf+2*o+1],i=e.pending_buf[e.l_buf+o],o++,0===n?L(e,i,t):(L(e,(s=A[i])+u+1,t),0!==(a=w[s])&&P(e,i-=I[s],a),L(e,s=N(--n),r),0!==(a=k[s])&&P(e,n-=T[s],a)),o<e.last_lit;);L(e,m,t)}function Y(e,t){var r,n,i,s=t.dyn_tree,a=t.stat_desc.static_tree,o=t.stat_desc.has_stree,h=t.stat_desc.elems,u=-1;for(e.heap_len=0,e.heap_max=_,r=0;r<h;r++)0!==s[2*r]?(e.heap[++e.heap_len]=u=r,e.depth[r]=0):s[2*r+1]=0;for(;e.heap_len<2;)s[2*(i=e.heap[++e.heap_len]=u<2?++u:0)]=1,e.depth[i]=0,e.opt_len--,o&&(e.static_len-=a[2*i+1]);for(t.max_code=u,r=e.heap_len>>1;1<=r;r--)G(e,s,r);for(i=h;r=e.heap[1],e.heap[1]=e.heap[e.heap_len--],G(e,s,1),n=e.heap[1],e.heap[--e.heap_max]=r,e.heap[--e.heap_max]=n,s[2*i]=s[2*r]+s[2*n],e.depth[i]=(e.depth[r]>=e.depth[n]?e.depth[r]:e.depth[n])+1,s[2*r+1]=s[2*n+1]=i,e.heap[1]=i++,G(e,s,1),2<=e.heap_len;);e.heap[--e.heap_max]=e.heap[1],function(e,t){var r,n,i,s,a,o,h=t.dyn_tree,u=t.max_code,l=t.stat_desc.static_tree,f=t.stat_desc.has_stree,c=t.stat_desc.extra_bits,d=t.stat_desc.extra_base,p=t.stat_desc.max_length,m=0;for(s=0;s<=g;s++)e.bl_count[s]=0;for(h[2*e.heap[e.heap_max]+1]=0,r=e.heap_max+1;r<_;r++)p<(s=h[2*h[2*(n=e.heap[r])+1]+1]+1)&&(s=p,m++),h[2*n+1]=s,u<n||(e.bl_count[s]++,a=0,d<=n&&(a=c[n-d]),o=h[2*n],e.opt_len+=o*(s+a),f&&(e.static_len+=o*(l[2*n+1]+a)));if(0!==m){do{for(s=p-1;0===e.bl_count[s];)s--;e.bl_count[s]--,e.bl_count[s+1]+=2,e.bl_count[p]--,m-=2}while(0<m);for(s=p;0!==s;s--)for(n=e.bl_count[s];0!==n;)u<(i=e.heap[--r])||(h[2*i+1]!==s&&(e.opt_len+=(s-h[2*i+1])*h[2*i],h[2*i+1]=s),n--)}}(e,t),Z(s,u,e.bl_count)}function X(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),t[2*(r+1)+1]=65535,n=0;n<=r;n++)i=a,a=t[2*(n+1)+1],++o<h&&i===a||(o<u?e.bl_tree[2*i]+=o:0!==i?(i!==s&&e.bl_tree[2*i]++,e.bl_tree[2*b]++):o<=10?e.bl_tree[2*v]++:e.bl_tree[2*y]++,s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4))}function V(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),n=0;n<=r;n++)if(i=a,a=t[2*(n+1)+1],!(++o<h&&i===a)){if(o<u)for(;L(e,i,e.bl_tree),0!=--o;);else 0!==i?(i!==s&&(L(e,i,e.bl_tree),o--),L(e,b,e.bl_tree),P(e,o-3,2)):o<=10?(L(e,v,e.bl_tree),P(e,o-3,3)):(L(e,y,e.bl_tree),P(e,o-11,7));s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4)}}n(T);var q=!1;function J(e,t,r,n){P(e,(s<<1)+(n?1:0),3),function(e,t,r,n){M(e),n&&(U(e,r),U(e,~r)),i.arraySet(e.pending_buf,e.window,t,r,e.pending),e.pending+=r}(e,t,r,!0)}r._tr_init=function(e){q||(function(){var e,t,r,n,i,s=new Array(g+1);for(n=r=0;n<a-1;n++)for(I[n]=r,e=0;e<1<<w[n];e++)A[r++]=n;for(A[r-1]=n,n=i=0;n<16;n++)for(T[n]=i,e=0;e<1<<k[n];e++)E[i++]=n;for(i>>=7;n<f;n++)for(T[n]=i<<7,e=0;e<1<<k[n]-7;e++)E[256+i++]=n;for(t=0;t<=g;t++)s[t]=0;for(e=0;e<=143;)z[2*e+1]=8,e++,s[8]++;for(;e<=255;)z[2*e+1]=9,e++,s[9]++;for(;e<=279;)z[2*e+1]=7,e++,s[7]++;for(;e<=287;)z[2*e+1]=8,e++,s[8]++;for(Z(z,l+1,s),e=0;e<f;e++)C[2*e+1]=5,C[2*e]=j(e,5);O=new D(z,w,u+1,l,g),B=new D(C,k,0,f,g),R=new D(new Array(0),x,0,c,p)}(),q=!0),e.l_desc=new F(e.dyn_ltree,O),e.d_desc=new F(e.dyn_dtree,B),e.bl_desc=new F(e.bl_tree,R),e.bi_buf=0,e.bi_valid=0,W(e)},r._tr_stored_block=J,r._tr_flush_block=function(e,t,r,n){var i,s,a=0;0<e.level?(2===e.strm.data_type&&(e.strm.data_type=function(e){var t,r=4093624447;for(t=0;t<=31;t++,r>>>=1)if(1&r&&0!==e.dyn_ltree[2*t])return o;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return h;for(t=32;t<u;t++)if(0!==e.dyn_ltree[2*t])return h;return o}(e)),Y(e,e.l_desc),Y(e,e.d_desc),a=function(e){var t;for(X(e,e.dyn_ltree,e.l_desc.max_code),X(e,e.dyn_dtree,e.d_desc.max_code),Y(e,e.bl_desc),t=c-1;3<=t&&0===e.bl_tree[2*S[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),i=e.opt_len+3+7>>>3,(s=e.static_len+3+7>>>3)<=i&&(i=s)):i=s=r+5,r+4<=i&&-1!==t?J(e,t,r,n):4===e.strategy||s===i?(P(e,2+(n?1:0),3),K(e,z,C)):(P(e,4+(n?1:0),3),function(e,t,r,n){var i;for(P(e,t-257,5),P(e,r-1,5),P(e,n-4,4),i=0;i<n;i++)P(e,e.bl_tree[2*S[i]+1],3);V(e,e.dyn_ltree,t-1),V(e,e.dyn_dtree,r-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,a+1),K(e,e.dyn_ltree,e.dyn_dtree)),W(e),n&&M(e)},r._tr_tally=function(e,t,r){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&r,e.last_lit++,0===t?e.dyn_ltree[2*r]++:(e.matches++,t--,e.dyn_ltree[2*(A[r]+u+1)]++,e.dyn_dtree[2*N(t)]++),e.last_lit===e.lit_bufsize-1},r._tr_align=function(e){P(e,2,3),L(e,m,z),function(e){16===e.bi_valid?(U(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):8<=e.bi_valid&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)}(e)}},{"../utils/common":41}],53:[function(e,t,r){"use strict";t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(e,t,r){(function(e){!function(r,n){"use strict";if(!r.setImmediate){var i,s,t,a,o=1,h={},u=!1,l=r.document,e=Object.getPrototypeOf&&Object.getPrototypeOf(r);e=e&&e.setTimeout?e:r,i="[object process]"==={}.toString.call(r.process)?function(e){process.nextTick(function(){c(e)})}:function(){if(r.postMessage&&!r.importScripts){var e=!0,t=r.onmessage;return r.onmessage=function(){e=!1},r.postMessage("","*"),r.onmessage=t,e}}()?(a="setImmediate$"+Math.random()+"$",r.addEventListener?r.addEventListener("message",d,!1):r.attachEvent("onmessage",d),function(e){r.postMessage(a+e,"*")}):r.MessageChannel?((t=new MessageChannel).port1.onmessage=function(e){c(e.data)},function(e){t.port2.postMessage(e)}):l&&"onreadystatechange"in l.createElement("script")?(s=l.documentElement,function(e){var t=l.createElement("script");t.onreadystatechange=function(){c(e),t.onreadystatechange=null,s.removeChild(t),t=null},s.appendChild(t)}):function(e){setTimeout(c,0,e)},e.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),r=0;r<t.length;r++)t[r]=arguments[r+1];var n={callback:e,args:t};return h[o]=n,i(o),o++},e.clearImmediate=f}function f(e){delete h[e]}function c(e){if(u)setTimeout(c,0,e);else{var t=h[e];if(t){u=!0;try{!function(e){var t=e.callback,r=e.args;switch(r.length){case 0:t();break;case 1:t(r[0]);break;case 2:t(r[0],r[1]);break;case 3:t(r[0],r[1],r[2]);break;default:t.apply(n,r)}}(t)}finally{f(e),u=!1}}}}function d(e){e.source===r&&"string"==typeof e.data&&0===e.data.indexOf(a)&&c(+e.data.slice(a.length))}}("undefined"==typeof self?void 0===e?this:e:self)}).call(this,"undefined"!=typeof __webpack_require__.g?__webpack_require__.g:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[10])(10)});

/***/ }),

/***/ 728:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * Server-Sent Events (SSE) parser module for streaming functionality
 * Handles robust parsing of SSE streams from OpenAI-compatible APIs
 */

// Import eventsource-parser for robust SSE parsing (compatible with browser and Node.js)
let createParser;

if ( true && module.exports) {
  // Node.js environment
  try {
    createParser = (__webpack_require__(119).createParser);
  } catch (error) {
    throw new Error('eventsource-parser is required for SSE streaming support. Please install it with: npm install eventsource-parser');
  }
} else {
  // Browser environment - webpack should bundle eventsource-parser
  try {
    // Use dynamic import that webpack can resolve
    const EventSourceParser = __webpack_require__(119);
    createParser = EventSourceParser.createParser;
  } catch (error) {
    throw new Error('eventsource-parser is required for SSE streaming support. Please ensure it is bundled with your application.');
  }
}

/**
 * Parse Server-Sent Events (SSE) stream from a ReadableStream
 * @param {ReadableStreamDefaultReader} reader - Stream reader
 * @param {function} onEvent - Callback for each parsed event
 * @returns {Promise<string>} - Complete accumulated response
 */
async function parseSSE(reader, onEvent) {
  const decoder = new TextDecoder();
  let fullResponse = '';
  
  // Create the SSE parser
  const parser = createParser((event) => {
    if (event.type === 'event') {
      if (event.data === '[DONE]') {
        return;
      }
      
      try {
        const parsed = JSON.parse(event.data);
        const delta = parsed.choices?.[0]?.delta;
        
        if (delta) {
          const eventData = {
            role: delta.role || 'assistant'
          };
          
          // Handle content delta
          if (delta.content !== undefined && delta.content !== null) {
            eventData.delta = delta.content;
            fullResponse += delta.content;
          }
          
          // Handle tool calls delta
          if (delta.tool_calls) {
            eventData.tool_calls = delta.tool_calls;
          }
          
          if (onEvent) onEvent(eventData);
        }
      } catch (error) {
        console.warn('Failed to parse SSE event:', error.message);
      }
    }
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Feed the chunk to the parser
      const chunk = decoder.decode(value, { stream: true });
      parser.feed(chunk);
    }
  } catch (error) {
    throw new Error(`SSE parsing failed: ${error.message}`);
  }

  return fullResponse;
}

// Export the function and createParser for use by other modules
if ( true && module.exports) {
  module.exports = {
    parseSSE,
    createParser
  };
} else {
  // Browser environment
  window.SSEParser = {
    parseSSE,
    createParser
  };
}


/***/ }),

/***/ 828:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * Vision module for WarpMind - Contains all image analysis operations
 * Handles image uploads, analysis, and multi-modal conversations
 */

// Import required utilities
let fileToBase64;

if ( true && module.exports) {
  // Node.js environment
  const { fileToBase64: fBase64 } = __webpack_require__(94);
  fileToBase64 = fBase64;
} else {
  // Browser environment - utilities should be available globally
  fileToBase64 = window.WarpMindUtils.fileToBase64;
}

/**
 * Vision module factory function that accepts a client instance
 * @param {Object} client - The client instance (BaseClient or WarpMind)
 * @returns {Object} - Object with vision methods to be mixed into the main class
 */
function createVisionModule(client) {
  return {
    /**
     * Analyze images using vision models
     * @param {string|File|Blob} image - Image to analyze (URL, File, or Blob)
     * @param {string} prompt - Question or instruction about the image
     * @param {Object} options - Optional parameters
     * @param {string} options.model - Vision model to use (default: 'gpt-5')
     * @param {string} options.detail - Image detail level: "low" or "high" (default: "low")
     * @param {number} options.timeoutMs - Request timeout in milliseconds
     * @returns {Promise<Object>} - AI response object with image analysis
     */
    async analyzeImage(image, prompt = "What do you see in this image?", options = {}) {
      let imageContent;
      const detail = options.detail || "low";
      
      // Validate detail parameter
      if (detail !== "low" && detail !== "high") {
        throw new Error('options.detail must be "low" or "high"');
      }

      // Handle different image input types
      if (typeof image === 'string') {
        // URL or base64 string
        if (image.startsWith('data:image/')) {
          imageContent = {
            type: "image_url",
            image_url: {
              url: image,
              detail: detail
            }
          };
        } else {
          imageContent = {
            type: "image_url",
            image_url: {
              url: image,
              detail: detail
            }
          };
        }
      } else if (image && (
        (typeof File !== 'undefined' && image instanceof File) || 
        (typeof Blob !== 'undefined' && image instanceof Blob) ||
        (image.constructor && image.constructor.name === 'File') ||
        (image.constructor && image.constructor.name === 'Blob') ||
        (image.type && image.arrayBuffer) // Duck typing for File/Blob-like objects
      )) {
        // Convert File/Blob to base64
        const base64 = await fileToBase64(image);
        imageContent = {
          type: "image_url",
          image_url: {
            url: base64,
            detail: detail
          }
        };
      } else {
        throw new Error('Image must be a URL string, File, or Blob object');
      }

      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            imageContent
          ]
        }
      ];

      // Extract only valid chat options, excluding vision-specific options like 'detail'
      const chatOptions = {
        model: options.model || 'gpt-5'
      };
      
      // Only pass through recognized chat options
      if (options.temperature !== undefined) chatOptions.temperature = options.temperature;
      if (options.max_tokens !== undefined) chatOptions.max_tokens = options.max_tokens;
      if (options.top_p !== undefined) chatOptions.top_p = options.top_p;
      if (options.frequency_penalty !== undefined) chatOptions.frequency_penalty = options.frequency_penalty;
      if (options.presence_penalty !== undefined) chatOptions.presence_penalty = options.presence_penalty;
      if (options.timeoutMs !== undefined) chatOptions.timeoutMs = options.timeoutMs;

      return await client.chat(messages, chatOptions);
    }
  };
}

// Export for both CommonJS and ES modules
if ( true && module.exports) {
  module.exports = createVisionModule;
} else if (typeof window !== 'undefined') {
  // Browser environment - attach to window for global access
  window.createVisionModule = createVisionModule;
}


/***/ }),

/***/ 902:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * PDF Loader Module - Handles PDF reading, indexing, and retrieval-augmented generation
 * Dependencies: PDF.js, IndexedDB for vector storage
 */

// Import PDF.js for PDF processing
let pdfjsLib;
let pdfLoadingPromise;

if (typeof window !== 'undefined') {
  // Browser environment - check for existing PDF.js or load dynamically
  if (window.pdfjsLib) {
    // PDF.js already loaded (e.g., via Webstrates, pre-bundled, etc.)
    pdfjsLib = window.pdfjsLib;
    configureWorker();
    pdfLoadingPromise = Promise.resolve();
  } else {
    // PDF.js not loaded - set up loading promise with error handling
    pdfLoadingPromise = loadPdfJs().catch(error => {
      console.log('WarpMind loaded without PDF support.');
      pdfjsLib = null;
      // Don't re-throw the error to avoid uncaught promise rejection
      return null;
    });
  }
} else {
  // Node.js environment - try to require PDF.js carefully
  try {
    // Check if we're in a Jest testing environment or if DOMMatrix is not available
    if (typeof process !== 'undefined' && 
        ( false || typeof DOMMatrix === 'undefined')) {
      // In Jest test environment or when DOM APIs aren't available, skip PDF.js loading
      console.log('WarpMind loaded without PDF support (Node.js environment)');
      pdfjsLib = null;
      pdfLoadingPromise = null; // Will be set when needed
    } else {
      // Try to require PDF.js, but handle module not found gracefully
      try {
        pdfjsLib = __webpack_require__(192);
        pdfLoadingPromise = Promise.resolve();
      } catch (requireError) {
        console.log('WarpMind loaded without PDF support (PDF.js package not found)');
        pdfjsLib = null;
        pdfLoadingPromise = null;
      }
    }
  } catch (error) {
    console.log('WarpMind loaded without PDF support (Node.js environment)');
    pdfjsLib = null;
    pdfLoadingPromise = null; // Will be set when needed
  }
}

// Helper function to configure PDF.js worker
function configureWorker() {
  try {
    if (pdfjsLib && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  } catch (error) {
    console.warn('Failed to configure PDF.js worker:', error);
  }
}

// Robust PDF.js loading function
async function loadPdfJs() {
  return new Promise((resolve, reject) => {
    // Check if we're in a restrictive environment (e.g., strict CSP)
    if (isRestrictedEnvironment()) {
      reject(new Error('PDF.js loading is restricted in this environment. Please pre-load PDF.js before initializing WarpMind.'));
      return;
    }

    // First, wait a bit to see if PDF.js is being loaded externally (e.g., by Webstrates)
    let attempts = 0;
    const maxWaitAttempts = 20; // Wait up to 2 seconds
    
    const checkForExternalLoad = () => {
      if (window.pdfjsLib) {
        pdfjsLib = window.pdfjsLib;
        configureWorker();
        resolve();
      } else if (attempts < maxWaitAttempts) {
        attempts++;
        setTimeout(checkForExternalLoad, 100);
      } else {
        // No external loading detected, try dynamic loading
        loadPdfJsDynamically().then(resolve).catch(reject);
      }
    };
    
    checkForExternalLoad();
  });
}

// Dynamic PDF.js loading with better error handling
function loadPdfJsDynamically() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    
    let resolved = false;
    
    script.onload = () => {
      if (resolved) return;
      
      // Use a more robust checking mechanism
      let checkAttempts = 0;
      const maxCheckAttempts = 50; // Check for up to 5 seconds
      
      const checkPdfJsAvailable = () => {
        if (window.pdfjsLib) {
          pdfjsLib = window.pdfjsLib;
          configureWorker();
          resolved = true;
          resolve();
        } else if (checkAttempts < maxCheckAttempts) {
          checkAttempts++;
          setTimeout(checkPdfJsAvailable, 100);
        } else {
          resolved = true;
          reject(new Error('PDF.js library failed to initialize after loading'));
        }
      };
      
      checkPdfJsAvailable();
    };
    
    script.onerror = () => {
      if (resolved) return;
      resolved = true;
      reject(new Error('Failed to load PDF.js from CDN. Please check your internet connection or pre-load PDF.js.'));
    };
    
    // Add timeout for the entire loading process
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('PDF.js loading timed out'));
      }
    }, 30000); // 30 second timeout
    
    document.head.appendChild(script);
  });
}

// Check if we're in a restrictive environment
function isRestrictedEnvironment() {
  try {
    // Test if we can create and append a script element
    const testScript = document.createElement('script');
    testScript.src = 'data:text/javascript,';
    document.head.appendChild(testScript);
    document.head.removeChild(testScript);
    return false;
  } catch (error) {
    return true; // CSP or other restrictions prevent script loading
  }
}

// Wait for PDF.js to be ready before using it
async function ensurePdfJsLoaded() {
  // Check if we're in a Jest test environment or Node.js without browser APIs
  if (typeof process !== 'undefined' && 
      ( false || typeof DOMMatrix === 'undefined')) {
    console.log('WarpMind loaded without PDF support (Node.js environment)');
    return null;
  }
  
  if (pdfLoadingPromise) {
    try {
      await pdfLoadingPromise;
    } catch (error) {
      console.log('WarpMind loaded without PDF support (PDF.js loading failed)');
      return null;
    }
  } else if (!pdfjsLib) {
    // pdfLoadingPromise is null, which means we're in Node.js without PDF.js support
    console.log('WarpMind loaded without PDF support (PDF.js not available)');
    return null;
  }
  
  if (!pdfjsLib) {
    console.log('WarpMind loaded without PDF support (PDF.js library not loaded)');
    return null;
  }
  return pdfjsLib;
}

// IndexedDB configuration
const DB_NAME = 'warpmind-pdf-storage';
const DB_VERSION = 3; // Increment version for optimized storage schema
const STORE_NAME = 'pdf-chunks';
const METADATA_STORE = 'pdf-metadata';
const CONTENT_STORE = 'pdf-content'; // Store for full text content

class PdfStorage {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    // Handle test environment where IndexedDB is not available
    if (typeof indexedDB === 'undefined' || "production" === 'test') {
      // Return a mock db object for testing
      this.db = { 
        isMockDb: true,
        transaction: () => ({
          objectStore: () => ({
            get: () => ({ onsuccess: null, onerror: null, result: null }),
            put: () => ({ onsuccess: null, onerror: null }),
            delete: () => ({ onsuccess: null, onerror: null }),
            getAll: () => ({ onsuccess: null, onerror: null, result: [] })
          })
        })
      };
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create chunks store - optimized to store only indices and references
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('pdfId', 'pdfId', { unique: false });
          store.createIndex('chunkIndex', 'chunkIndex', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metaStore = db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
          metaStore.createIndex('processedAt', 'processedAt', { unique: false });
        }

        // Create content store - single source of truth for text content
        if (!db.objectStoreNames.contains(CONTENT_STORE)) {
          const contentStore = db.createObjectStore(CONTENT_STORE, { keyPath: 'id' });
          contentStore.createIndex('pdfId', 'pdfId', { unique: false });
          contentStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  async storeChunk(pdfId, chunkIndex, chunk) {
    await this.init();
    
    // Handle test environment gracefully
    if (this.db.isMockDb) {
      return Promise.resolve();
    }
    
    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Store only references and indices - text-only optimization
    const chunkData = {
      id: `${pdfId}-${chunkIndex}`,
      pdfId,
      chunkIndex,
      textStart: chunk.textStart,
      textEnd: chunk.textEnd,
      embedding: chunk.embedding,
      embeddingText: chunk.embeddingText,
      pageReferences: chunk.pageReferences
    };

    return new Promise((resolve, reject) => {
      const request = store.put(chunkData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async storeContent(pdfId, type, data, index = null) {
    await this.init();
    
    // Handle test environment gracefully
    if (this.db.isMockDb) {
      return Promise.resolve();
    }
    
    const transaction = this.db.transaction([CONTENT_STORE], 'readwrite');
    const store = transaction.objectStore(CONTENT_STORE);
    
    const contentId = index !== null ? `${pdfId}-${type}-${index}` : `${pdfId}-${type}`;
    const contentData = {
      id: contentId,
      pdfId,
      type,
      data,
      index,
      storedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(contentData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getContent(pdfId, type, index = null) {
    await this.init();
    
    // Handle test environment gracefully
    if (this.db.isMockDb) {
      return Promise.resolve(null);
    }
    
    const transaction = this.db.transaction([CONTENT_STORE], 'readonly');
    const store = transaction.objectStore(CONTENT_STORE);
    
    const contentId = index !== null ? `${pdfId}-${type}-${index}` : `${pdfId}-${type}`;

    return new Promise((resolve, reject) => {
      const request = store.get(contentId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllContentForPdf(pdfId) {
    await this.init();
    
    // Handle test environment gracefully
    if (this.db.isMockDb) {
      return Promise.resolve([]);
    }
    
    const transaction = this.db.transaction([CONTENT_STORE], 'readonly');
    const store = transaction.objectStore(CONTENT_STORE);
    const index = store.index('pdfId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(pdfId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async storeMetadata(pdfId, metadata) {
    await this.init();
    
    // Handle test environment gracefully
    if (this.db.isMockDb) {
      return Promise.resolve();
    }
    
    const transaction = this.db.transaction([METADATA_STORE], 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);
    
    const metaData = {
      id: pdfId,
      ...metadata,
      processedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(metaData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getChunks(pdfId) {
    await this.init();
    
    // Handle test environment gracefully
    if (this.db.isMockDb) {
      return Promise.resolve([]);
    }
    
    const transaction = this.db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('pdfId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(pdfId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getReconstructedChunks(pdfId) {
    await this.init();
    
    // Handle test environment gracefully
    if (this.db.isMockDb) {
      return Promise.resolve([]);
    }
    
    // Get chunk metadata
    const chunks = await this.getChunks(pdfId);
    if (!chunks || chunks.length === 0) {
      return [];
    }

    // Get full text content
    const fullTextContent = await this.getContent(pdfId, 'fullText');
    const fullText = fullTextContent ? fullTextContent.data : '';

    // Reconstruct chunks with text-only optimization
    const reconstructedChunks = [];
    for (const chunk of chunks) {
      // Extract text using indices
      const text = fullText.substring(chunk.textStart, chunk.textEnd);
      
      reconstructedChunks.push({
        id: chunk.id,
        pdfId: chunk.pdfId,
        chunkIndex: chunk.chunkIndex,
        text,
        embedding: chunk.embedding,
        embeddingText: chunk.embeddingText,
        pageReferences: chunk.pageReferences,
        textStart: chunk.textStart,
        textEnd: chunk.textEnd
      });
    }

    return reconstructedChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async getMetadata(pdfId) {
    await this.init();
    
    // Handle test environment gracefully
    if (this.db.isMockDb) {
      return Promise.resolve(null);
    }
    
    const transaction = this.db.transaction([METADATA_STORE], 'readonly');
    const store = transaction.objectStore(METADATA_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(pdfId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllMetadata() {
    await this.init();
    
    // Handle test environment gracefully
    if (this.db.isMockDb) {
      return Promise.resolve([]);
    }
    
    const transaction = this.db.transaction([METADATA_STORE], 'readonly');
    const store = transaction.objectStore(METADATA_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePdf(pdfId) {
    await this.init();
    
    // Handle test environment gracefully
    if (this.db.isMockDb) {
      return Promise.resolve();
    }
    
    const transaction = this.db.transaction([STORE_NAME, METADATA_STORE, CONTENT_STORE], 'readwrite');
    const chunkStore = transaction.objectStore(STORE_NAME);
    const metaStore = transaction.objectStore(METADATA_STORE);
    const contentStore = transaction.objectStore(CONTENT_STORE);
    
    const chunkIndex = chunkStore.index('pdfId');
    const contentIndex = contentStore.index('pdfId');

    return new Promise((resolve, reject) => {
      // Delete all chunks for this PDF
      const chunkRequest = chunkIndex.getAll(pdfId);
      chunkRequest.onsuccess = () => {
        const chunks = chunkRequest.result;
        const chunkDeletePromises = chunks.map(chunk => {
          return new Promise((res, rej) => {
            const delRequest = chunkStore.delete(chunk.id);
            delRequest.onsuccess = () => res();
            delRequest.onerror = () => rej(delRequest.error);
          });
        });

        // Delete all content for this PDF
        const contentRequest = contentIndex.getAll(pdfId);
        contentRequest.onsuccess = () => {
          const content = contentRequest.result;
          const contentDeletePromises = content.map(item => {
            return new Promise((res, rej) => {
              const delRequest = contentStore.delete(item.id);
              delRequest.onsuccess = () => res();
              delRequest.onerror = () => rej(delRequest.error);
            });
          });

          // Wait for all deletions to complete
          Promise.all([...chunkDeletePromises, ...contentDeletePromises]).then(() => {
            // Delete metadata
            const metaRequest = metaStore.delete(pdfId);
            metaRequest.onsuccess = () => resolve();
            metaRequest.onerror = () => reject(metaRequest.error);
          }).catch(reject);
        };
        contentRequest.onerror = () => reject(contentRequest.error);
      };
      chunkRequest.onerror = () => reject(chunkRequest.error);
    });
  }

  async getStorageInfo() {
    await this.init();
    const allMetadata = await this.getAllMetadata();
    
    let totalSize = 0;
    const pdfSizes = [];

    for (const metadata of allMetadata) {
      const chunks = await this.getChunks(metadata.id);
      const content = await this.getAllContentForPdf(metadata.id);
      
      // Calculate size from content store (single source of truth)
      const contentSize = content.reduce((acc, item) => {
        const dataSize = typeof item.data === 'string' ? 
          new Blob([item.data]).size : 
          (item.data?.length || 0) * 4; // Assume embedding arrays are float32
        return acc + dataSize;
      }, 0);
      
      // Calculate chunk metadata size (much smaller now)
      const chunkSize = chunks.reduce((acc, chunk) => {
        const embeddingSize = chunk.embedding ? chunk.embedding.length * 4 : 0;
        const metadataSize = JSON.stringify({
          textStart: chunk.textStart,
          textEnd: chunk.textEnd,
          pageReferences: chunk.pageReferences
        }).length;
        return acc + embeddingSize + metadataSize;
      }, 0);

      const totalPdfSize = contentSize + chunkSize;

      pdfSizes.push({
        id: metadata.id,
        title: metadata.title || metadata.id,
        size: totalPdfSize / (1024 * 1024), // Convert to MB
        contentSize: contentSize / (1024 * 1024),
        chunkMetadataSize: chunkSize / (1024 * 1024),
        chunks: chunks.length,
        processedAt: metadata.processedAt
      });

      totalSize += totalPdfSize;
    }

    return {
      totalSize: totalSize / (1024 * 1024), // Convert to MB
      unit: 'MB',
      pdfs: pdfSizes.sort((a, b) => b.size - a.size),
      optimized: true // Flag to indicate this is using optimized storage
    };
  }
}

// Utility functions for text chunking and vector operations
function chunkText(text, maxTokens = 400) {
  // Improved chunking that preserves original text structure
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const chunks = [];
  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.trim()) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
      currentTokens = sentenceTokens;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      currentTokens += sentenceTokens;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function estimateTokens(text) {
  // Simple token estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function createPdfLoaderModule(client) {
  const storage = new PdfStorage();
  const loadedPdfs = new Map(); // In-memory cache for quick access

  return {
    async readPdf(src, options = {}) {
      const {
        id = null,
        chunkTokens = 400,
        embedModel = 'text-embedding-3-small',
        onProgress = null,
        pageRange = null  // [startPage, endPage] or { start: number, end: number }
      } = options;
      
      // Fixed maximum pages limit to prevent excessive API usage
      const MAX_PAGES = 100;
      
      // Safe progress update function that won't throw errors
      const safeProgress = (progress) => {
        if (typeof onProgress === 'function') {
          try {
            onProgress(progress);
          } catch (e) {
            console.warn('Error in progress callback:', e);
          }
        }
      };

      let pdfId = id;
      let pdfDoc;
      let file;
      
      // Start with initial progress
      safeProgress(0.01);

      // Setup progress pulse to ensure regular UI updates even during slow operations
      let lastProgressUpdate = 0;
      let progressPulseInterval = null;
      
      const startProgressPulse = (currentProgress, description) => {
        if (progressPulseInterval) clearInterval(progressPulseInterval);
        
        // Create a pulse that shows small increments to indicate the system is still working
        let pulseCount = 0;
        progressPulseInterval = setInterval(() => {
          pulseCount++;
          // Only pulse if no real progress has been reported for 2 seconds
          const now = Date.now();
          if (now - lastProgressUpdate > 2000) {
            const pulseDescription = `${description || 'Processing'} (waiting for backend response...)`;
            this._safeProgressCallback(currentProgress, pulseDescription);
          }
          
          // After 30 seconds (15 pulses at 2s intervals), show a more explicit message
          if (pulseCount === 15) {
            console.log('Operation taking longer than expected. Backend may be under heavy load.');
          }
        }, 2000);
      };
      
      const stopProgressPulse = () => {
        if (progressPulseInterval) {
          clearInterval(progressPulseInterval);
          progressPulseInterval = null;
        }
      };
      
      // Update our safe progress callback to track the last update time
      const originalSafeProgressCallback = this._safeProgressCallback;
      this._safeProgressCallback = (progress, description) => {
        lastProgressUpdate = Date.now();
        originalSafeProgressCallback.call(this, progress, description);
      };

      try {
        // Ensure PDF.js is loaded before proceeding
        const pdfLib = await ensurePdfJsLoaded();
        if (!pdfLib) {
          throw new Error('PDF functionality is not available. WarpMind was loaded without PDF support. This may be due to the environment not supporting PDF.js or a loading failure.');
        }

        // Handle different input types
        if (typeof src === 'string') {
          // Check if it's a local file system path (Windows/Unix absolute paths)
          const isLocalFilePath = /^([a-zA-Z]:\\|\/[^\/]|~\/|\.{1,2}[\\\/])/.test(src) && 
                                 !src.startsWith('./') && 
                                 !src.startsWith('../') && 
                                 !src.startsWith('/');
          
          if (isLocalFilePath) {
            throw new Error('Local file system paths are not supported in browser environment. Use relative URLs or full URLs instead.');
          }
          
          // All other strings are treated as URLs (relative or absolute)
          const response = await fetch(src);
          if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
          const arrayBuffer = await response.arrayBuffer();
          file = new Uint8Array(arrayBuffer);
          pdfId = pdfId || src.split('/').pop().replace('.pdf', '');
        } else if (src instanceof File) {
          // File object input
          const arrayBuffer = await src.arrayBuffer();
          file = new Uint8Array(arrayBuffer);
          pdfId = pdfId || src.name.replace('.pdf', '');
        } else {
          throw new Error('Invalid PDF source. Must be a File object or URL string.');
        }

        // Check if PDF is already processed
        const existingMetadata = await storage.getMetadata(pdfId);
        if (existingMetadata) {
          // Use recallPdf method for consistency
          await this.recallPdf(pdfId);
          
          safeProgress(1.0);
          return pdfId;
        }

        // PDF.js should now be available
        if (!pdfjsLib) {
          throw new Error('PDF.js is not available. Please ensure PDF.js is loaded.');
        }

        // Load PDF document
        let numPages;
        try {
          pdfDoc = await pdfjsLib.getDocument({ data: file }).promise;
          numPages = pdfDoc.numPages;
        
          safeProgress(0.1);
        } catch (error) {
          console.error('Error loading PDF document:', error);
          throw new Error(`Failed to load PDF document: ${error.message}`);
        }

        // Validate and calculate page range
        let startPage = 1;
        let endPage = numPages;
        
        if (pageRange) {
          // Handle both array [start, end] and object { start, end } formats
          if (Array.isArray(pageRange)) {
            [startPage, endPage] = pageRange;
          } else if (typeof pageRange === 'object' && pageRange.start && pageRange.end) {
            startPage = pageRange.start;
            endPage = pageRange.end;
          } else {
            throw new Error('pageRange must be an array [startPage, endPage] or object { start: number, end: number }');
          }
          
          // Validate page range
          if (startPage < 1 || endPage > numPages || startPage > endPage) {
            throw new Error(`Invalid page range [${startPage}, ${endPage}]. PDF has ${numPages} pages.`);
          }
        }
        
        // Calculate actual pages to process
        const pagesToProcess = endPage - startPage + 1;
        
        // Enforce maximum pages limit
        if (pagesToProcess > MAX_PAGES) {
          if (pageRange) {
            throw new Error(`Page range [${startPage}, ${endPage}] contains ${pagesToProcess} pages, which exceeds the maximum limit of ${MAX_PAGES} pages. Please specify a smaller range.`);
          } else {
            throw new Error(`PDF has ${numPages} pages, which exceeds the maximum limit of ${MAX_PAGES} pages. Please specify a pageRange to process a subset of pages (e.g., { pageRange: [1, ${MAX_PAGES}] }).`);
          }
        }

        // Extract text from specified page range
        const pageContents = [];
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          
          // Extract text
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');

          // Store text only - no image processing
          pageContents.push({
            pageNum,
            text: pageText
          });

          // Update progress based on pages processed within the range
          const pagesProcessed = pageNum - startPage + 1;
          safeProgress(0.1 + (pagesProcessed / pagesToProcess) * 0.4);
        }

        // Combine all text and create chunks
        const fullText = pageContents.map(page => page.text).join('\n\n');
        const textChunks = chunkText(fullText, chunkTokens);
        
        // Create simplified chunks with text-only processing
        const enhancedChunks = [];
        let currentTextPosition = 0;

        safeProgress(0.5); // Update progress before starting the loop

        for (let i = 0; i < textChunks.length; i++) {
          const chunkText = textChunks[i];
          
          // Try to find chunk text with improved matching
          let textStart = this._findChunkPosition(fullText, chunkText, currentTextPosition);
          let textEnd = textStart + chunkText.length;
          
          // Find relevant pages for this chunk 
          const chunkPageRefs = this._findPageReferences(chunkText, pageContents);

          enhancedChunks.push({
            chunkIndex: i,
            textStart,
            textEnd,
            pageReferences: chunkPageRefs
          });

          currentTextPosition = textEnd;
          
          // Update progress less frequently to avoid UI freezing
          if (i % 5 === 0) {
            safeProgress(0.5 + (i / textChunks.length) * 0.3);
          }
        }
        
        // Final progress update after loop completes
        safeProgress(0.8);

        // Generate embeddings for each chunk
        const chunksWithEmbeddings = [];
        
        // Prepare all chunk texts for embedding
        const chunkTextsForEmbedding = [];
        for (let i = 0; i < enhancedChunks.length; i++) {
          const chunk = enhancedChunks[i];
          // Check for valid start/end indices
          if (chunk.textStart >= 0 && chunk.textEnd <= fullText.length && chunk.textStart < chunk.textEnd) {
            const chunkText = fullText.substring(chunk.textStart, chunk.textEnd);
            // Text-only processing
            chunkTextsForEmbedding.push({ chunk, embeddingText: chunkText });
          } else {
            console.warn(`Invalid text indices for chunk ${i}: start=${chunk.textStart}, end=${chunk.textEnd}, textLength=${fullText.length}`);
            chunkTextsForEmbedding.push({ 
              chunk, 
              embeddingText: `Chunk ${i} with invalid indices` 
            });
          }
        }
        
        if (onProgress) onProgress(0.8);
        
        // Process embeddings with better progress updates
        for (let i = 0; i < chunkTextsForEmbedding.length; i++) {
          const { chunk, embeddingText } = chunkTextsForEmbedding[i];
          
          try {
            const embedding = await this._generateEmbedding(embeddingText, embedModel);
            chunksWithEmbeddings.push({
              ...chunk,
              embedding,
              embeddingText
            });
          } catch (error) {
            console.warn(`Failed to generate embedding for chunk ${i}:`, error);
            chunksWithEmbeddings.push({
              ...chunk,
              embedding: null,
              embeddingText: chunk.embeddingText
            });
          }

          // Update progress less frequently
          if (i % 3 === 0 || i === chunkTextsForEmbedding.length - 1) {
            safeProgress(0.8 + (i / chunkTextsForEmbedding.length) * 0.15);
          }
        }

        // Store in optimized format
        const metadata = {
          title: pdfId,
          numPages,
          pagesProcessed: pagesToProcess,
          pageRange: pageRange ? { start: startPage, end: endPage } : null,
          totalChunks: chunksWithEmbeddings.length,
          chunkTokens,
          embedModel,
          estimatedTokens: Math.ceil(fullText.length / 4)
        };

        safeProgress(0.85);
        
        try {
          // Store metadata first
          await storage.storeMetadata(pdfId, metadata);
          safeProgress(0.87);

          // Store full text once (single source of truth)
          await storage.storeContent(pdfId, 'fullText', fullText);
          safeProgress(0.9);

          // Store page contents for formatting purposes
          await storage.storeContent(pdfId, 'pageContents', pageContents);
          safeProgress(0.92);

          // Store optimized chunks (only indices and embeddings) - batch for performance
          for (let i = 0; i < chunksWithEmbeddings.length; i += 10) {
            const chunkBatch = chunksWithEmbeddings.slice(i, i + 10);
            await Promise.all(
              chunkBatch.map(chunk => storage.storeChunk(pdfId, chunk.chunkIndex, chunk))
            );
            
            const chunkProgress = 0.92 + (Math.min(i + 10, chunksWithEmbeddings.length) / chunksWithEmbeddings.length) * 0.08;
            safeProgress(chunkProgress);
          }
          
          safeProgress(1.0);
        } catch (error) {
          console.error('Error storing PDF data:', error);
          throw new Error(`Failed to store PDF data: ${error.message}`);
        }

        // Create lightweight chunks for in-memory cache (text-only optimization)
        const reconstructedChunks = chunksWithEmbeddings.map(chunk => ({
          id: `${pdfId}-${chunk.chunkIndex}`,
          pdfId,
          chunkIndex: chunk.chunkIndex,
          text: fullText.substring(chunk.textStart, chunk.textEnd),
          embedding: chunk.embedding,
          embeddingText: chunk.embeddingText,
          pageReferences: chunk.pageReferences,
          textStart: chunk.textStart,
          textEnd: chunk.textEnd
        }));

        // Cache in memory for quick access (text-only optimization)
        loadedPdfs.set(pdfId, { 
          metadata: { ...metadata, fullText, pageContents },
          chunks: reconstructedChunks
        });

        // Register retrieval tool
        this._registerPdfRetrievalTool(pdfId, metadata.title);

        if (onProgress) onProgress(1.0);
        return pdfId;

      } catch (error) {
        // Log the full error for debugging
        console.error('PDF processing error:', error);
        
        // Set progress to 0 to indicate failure
        safeProgress(0);
        
        // Handle specific error types with friendly messages
        if (error.message.includes('PDF.js')) {
          throw new Error('PDF features are not available. This may be due to the environment not supporting PDF.js. Please ensure PDF.js can be loaded in your platform.');
        } else if (error.name === 'PasswordException') {
          throw new Error('The PDF is password protected. Please provide an unprotected PDF.');
        } else if (error.name === 'InvalidPDFException') {
          throw new Error('The PDF is invalid or corrupted. Please try a different file.');
        } else if (error.message.includes('storage') || error.name === 'QuotaExceededError') {
          throw new Error('Storage quota exceeded. Please clear some space by removing unused PDFs.');
        } else {
          // Generic error with the original message
          throw new Error(`Failed to process PDF: ${error.message}`);
        }
      } finally {
        // Make sure we clean up the progress pulse
        stopProgressPulse();
      }
    },

    async isPdfRead(pdfIds) {
      if (Array.isArray(pdfIds)) {
        const results = {};
        for (const pdfId of pdfIds) {
          const metadata = await storage.getMetadata(pdfId);
          results[pdfId] = !!metadata;
        }
        return results;
      } else {
        const metadata = await storage.getMetadata(pdfIds);
        return !!metadata;
      }
    },

    async listReadPdfs() {
      const allMetadata = await storage.getAllMetadata();
      return allMetadata.map(meta => ({
        id: meta.id,
        title: meta.title,
        numPages: meta.numPages,
        pagesProcessed: meta.pagesProcessed || meta.numPages, // Backward compatibility
        pageRange: meta.pageRange || null,
        totalChunks: meta.totalChunks,
        processedAt: meta.processedAt
      }));
    },

    async forgetPdf(pdfId) {
      await storage.deletePdf(pdfId);
      loadedPdfs.delete(pdfId);
      
      // Unregister retrieval tool
      this._unregisterPdfRetrievalTool(pdfId);
    },

    async recallPdf(pdfId) {
      // Check if PDF is already loaded in memory
      if (loadedPdfs.has(pdfId)) {
        return pdfId; // Already loaded
      }

      // Check if PDF exists in storage
      const metadata = await storage.getMetadata(pdfId);
      if (!metadata) {
        throw new Error(`PDF with ID "${pdfId}" not found. Use readPdf() to process it first.`);
      }

      // Load chunks from storage using optimized method
      const chunks = await storage.getReconstructedChunks(pdfId);
      if (!chunks || chunks.length === 0) {
        throw new Error(`PDF "${pdfId}" has no content chunks. The PDF may be corrupted in storage.`);
      }

      // Get additional content for metadata
      const fullTextContent = await storage.getContent(pdfId, 'fullText');
      const pageContentsContent = await storage.getContent(pdfId, 'pageContents');
      
      const enrichedMetadata = {
        ...metadata,
        fullText: fullTextContent ? fullTextContent.data : '',
        pageContents: pageContentsContent ? pageContentsContent.data : []
      };

      // Load into memory cache
      loadedPdfs.set(pdfId, { metadata: enrichedMetadata, chunks });

      // Register retrieval tools
      this._registerPdfRetrievalTool(pdfId, metadata.title);

      return pdfId;
    },

    async getPdfStorageInfo() {
      return await storage.getStorageInfo();
    },

    async exportPdf(pdfId, options = {}) {
      try {
        // Check if JSZip is available
        let JSZip;
        try {
          JSZip = __webpack_require__(710);
        } catch (e) {
          throw new Error('JSZip is required for PDF export functionality. Please install it with: npm install jszip');
        }

        // Check if PDF exists
        const metadata = await storage.getMetadata(pdfId);
        if (!metadata) {
          throw new Error(`PDF with ID "${pdfId}" not found. Use readPdf() to process it first.`);
        }

        // Get all PDF data
        const chunks = await storage.getReconstructedChunks(pdfId);
        const fullTextContent = await storage.getContent(pdfId, 'fullText');
        const pageContentsContent = await storage.getContent(pdfId, 'pageContents');

        if (!chunks || chunks.length === 0) {
          throw new Error(`PDF "${pdfId}" has no content chunks to export.`);
        }

        // Create ZIP file
        const zip = new JSZip();

        // Create manifest with export information
        const manifest = {
          exportedAt: new Date().toISOString(),
          pdfId: pdfId,
          version: '1.0',
          warpmindVersion: '0.1.0',
          description: `WarpMind PDF export for: ${metadata.title}`,
          files: ['metadata.json', 'embeddings.json', 'content.json']
        };

        // Add files to ZIP
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));
        zip.file('metadata.json', JSON.stringify(metadata, null, 2));
        zip.file('embeddings.json', JSON.stringify(chunks, null, 2));
        
        // Add content files
        const contentData = {
          fullText: fullTextContent ? fullTextContent.data : '',
          pageContents: pageContentsContent ? pageContentsContent.data : []
        };
        zip.file('content.json', JSON.stringify(contentData, null, 2));

        // Generate ZIP blob
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Return download information
        const fileName = `${pdfId.replace(/[^a-zA-Z0-9]/g, '_')}_warpmind_export.zip`;
        
        return {
          blob: zipBlob,
          fileName: fileName,
          size: zipBlob.size,
          pdfId: pdfId,
          title: metadata.title,
          chunks: chunks.length,
          exportedAt: manifest.exportedAt
        };

      } catch (error) {
        throw new Error(`PDF export failed: ${error.message}`);
      }
    },

    async importPdf(zipFile, options = {}) {
      try {
        // Check if JSZip is available
        let JSZip;
        try {
          JSZip = __webpack_require__(710);
        } catch (e) {
          throw new Error('JSZip is required for PDF import functionality. Please install it with: npm install jszip');
        }

        const { overwrite = false, onProgress = null } = options;

        // Load ZIP file
        const zip = await JSZip.loadAsync(zipFile);

        // Verify manifest
        const manifestFile = zip.file('manifest.json');
        if (!manifestFile) {
          throw new Error('Invalid WarpMind PDF export: missing manifest.json');
        }

        const manifest = JSON.parse(await manifestFile.async('string'));
        if (!manifest.pdfId || !manifest.version) {
          throw new Error('Invalid WarpMind PDF export: invalid manifest format');
        }

        // Check if PDF already exists
        const existingMetadata = await storage.getMetadata(manifest.pdfId);
        if (existingMetadata && !overwrite) {
          throw new Error(`PDF with ID "${manifest.pdfId}" already exists. Use overwrite option to replace it.`);
        }

        // Progress tracking
        const totalSteps = 4;
        let currentStep = 0;
        const updateProgress = (step, message) => {
          if (typeof onProgress === 'function') {
            onProgress((step / totalSteps) * 100, message);
          }
        };

        updateProgress(++currentStep, 'Loading metadata...');

        // Load metadata
        const metadataFile = zip.file('metadata.json');
        if (!metadataFile) {
          throw new Error('Invalid WarpMind PDF export: missing metadata.json');
        }
        const metadata = JSON.parse(await metadataFile.async('string'));

        updateProgress(++currentStep, 'Loading content...');

        // Load content
        const contentFile = zip.file('content.json');
        if (!contentFile) {
          throw new Error('Invalid WarpMind PDF export: missing content.json');
        }
        const contentData = JSON.parse(await contentFile.async('string'));

        updateProgress(++currentStep, 'Loading embeddings...');

        // Load embeddings/chunks
        const embeddingsFile = zip.file('embeddings.json');
        if (!embeddingsFile) {
          throw new Error('Invalid WarpMind PDF export: missing embeddings.json');
        }
        const chunks = JSON.parse(await embeddingsFile.async('string'));

        updateProgress(++currentStep, 'Storing data...');

        // Store the data (clean up existing data first if overwriting)
        if (existingMetadata && overwrite) {
          await storage.deletePdf(manifest.pdfId);
          loadedPdfs.delete(manifest.pdfId);
        }

        // Store metadata
        await storage.storeMetadata(manifest.pdfId, metadata);

        // Store content
        if (contentData.fullText) {
          await storage.storeContent(manifest.pdfId, 'fullText', contentData.fullText);
        }
        if (contentData.pageContents) {
          await storage.storeContent(manifest.pdfId, 'pageContents', contentData.pageContents);
        }

        // Store chunks
        for (const chunk of chunks) {
          await storage.storeChunk(manifest.pdfId, chunk.chunkIndex, chunk);
        }

        // Load into memory cache for immediate use
        const enrichedMetadata = {
          ...metadata,
          fullText: contentData.fullText || '',
          pageContents: contentData.pageContents || []
        };
        loadedPdfs.set(manifest.pdfId, { metadata: enrichedMetadata, chunks });

        // Register retrieval tools
        this._registerPdfRetrievalTool(manifest.pdfId, metadata.title);

        updateProgress(totalSteps, 'Import complete');

        return {
          pdfId: manifest.pdfId,
          title: metadata.title,
          chunks: chunks.length,
          pages: metadata.numPages,
          importedAt: new Date().toISOString(),
          originalExport: {
            exportedAt: manifest.exportedAt,
            version: manifest.version
          }
        };

      } catch (error) {
        throw new Error(`PDF import failed: ${error.message}`);
      }
    },

    async _generateEmbedding(text, model) {
      // Use the client's embed method
      try {
        // Add a timeout indicator for slow backend responses
        const startTime = Date.now();
        const timeoutWarning = setTimeout(() => {
          console.log('Embedding request taking longer than expected. Backend may be slow to respond.');
        }, 5000); // 5 second warning
        
        const result = await client.embed(text, { model });
        
        // Clear the timeout warning
        clearTimeout(timeoutWarning);
        
        // Log duration for performance monitoring
        const duration = Date.now() - startTime;
        if (duration > 5000) {
          console.log(`Embedding request completed after ${(duration/1000).toFixed(1)}s - backend response was slow.`);
        }
        
        return result;
      } catch (error) {
        console.warn('API embedding failed, falling back to local embedding:', error.message);
        return this._generateLocalEmbedding(text);
      }
    },

    _generateLocalEmbedding(text) {
      // Simple local embedding: convert text to a feature vector
      // This is a basic implementation for demo purposes
      const words = text.toLowerCase().split(/\s+/);
      const embedding = new Array(384).fill(0); // Standard embedding size
      
      // Use word frequencies and positions to create features
      const wordCounts = {};
      words.forEach((word, index) => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
        
        // Add positional information
        const hash = this._simpleHash(word);
        embedding[hash % 384] += 1 / (index + 1); // Weight by position
      });
      
      // Add word frequency features
      Object.entries(wordCounts).forEach(([word, count]) => {
        const hash = this._simpleHash(word);
        embedding[(hash + 100) % 384] += Math.log(count + 1);
      });
      
      // Add text length features
      embedding[0] = Math.log(text.length + 1) / 10;
      embedding[1] = words.length / 100;
      
      // Normalize the embedding
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      if (magnitude > 0) {
        for (let i = 0; i < embedding.length; i++) {
          embedding[i] /= magnitude;
        }
      }
      
      return embedding;
    },

    _simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    },

    _findChunkPosition(fullText, chunkText, startPosition = 0) {
      // First try exact match from the current position
      let position = fullText.indexOf(chunkText, startPosition);
      if (position !== -1) {
        return position;
      }
      
      // If exact match fails, try fuzzy matching by normalizing whitespace
      const normalizeText = (text) => text.replace(/\s+/g, ' ').trim();
      const normalizedChunk = normalizeText(chunkText);
      const normalizedFull = normalizeText(fullText);
      
      position = normalizedFull.indexOf(normalizedChunk, Math.max(0, startPosition - 100));
      if (position !== -1) {
        // Map back to original text position by counting characters
        let originalPos = 0;
        let normalizedPos = 0;
        
        while (normalizedPos < position && originalPos < fullText.length) {
          if (!/\s/.test(fullText[originalPos]) || normalizedFull[normalizedPos] === ' ') {
            normalizedPos++;
          }
          originalPos++;
        }
        return originalPos;
      }
      
      // Try searching from the beginning
      position = fullText.indexOf(chunkText, 0);
      if (position !== -1) {
        return position;
      }
      
      // Try fuzzy match from beginning
      position = normalizedFull.indexOf(normalizedChunk, 0);
      if (position !== -1) {
        let originalPos = 0;
        let normalizedPos = 0;
        
        while (normalizedPos < position && originalPos < fullText.length) {
          if (!/\s/.test(fullText[originalPos]) || normalizedFull[normalizedPos] === ' ') {
            normalizedPos++;
          }
          originalPos++;
        }
        return originalPos;
      }
      
      // Last resort: use approximate position based on chunk order
      return Math.max(startPosition, 0);
    },

    _findPageReferences(text, pageContents) {
      const references = [];
      
      for (const page of pageContents) {
        if (page.text.includes(text.substring(0, 100))) {
          references.push(page.pageNum);
        }
      }
      
      return references;
    },

    _registerPdfRetrievalTool(pdfId, title) {
      // Register tools for PDF access
      const searchToolName = `search_pdf_${pdfId.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const fullTextToolName = `get_full_text_${pdfId.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      try {
        // Register semantic search tool (for large PDFs or specific queries)
        client.registerTool({
          name: searchToolName,
          description: `Searches the PDF "${title}" to find relevant passages about specific topics, concepts, or quotes. Returns the most relevant text chunks that match the search query.`,
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search terms or concept to find in the PDF'
              },
              topResults: {
                type: 'number',
                description: 'Number of relevant passages to return (1-8)',
                default: 4,
                maximum: 8
              }
            },
            required: ['query']
          },
          handler: async (args) => {
            const numResults = Math.min(args.topResults || 4, 8);
            return await this._searchPdf(pdfId, args.query, numResults);
          }
        });

        // Register full text tool (for smaller PDFs or comprehensive analysis)
        client.registerTool({
          name: fullTextToolName,
          description: `Retrieves the complete text content of the PDF "${title}". Useful for comprehensive analysis, summaries, or when examining the entire document structure.`,
          parameters: {
            type: 'object',
            properties: {
              includePageNumbers: {
                type: 'boolean', 
                description: 'Include page numbers in the text',
                default: true
              }
            },
            required: []
          },
          handler: async (args) => {
            return await this._getFullPdfText(pdfId, args.includePageNumbers !== false);
          }
        });
      } catch (error) {
        console.warn(`Failed to register retrieval tools for PDF ${pdfId}:`, error);
      }
    },

    _unregisterPdfRetrievalTool(pdfId) {
      // Note: This would require implementing tool unregistration in the main class
      // For now, we'll just log the intent
      console.log(`Would unregister retrieval tool for PDF ${pdfId}`);
    },

    async _searchPdf(pdfId, query, topResults = 2) {
      try {
        // Get PDF chunks
        let chunks;
        if (loadedPdfs.has(pdfId)) {
          chunks = loadedPdfs.get(pdfId).chunks;
        } else {
          chunks = await storage.getReconstructedChunks(pdfId);
        }

        if (!chunks || chunks.length === 0) {
          return { error: 'PDF not found or has no content' };
        }

        // Generate embedding for query
        const queryEmbedding = await this._generateEmbedding(query, 'text-embedding-3-small');

        // Calculate similarities
        const similarities = chunks.map(chunk => ({
          ...chunk,
          similarity: chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0
        }));

        // Sort by similarity and get top results
        const topChunks = similarities
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topResults);

        // Format results with truncation to avoid context length issues
        const results = [];
        for (const chunk of topChunks) {
          // Truncate text if it's too long (keep first 300 tokens worth of text)
          let text = chunk.text;
          if (text.length > 1200) { // Roughly 300 tokens
            text = text.substring(0, 1200) + '...';
          }
          
          results.push({
            text,
            similarity: chunk.similarity,
            pageReferences: chunk.pageReferences,
            chunkIndex: chunk.chunkIndex
          });
        }

        return {
          results,
          totalChunks: chunks.length,
          query
        };

      } catch (error) {
        return { error: `Search failed: ${error.message}` };
      }
    },

    async _getFullPdfText(pdfId, includePageNumbers = true) {
      try {
        // Get PDF metadata and content
        let metadata, fullText, pageContents;
        
        if (loadedPdfs.has(pdfId)) {
          const cached = loadedPdfs.get(pdfId);
          metadata = cached.metadata;
          fullText = metadata.fullText;
          pageContents = metadata.pageContents;
        } else {
          metadata = await storage.getMetadata(pdfId);
          if (!metadata) {
            return { error: 'PDF not found' };
          }
          
          const fullTextContent = await storage.getContent(pdfId, 'fullText');
          const pageContentsContent = await storage.getContent(pdfId, 'pageContents');
          
          fullText = fullTextContent ? fullTextContent.data : '';
          pageContents = pageContentsContent ? pageContentsContent.data : [];
        }

        if (!fullText) {
          return { error: 'PDF has no content' };
        }

        let result = fullText;

        // If we need page numbers, format the text appropriately
        if (includePageNumbers && pageContents && pageContents.length > 0) {
          let formattedText = '';
          
          for (let i = 0; i < pageContents.length; i++) {
            const page = pageContents[i];
            
            // Add page number markers if requested
            if (includePageNumbers) {
              formattedText += `\n\n--- Page ${page.pageNum} ---\n`;
            }
            
            // Add page text
            formattedText += page.text;
                        
            formattedText += '\n\n';
          }
          
          result = formattedText.trim();
        }

        return {
          fullText: result,
          metadata: {
            title: metadata.title,
            pages: metadata.numPages,
            chunks: metadata.totalChunks,
            estimatedTokens: metadata.estimatedTokens || Math.ceil(result.length / 4),
            processedAt: metadata.processedAt,
            optimizedStorage: true
          }
        };

      } catch (error) {
        return { error: `Failed to get full text: ${error.message}` };
      }
    },

    async _processTextChunk(chunkId, textChunk, pages, options) {
      const { pageNums, content } = textChunk;
      
      try {
        // Generate embedding for the chunk
        this._safeProgressCallback(options.currentProgress, `Generating embedding for chunk ${options.chunkCounter}/${options.totalChunks}`);
        
        // Start progress pulse before potentially slow embedding operation
        startProgressPulse(options.currentProgress, `Generating embedding for chunk ${options.chunkCounter}/${options.totalChunks}`);
        
        const embedding = await this._generateEmbedding(content, options.embeddingModel);
        
        // Stop progress pulse as we've completed this embedding
        stopProgressPulse();
        
        // Store the content first to get its ID
        const contentId = await this._storeContent(content, 'text');
        
        // Store the chunk with a reference to the content
        const chunkData = {
          id: chunkId,
          contentId,
          type: 'text',
          pages: pageNums,
          metadata: {
            pageNums,
            source: options.source || 'pdf',
            title: options.title || 'Untitled PDF',
          },
          embedding
        };

        // Store the chunk data
        await this._storeChunk(chunkData);
        
        // Update the progress with a small increment
        options.currentProgress += options.progressIncrement;
        this._safeProgressCallback(options.currentProgress, `Processed chunk ${options.chunkCounter}/${options.totalChunks}`);
        options.chunkCounter++;
        
      } catch (error) {
        console.error('Error processing text chunk:', error);
        throw error;
      }
    },
  };
}

module.exports = createPdfLoaderModule;


/***/ }),

/***/ 969:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * Base HTTP client with retry logic and error handling
 * Provides the foundation for all API interactions
 */

// Import utility functions for retry logic and timeouts
const { 
  createTimeoutController, 
  shouldRetry, 
  calculateRetryDelay, 
  sleep 
} = __webpack_require__(94);

/**
 * Custom error class for timeout errors
 */
class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Base client class that handles HTTP requests, retries, and configuration
 */
class BaseClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://api.openai.com';
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'gpt-4o';
    this.temperature = config.temperature || 0.7;
    this.defaultTimeoutMs = config.defaultTimeoutMs || 60000;
  }

  /**
   * Set the API key for authentication with the proxy server
   * @param {string} apiKey - The custom proxy authentication key (not an OpenAI key)
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Set the base URL for the proxy server
   * @param {string} baseURL - The base URL for the school proxy server or OpenAI-compatible API
   */
  setBaseURL(baseURL) {
    this.baseURL = baseURL;
  }

  /**
   * Set the model to use for completions
   * @param {string} model - The model name (e.g., 'gpt-3.5-turbo', 'gpt-4')
   */
  setModel(model) {
    this.model = model;
  }

  /**
   * Configure generation parameters
   * @param {Object} params - Parameters object
   * @param {number} params.temperature - Temperature for randomness (0-2)
   * @param {string} params.model - Model name
   * @param {string} params.apiKey - API key
   * @param {string} params.baseURL - Base URL
   */
  configure(params = {}) {
    if (params.temperature !== undefined) this.temperature = params.temperature;
    if (params.model !== undefined) this.model = params.model;
    if (params.apiKey !== undefined) this.apiKey = params.apiKey;
    if (params.baseURL !== undefined) this.baseURL = params.baseURL;
  }

  /**
   * Construct a proper API URL by combining baseURL and endpoint
   * Handles both cases: baseURL with and without /v1 suffix
   * @param {string} endpoint - API endpoint (e.g., '/chat/completions')
   * @returns {string} - Complete API URL
   */
  _buildApiUrl(endpoint) {
    let baseUrl = this.baseURL;
    
    // Remove trailing slash from baseURL if present
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // If baseURL doesn't end with /v1, add it
    if (!baseUrl.endsWith('/v1')) {
      baseUrl += '/v1';
    }
    
    // Ensure endpoint starts with /
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }
    
    return baseUrl + endpoint;
  }

  /**
   * Make a request to the OpenAI-compatible API with proper headers, retry logic, and timeout
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @param {number} options.timeoutMs - Request timeout in milliseconds
   * @param {number} options.maxRetries - Maximum number of retry attempts (default: 5)
   * @returns {Promise} - API response
   */
  async makeRequest(endpoint, data, options = {}) {
    if (!this.apiKey) {
      throw new Error('API key is required. Use setApiKey() to set your proxy authentication key.');
    }

    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 5;
    const url = this._buildApiUrl(endpoint);
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const { controller, timeoutId } = createTimeoutController(timeoutMs);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey // Custom header for proxy authentication
          },
          body: JSON.stringify(data),
          signal: controller ? controller.signal : undefined
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Check if we should retry this status code
          if (shouldRetry(response.status) && attempt < maxRetries) {
            const retryAfter = response.headers.get ? response.headers.get('Retry-After') : null;
            const delay = calculateRetryDelay(attempt, retryAfter);
            
            console.warn(`Request failed with status ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
            await sleep(delay);
            continue;
          }

          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle timeout errors
        if (error.name === 'AbortError') {
          throw new TimeoutError(`Request timed out after ${timeoutMs}ms`);
        }
        
        // Handle network errors - retry if not last attempt
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          if (attempt < maxRetries) {
            const delay = calculateRetryDelay(attempt);
            console.warn(`Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
            await sleep(delay);
            continue;
          }
          throw new Error('Network error: Unable to connect to the API. Please check your internet connection.');
        }
        
        // For other errors, don't retry
        throw error;
      }
    }
  }
}

// Export both the BaseClient class and TimeoutError
module.exports = { BaseClient, TimeoutError };


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(48);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});