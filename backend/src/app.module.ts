import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './services/app.service';
import { RagService } from './services/rag.service';

// Root module 
// Note: modules are containers that group related code
@Module({
    imports: [],                    // Other modules (e.g. db, auth, etc.)
    controllers: [AppController],   // Handles HTTP requests
    providers: [AppService, RagService],        // Services for injectable business logic
})
export class AppModule {}