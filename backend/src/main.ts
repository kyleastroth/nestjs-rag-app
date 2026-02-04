import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    // Create NestJS app from root module
    const app = await NestFactory.create(AppModule);

    app.enableCors(); // Enable CORS for Streamlit frontend (frontend port 8501, backend port 3000)
    
    // Start server on port 3000
    await app.listen(3000);
    console.log('Backend running on http://localhost:3000');
}

bootstrap();    // Start the app!