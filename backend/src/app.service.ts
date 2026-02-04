import { Injectable } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// Note: Services contain business logic (controllers handle HTTP and services handle the actual work)
@Injectable()   // Makes this available for dependency injection
export class AppService {
    private model: ChatGoogleGenerativeAI;

    constructor() {
        // Initialize Gemini model w API key
        this.model = new ChatGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY,
            model: 'gemini-2.5-flash',
            temperature: 0.7
        });
    }

    // Business logic - controller calls this, kieeps routes clean
    // TODO: Implement RAG logic with LangChain
    async processQuery(question: string) {
        try {
            const response = await this.model.invoke(question);

            return {
                question,
                answer: response.content,
            };
        } catch (error) {
            console.error('Gemini API error:', error);
            return {
                question,
                answer: 'Sorry, there was an error processing your question.',
                error: error.message,
            };
        }
    }
}