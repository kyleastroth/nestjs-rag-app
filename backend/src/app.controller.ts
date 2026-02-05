import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './services/app.service';


// Note: Controllers handle incoming HTTP requests and return reponses
@Controller('api')  // Routes will start with '/api'
export class AppController {
    // Inject AppService to use its methods
    constructor(private readonly appService: AppService) {}

    // GET /api/health - simple health check endpoint
    @Get('health')
    getHealth() {
        return { status: 'ok' };
    }

    // POST /api/query - core route, receives question & returns AI response
    @Post('query')
    async query(@Body() body: { question: string }) {
        return await this.appService.processQuery(body.question);
    }
}