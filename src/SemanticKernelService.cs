using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace SemanticKernelDemo
{
    /// <summary>
    /// A service class demonstrating how to use Semantic Kernel in C#
    /// </summary>
    public class SemanticKernelService
    {
        private readonly Kernel _kernel;
        private readonly string _apiKey;
        private readonly string _endpoint;

        /// <summary>
        /// Initializes a new instance of the SemanticKernelService class
        /// </summary>
        /// <param name="apiKey">The API key for the LLM provider</param>
        /// <param name="endpoint">The endpoint URL for the LLM provider (optional)</param>
        public SemanticKernelService(string apiKey, string endpoint = null)
        {
            _apiKey = apiKey;
            _endpoint = endpoint;
            
            // Create the kernel
            var builder = Kernel.CreateBuilder();
            
            // Configure the LLM connector (OpenAI in this example)
            if (!string.IsNullOrEmpty(_endpoint))
            {
                // Using Azure OpenAI
                builder.AddAzureOpenAIChatCompletion(
                    modelId: "gpt-4", // or your model ID
                    endpoint: _endpoint,
                    apiKey: _apiKey);
            }
            else
            {
                // Using OpenAI
                builder.AddOpenAIChatCompletion(
                    modelId: "gpt-4", // or your model ID
                    apiKey: _apiKey);
            }

            _kernel = builder.Build();
        }

        /// <summary>
        /// Executes a simple prompt using Semantic Kernel
        /// </summary>
        /// <param name="prompt">The natural language prompt to execute</param>
        /// <returns>The response from the LLM</returns>
        public async Task<string> ExecutePromptAsync(string prompt)
        {
            if (string.IsNullOrWhiteSpace(prompt))
                throw new ArgumentException("Prompt cannot be null or empty", nameof(prompt));

            var function = _kernel.CreateFunctionFromPrompt(prompt);
            var result = await _kernel.InvokeAsync(function);
            return result.ToString();
        }

        /// <summary>
        /// Creates a semantic function with specific configuration
        /// </summary>
        /// <param name="prompt">The prompt template</param>
        /// <param name="maxTokens">Maximum tokens for response</param>
        /// <param name="temperature">Sampling temperature</param>
        /// <returns>A configured semantic function</returns>
        public async Task<string> ExecuteConfiguredPromptAsync(
            string prompt, 
            int maxTokens = 1000, 
            double temperature = 0.7)
        {
            if (string.IsNullOrWhiteSpace(prompt))
                throw new ArgumentException("Prompt cannot be null or empty", nameof(prompt));

            var config = new PromptTemplateConfig
            {
                Completion = new()
                {
                    MaxTokens = maxTokens,
                    Temperature = temperature,
                    TopP = 1
                }
            };

            var function = _kernel.CreateFunctionFromPrompt(prompt, config);
            var result = await _kernel.InvokeAsync(function);
            return result.ToString();
        }

        /// <summary>
        /// Demonstrates using a skill with multiple functions
        /// </summary>
        /// <param name="skillName">Name of the skill</param>
        /// <param name="functionName">Name of the function within the skill</param>
        /// <param name="arguments">Arguments for the function</param>
        /// <returns>The result of the function execution</returns>
        public async Task<string> ExecuteSkillFunctionAsync(
            string skillName, 
            string functionName, 
            Dictionary<string, string> arguments = null)
        {
            if (string.IsNullOrWhiteSpace(skillName))
                throw new ArgumentException("Skill name cannot be null or empty", nameof(skillName));
            
            if (string.IsNullOrWhiteSpace(functionName))
                throw new ArgumentException("Function name cannot be null or empty", nameof(functionName));

            var function = _kernel.Plugins.GetFunction(skillName, functionName);
            var result = await _kernel.InvokeAsync(function, arguments ?? new Dictionary<string, string>());
            return result.ToString();
        }

        /// <summary>
        /// Adds a custom plugin to the kernel
        /// </summary>
        /// <param name="pluginName">Name of the plugin</param>
        /// <param name="plugin">The plugin instance</param>
        public void RegisterPlugin(string pluginName, ISemanticKernelPlugin plugin)
        {
            _kernel.Plugins.Add(plugin);
        }

        /// <summary>
        /// Gets the list of registered plugins
        /// </summary>
        /// <returns>List of plugin names</returns>
        public IEnumerable<string> GetRegisteredPlugins()
        {
            foreach (var plugin in _kernel.Plugins)
            {
                yield return plugin.Name;
            }
        }
    }
}