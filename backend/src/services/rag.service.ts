import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import { sampleContracts } from '../data/sample-contracts';

@Injectable()   // Setup when app started
export class RagService implements OnModuleInit {
    private pinecone: Pinecone;
    private vectorStore: PineconeStore;
    private embeddings: GoogleGenerativeAIEmbeddings;
    private llm: ChatGoogleGenerativeAI;

    async onModuleInit() {  // Runs when app starts to set up pipeline
        // Initialize Pinecone client
        this.pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        // Initialize embeddings model
        this.embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GEMINI_API_KEY,
            modelName: 'text-embedding-004',
        });

        // Initialize LLM
        this.llm = new ChatGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY,
            model: 'gemini-2.5-flash',
            temperature: 0.7,
        });

        // Get Pinecone index
        const index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
        console.log(process.env.PINECONE_INDEX_NAME)

        // Test connection to index
        console.log('Testing index connection...');
        const stats = await index.describeIndexStats();
        console.log('Index stats:', stats)

        // Initialize vector store
        // This is a LangChain wrapper
        this.vectorStore = await PineconeStore.fromExistingIndex(this.embeddings, {
            pineconeIndex: index,
            textKey: 'text' //tells LangChain where to find doc text
        });

        console.log('RAG Service initialized');

        // Test embedding generation
        console.log('Testing embedding generation...');
        try {
            const testEmbedding = await this.embeddings.embedQuery('test');
            console.log('Embedding dimensions:', testEmbedding.length);
            console.log('Sample embedding values:', testEmbedding.slice(0, 5));
        } catch (error) {
            console.error('Embedding test failed:', error.message);
        }

        // Load sample data on startup
        // Will this reload every time??
        await this.loadSampleData();
    }

    // Load sample contract data into Pinecone (convert to embeddings --> store)
    private async loadSampleData() {
        try {
            console.log('Loading fake government contract data...');
            const index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
            
            // Get curr state of pinecone
            const stats = await index.describeIndexStats();
            console.log('Current vectors in index:', stats.totalRecordCount);
            const expectedCount = sampleContracts.length;
            console.log('Expected contract count:', expectedCount);

            // only add docs if necessary
            if (stats.totalRecordCount >= expectedCount) {
                console.log('Data already loaded')
                // TODO add error handling
                return;
            }
            
            console.log('Preparing to load contracts');

            // Convert contracts to LangChain documents (makes them searchable)
            const documents = sampleContracts.map(
                (contract) =>
                    new Document({
                        pageContent: `
                            Title: ${contract.title}
                            Agency: ${contract.agency}
                            NAICS Code: ${contract.naicsCode}
                            Contract Value: ${contract.value}
                            Award Date: ${contract.awardDate}
                            Description: ${contract.description}
                            Requirements: ${contract.requirements}
                            Set-Aside: ${contract.setAside}
                        `,
                        metadata: {
                            id: contract.id,
                            agency: contract.agency,
                            naicsCode: contract.naicsCode,
                            value: contract.value,
                            setAside: contract.setAside,
                        },
                    }),
            );

            console.log('Docs created:', documents.length);
            console.log('Doc preview:', documents[0]?.pageContent.substring(0, 100));

            // Check have docs before trying to add them
            if (documents.length === 0) {
                console.warn('No documents to load!!!');
                return;
            }

            // MANUAL APPROACH (upsert w full context)
            console.log('Generating embeddings and upserting to Pinecone...');
            
            for (let i = 0; i < documents.length; i++) {
                const doc = documents[i];
                console.log(`Processing document ${i + 1}/${documents.length}: ${doc.metadata.id}`);
                
                // Generate embedding for this document
                const embedding = await this.embeddings.embedQuery(doc.pageContent);
                
                // Upsert to Pinecone
                await index.upsert({
                    records: [
                        {
                            id: doc.metadata.id,
                            values: embedding,
                            metadata: {
                                text: doc.pageContent,
                                id: doc.metadata.id,
                                agency: doc.metadata.agency,
                                naicsCode: doc.metadata.naicsCode,
                                value: doc.metadata.value,
                                setAside: doc.metadata.setAside,
                            },
                        },
                    ],
                });
                console.log(`Uploaded: ${doc.metadata.id}`);
            }

            console.log(`Loaded ${documents.length} contracts into Pinecone`);
        } catch (error) {
            console.error('Error loading sample data:', error);
            console.error('Error details:', error.message) //debugging
        }
    }

    // private async loadSampleData() {
    //     try {
    //         console.log('Loading fake government contract data...');

    //         //Check if already exists
    //         const index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
    //         const stats = await index.describeIndexStats();

    //         if (stats.totalRecordCount > 0) {
    //             console.log('Data already loaded')
    //             return;
    //         }

    //         console.log('Num of contracts:', sampleContracts.length);

    //         // Convert contracts to LangChain documents (makes them searchable)
    //         const documents = sampleContracts.map(
    //             (contract) =>
    //                 new Document({
    //                     pageContent: `
    //                         Title: ${contract.title}
    //                         Agency: ${contract.agency}
    //                         NAICS Code: ${contract.naicsCode}
    //                         Contract Value: ${contract.value}
    //                         Award Date: ${contract.awardDate}
    //                         Description: ${contract.description}
    //                         Requirements: ${contract.requirements}
    //                         Set-Aside: ${contract.setAside}
    //                     `,
    //                     metadata: {
    //                         id: contract.id,
    //                         agency: contract.agency,
    //                         naicsCode: contract.naicsCode,
    //                         value: contract.value,
    //                         setAside: contract.setAside,
    //                     },
    //                 }),
    //         );

    //         console.log('Docs created:', documents.length);
    //         console.log('Doc preview:', documents[0]?.pageContent.substring(0, 100));

    //         // Check have docs before trying to add them
    //         if (documents.length === 0) {
    //             console.warn('No documents to load!!!');
    //             return;
    //         }

    //         // MANUAL APPROACH
    //         // Bypass langchain wrapper, add directly to pinecone
    //         const index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
    //         console.log('Generating embeddings and upserting to Pinecone...');
            
    //         for (let i = 0; i < documents.length; i++) {
    //             const doc = documents[i];
    //             console.log(`Processing document ${i + 1}/${documents.length}: ${doc.metadata.id}`);
                
    //             // Generate embedding for this document
    //             const embedding = await this.embeddings.embedQuery(doc.pageContent);
                
    //             // Upsert to Pinecone
    //             await index.upsert({
    //                 records: [
    //                     {
    //                         id: doc.metadata.id,
    //                         values: embedding,
    //                         metadata: {
    //                             id: doc.metadata.id,
    //                             agency: doc.metadata.agency,
    //                             naicsCode: doc.metadata.naicsCode,
    //                             value: doc.metadata.value,
    //                             setAside: doc.metadata.setAside,
    //                         },
    //                     },
    //                 ],
    //             });
                
    //             console.log(`Uploaded: ${doc.metadata.id}`);
    //         }

    //         console.log(`Loaded ${documents.length} contracts into Pinecone`);
    //     } catch (error) {
    //         console.error('Error loading sample data:', error);
    //         console.error('Error details:', error.message) //debugging
    //     }
    // }

    // Query the RAG system
    async query(question: string) {
        try {
            console.log('Processing RAG query:', question);
            
            // Retrieve relevant douments
            const retriever = this.vectorStore.asRetriever(3);
            console.log('Retriever created, searching for relevant docs...');

            const relevantDocs = await retriever._getRelevantDocuments(question);
            console.log('Number of relevant docs found:', relevantDocs.length);
            console.log('Relevant docs:', relevantDocs.map(doc => ({
                content: doc.pageContent.substring(0, 100),
                metadata: doc.metadata
            })));

            // Format context from retrieved docs
            const context = relevantDocs.map((doc) => doc.pageContent).join('\n\n---\n\n');

            console.log('Context length:', context.length);
            console.log('Context preview:', context.substring(0, 200));
            
            // Template for prompt
            // TODO: optimize this/prompt engineering
            const prompt = ChatPromptTemplate.fromTemplate(`
                You are an expert in government contracting. Use the following contract information to answer the question.
                
                Context:
                ${context}

                Question: ${question}
                
                Answer:
            `);

            // Chain together: prompt --> LLM --> output parser
            // TODO: add more comments here
            const chain = RunnableSequence.from([
                {
                    context: () => context,
                    question: (input) => input.question,
                },
                prompt,
                this.llm,
                new StringOutputParser(),
            ])
            
            // Call the chain (run everything)
            const answer = await chain.invoke({question});

            console.log('RAG query completed');

            return {
                question,
                answer,
                sources: relevantDocs,
            };
        } catch (error) {
            console.error('RAG query error:', error);
            throw error;
        }
    }

    // Search for similar contracts
    // Pure vector search, no LLM generation
    async searchContracts(query: string, limit: number = 5) {
        try {
            const results = await this.vectorStore.similaritySearch(query, limit);

            return results.map((doc) => ({
                content: doc.pageContent,
                metadata: doc.metadata,
            }));
        } catch (error) {
            console.error('Contract search error:', error);
            throw error;
        }
    }
}