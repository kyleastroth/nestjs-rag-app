import { Injectable } from '@nestjs/common';

// Note: Services contain business logic (controllers handle HTTP and services handle the actual work)
@Injectable()   // Makes this available for dependency injection
export class AppService {
    // Business logic - controller calls this, kieeps routes clean
    async processQuery(question: string) {
    // TODO: Implement RAG logic with LangChain
        return {
            question,
            answer: 'This will be your RAG response',
        };
    }
}