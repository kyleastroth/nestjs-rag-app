import { Injectable } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { RagService } from './rag.service';

// Note: Services contain business logic (controllers handle HTTP and services handle the actual work)
@Injectable()   // Makes this available for dependency injection
export class AppService {
    // Inject RAG service
    constructor(private readonly ragService: RagService) {}

    // Business logic - controller calls this, kieeps routes clean
    async processQuery(question: string) {
        console.log('Received question:', question);

        try {
            const result = await this.ragService.query(question);

            return {
                question: result.question,
                answer: result.answer,
                sources: result.sources.length,
            };
        } catch (error) {
            console.error('ERROR:', error);
            return {
                question,
                answer: 'Sorry, there was an error processing your question.',
                error: error.message,
            };
        }
    }
}