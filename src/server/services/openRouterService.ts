import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const SITE_NAME = process.env.SITE_NAME || 'Lecture Notes AI';

// Default to the free Gemini model, but allow override
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 5000; // 5 seconds

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const processWithOpenRouter = async (buffer: Buffer, mimeType: string, fileName: string, model?: string): Promise<string> => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is not configured. Please add OPENROUTER_API_KEY to your .env file.');
  }

  const selectedModel = model || DEFAULT_MODEL;

  console.log(`Starting OpenRouter processing for file: ${fileName} (${mimeType}) using model: ${selectedModel}`);

  const base64File = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64File}`;

  const prompt = `You are an expert note-taker for academic lectures. 
  I'm providing lecture slides that I need you to convert into comprehensive, 
  well-structured notes. Please:
  
  1. Extract the key concepts, definitions, and formulas.
  2. Organize the content logically with clear headings (Markdown #, ##, ###).
  3. Use bullet points for lists and steps.
  4. Format any mathematical formulas using LaTeX syntax (e.g., $E=mc^2$).
  5. Highlight important terms in **bold**.
  6. If there are code snippets, format them as code blocks.
  7. Ignore copyright footers, slide numbers, or irrelevant metadata.
  8. Provide a brief summary at the beginning.
  
  The output should be clean Markdown text ready for rendering.`;

  // Helper to sanitize OpenRouter responses. Models sometimes return HTML or styled
  // content; we want plain Markdown. This function will handle common HTML -> Markdown
  // conversions and strip style attributes that cause dark backgrounds.
  const sanitizeOutput = (raw: any): string => {
    if (!raw) return '';
    let text = typeof raw === 'string' ? raw : JSON.stringify(raw);

    // If the model returned a structured content array (OpenRouter sometimes does),
    // try to extract text fields
    try {
      const parsed = typeof raw === 'string' ? undefined : raw;
      if (Array.isArray(parsed)) {
        const combined = parsed.map((p: any) => (typeof p === 'string' ? p : (p.text || ''))).join('\n\n');
        if (combined.trim()) text = combined;
      }
    } catch (e) {
      // ignore
    }

    // Remove style attributes (e.g., style="background:#000") which cause dark backgrounds
    text = text.replace(/style=\"[^\"]*\"/gi, '');
    text = text.replace(/style='[^']*'/gi, '');

    // Convert common HTML headings to Markdown
    text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
    text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
    text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');

    // Lists
    text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (m, inner) => {
      return inner.replace(/<li[^>]*>(.*?)<\/li>/gi, (li, content) => `- ${content}\n`);
    });
    text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (m, inner) => {
      let i = 1;
      return inner.replace(/<li[^>]*>(.*?)<\/li>/gi, (li, content) => `${i++}. ${content}\n`);
    });

    // Bold / italics
    text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

    // Code blocks: <pre><code>...</code></pre> -> ```
    text = text.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (m, code) => {
      // Unescape HTML entities inside code block
      const unescaped = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      return `\n\n\`\`\`\n${unescaped}\n\`\`\`\n`;
    });

    // Inline code
    text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, (m, c) => `\`${c.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')}\``);

    // Strip remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Trim leading/trailing whitespace
    return text.trim();
  };

  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`OpenRouter API attempt ${attempt}/${MAX_RETRIES}...`);

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUrl
                  }
                }
              ]
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': SITE_URL,
            'X-Title': SITE_NAME,
            'Content-Type': 'application/json'
          }
        }
      );

      // Log the full response for debugging
      console.log('OpenRouter Response Status:', response.status);

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const rawContent = response.data.choices[0].message.content;
        const cleaned = sanitizeOutput(rawContent);
        // If cleaned is empty, fall back to raw content
        return cleaned || (typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent));
      } else {
        console.error('Invalid OpenRouter response:', JSON.stringify(response.data, null, 2));
        throw new Error('Invalid response from OpenRouter API');
      }

    } catch (error: any) {
      lastError = error;
      const errorData = error.response?.data?.error;
      const errorCode = errorData?.code || error.response?.status;
      const errorMessage = errorData?.message || error.message;
      const rawError = errorData?.metadata?.raw || '';
      
      console.error(`OpenRouter attempt ${attempt} failed:`, errorMessage);

      // Check if it's a rate limit error (429 or contains rate-limited in message/raw)
      const isRateLimited = errorCode === 429 || 
                           errorMessage?.includes('rate-limited') || 
                           rawError?.includes('rate-limited');
      
      if (isRateLimited) {
        if (attempt < MAX_RETRIES) {
          const retryDelay = INITIAL_RETRY_DELAY * attempt; // Exponential backoff
          console.log(`Rate limited. Waiting ${retryDelay / 1000} seconds before retry...`);
          await delay(retryDelay);
          continue;
        } else {
          // All retries exhausted for rate limit
          throw new Error(
            'The free model is currently rate-limited due to high demand. ' +
            'Please try again in a few minutes, or switch to the Native Gemini option which has separate rate limits.'
          );
        }
      }

      // For non-rate-limit errors, don't retry
      throw new Error(`OpenRouter API Error: ${errorMessage}`);
    }
  }

  // Should not reach here, but just in case
  throw new Error(`OpenRouter API Error: ${lastError?.message || 'Unknown error after retries'}`);
};
